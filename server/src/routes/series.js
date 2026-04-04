const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Series = require('../models/Series');
const Season = require('../models/Season');
const Episode = require('../models/Episode');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { listEpisodesForSeries } = require('../helpers/content');
const { validatePublishedSeriesDoc } = require('../helpers/seriesPublishValidation');
const { findSimilarSeries } = require('../algorithms');

const router = express.Router();

/** Escape special regex characters to prevent ReDoS (issue 2.1) */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whitelist of fields allowed in series PATCH to prevent mass assignment (issue 1.5) */
const SERIES_ALLOWED_FIELDS = [
  'title', 'description', 'genres', 'tags', 'releaseYear', 'posterPath',
  'videoFile', 'thumbnailPath', 'subtitleFile', 'type', 'status', 'catalogStatus',
];

router.get(
  '/',
  optionalAuth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 1000 }),
    query('genre').optional().isString(),
    query('year').optional().isInt(),
    query('sort').optional().isIn(['newest', 'popular', 'rating']),
    query('includeDrafts').optional().isIn(['0', '1']),
    query('catalogStatus').optional().isIn(['draft', 'published']),
    query('type').optional().isIn(['series', 'movie']),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const filter = {};
    // Fixed: escape user input before using in RegExp (issue 2.1)
    if (req.query.genre) filter.genres = { $regex: new RegExp(`^${escapeRegex(req.query.genre)}$`, 'i') };
    if (req.query.year) filter.releaseYear = Number(req.query.year);
    if (req.query.type) filter.type = req.query.type;
    let sort = { createdAt: -1 };
    if (req.query.sort === 'popular') sort = { totalViews: -1 };
    if (req.query.sort === 'rating') sort = { ratingAvg: -1 };

    let catalogFilter = { catalogStatus: { $ne: 'draft' } };
    if (req.user?.role === 'admin' && req.query.includeDrafts === '1') {
      if (req.query.catalogStatus === 'draft') catalogFilter = { catalogStatus: 'draft' };
      else if (req.query.catalogStatus === 'published') catalogFilter = { catalogStatus: 'published' };
      else catalogFilter = {};
    }
    const merged = { ...filter, ...catalogFilter };

    const [items, total] = await Promise.all([
      Series.find(merged).sort(sort).skip((page - 1) * limit).limit(limit).lean(),
      Series.countDocuments(merged),
    ]);
    res.json({ items, total, page, limit });
  })
);

// ── TF-IDF Cosine Similarity: Find similar series ──
router.get('/:id/similar', optionalAuth, asyncHandler(async (req, res) => {
  const target = await Series.findById(req.params.id).lean();
  if (!target) return res.status(404).json({ message: 'Not found' });

  const allSeries = await Series.find({ catalogStatus: { $ne: 'draft' } }).lean();
  const results = findSimilarSeries(target._id, allSeries, 10);

  const MIN_SIMILARITY = 0.10;
  const seriesMap = Object.fromEntries(allSeries.map((s) => [s._id.toString(), s]));
  const items = results
    .filter((r) => r.similarity >= MIN_SIMILARITY && seriesMap[r.seriesId])
    .slice(0, 6)
    .map((r) => ({ series: seriesMap[r.seriesId], similarity: r.similarity }));

  res.json({ items });
}));

router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const series = await Series.findById(req.params.id).lean();
  if (!series) return res.status(404).json({ message: 'Not found' });
  if (series.catalogStatus === 'draft' && req.user?.role !== 'admin') {
    return res.status(404).json({ message: 'Not found' });
  }
  const tree = await listEpisodesForSeries(series._id);
  res.json({ series, seasons: tree });
}));

router.post(
  '/',
  authenticate,
  requireRole('admin'),
  [
    body('title').trim().notEmpty(),
    body('description').optional().isString(),
    body('genres').optional().isArray(),
    body('tags').optional().isArray(),
    body('releaseYear').optional().isInt(),
    body('type').optional().isIn(['series', 'movie']),
    body('posterPath').optional().isString(),
    body('videoFile').optional().isString(),
    body('thumbnailPath').optional().isString(),
    body('subtitleFile').optional().isString(),
    body('catalogStatus').optional().isIn(['draft', 'published']),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const createPayload = { ...req.body, createdBy: req.user._id };
    const finalStatus = createPayload.catalogStatus ?? 'published';
    if (finalStatus === 'published') {
      const err = validatePublishedSeriesDoc(createPayload);
      if (err) return res.status(400).json({ message: err });
    }
    const s = await Series.create(createPayload);
    res.status(201).json({ series: s });
  })
);

router.patch(
  '/:id',
  authenticate,
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const doc = await Series.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });

    // Fixed: whitelist allowed fields to prevent mass assignment (issue 1.5)
    const updates = {};
    for (const key of SERIES_ALLOWED_FIELDS) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const merged = {
      title: updates.title !== undefined ? updates.title : doc.title,
      description: updates.description !== undefined ? updates.description : doc.description,
      genres: updates.genres !== undefined ? updates.genres : doc.genres,
      posterPath: updates.posterPath !== undefined ? updates.posterPath : doc.posterPath,
      videoFile: updates.videoFile !== undefined ? updates.videoFile : doc.videoFile,
      thumbnailPath: updates.thumbnailPath !== undefined ? updates.thumbnailPath : doc.thumbnailPath,
      subtitleFile: updates.subtitleFile !== undefined ? updates.subtitleFile : doc.subtitleFile,
      releaseYear: updates.releaseYear !== undefined ? updates.releaseYear : doc.releaseYear,
      catalogStatus: updates.catalogStatus !== undefined ? updates.catalogStatus : doc.catalogStatus,
    };
    const finalStatus = merged.catalogStatus ?? doc.catalogStatus ?? 'published';
    if (finalStatus === 'published') {
      const err = validatePublishedSeriesDoc(merged);
      if (err) return res.status(400).json({ message: err });
    }
    Object.assign(doc, updates);
    await doc.save();
    res.json({ series: doc });
  })
);

router.delete('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const s = await Series.findByIdAndDelete(req.params.id);
  if (!s) return res.status(404).json({ message: 'Not found' });
  const seasons = await Season.find({ seriesId: s._id });
  for (const se of seasons) {
    await Episode.deleteMany({ seasonId: se._id });
  }
  await Season.deleteMany({ seriesId: s._id });
  res.json({ message: 'Deleted' });
}));

router.post(
  '/:id/seasons',
  authenticate,
  requireRole('admin'),
  [body('number').isInt({ min: 1 }), body('title').optional().isString()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const series = await Series.findById(req.params.id);
    if (!series) return res.status(404).json({ message: 'Series not found' });
    try {
      const season = await Season.create({
        seriesId: series._id,
        number: req.body.number,
        title: req.body.title || '',
      });
      res.status(201).json({ season });
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ message: 'Season number exists' });
      throw e;
    }
  })
);

module.exports = router;
