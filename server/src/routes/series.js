const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Series = require('../models/Series');
const Season = require('../models/Season');
const Episode = require('../models/Episode');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');
const { listEpisodesForSeries } = require('../helpers/content');
const { validatePublishedSeriesDoc } = require('../helpers/seriesPublishValidation');

const router = express.Router();

router.get(
  '/',
  optionalAuth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('genre').optional().isString(),
    query('year').optional().isInt(),
    query('sort').optional().isIn(['newest', 'popular', 'rating']),
    query('includeDrafts').optional().isIn(['0', '1']),
    query('catalogStatus').optional().isIn(['draft', 'published']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const filter = {};
    if (req.query.genre) filter.genres = req.query.genre;
    if (req.query.year) filter.releaseYear = Number(req.query.year);
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
  }
);

router.get('/:id', optionalAuth, async (req, res) => {
  const series = await Series.findById(req.params.id).lean();
  if (!series) return res.status(404).json({ message: 'Not found' });
  if (series.catalogStatus === 'draft' && req.user?.role !== 'admin') {
    return res.status(404).json({ message: 'Not found' });
  }
  const tree = await listEpisodesForSeries(series._id);
  res.json({ series, seasons: tree });
});

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
    body('catalogStatus').optional().isIn(['draft', 'published']),
  ],
  async (req, res) => {
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
  }
);

router.patch(
  '/:id',
  authenticate,
  requireRole('admin'),
  async (req, res) => {
    const doc = await Series.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Not found' });
    const merged = {
      title: req.body.title !== undefined ? req.body.title : doc.title,
      description: req.body.description !== undefined ? req.body.description : doc.description,
      genres: req.body.genres !== undefined ? req.body.genres : doc.genres,
      posterPath: req.body.posterPath !== undefined ? req.body.posterPath : doc.posterPath,
      releaseYear: req.body.releaseYear !== undefined ? req.body.releaseYear : doc.releaseYear,
      catalogStatus: req.body.catalogStatus !== undefined ? req.body.catalogStatus : doc.catalogStatus,
    };
    const finalStatus = merged.catalogStatus ?? doc.catalogStatus ?? 'published';
    if (finalStatus === 'published') {
      const err = validatePublishedSeriesDoc(merged);
      if (err) return res.status(400).json({ message: err });
    }
    Object.assign(doc, req.body);
    await doc.save();
    res.json({ series: doc });
  }
);

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const s = await Series.findByIdAndDelete(req.params.id);
  if (!s) return res.status(404).json({ message: 'Not found' });
  const seasons = await Season.find({ seriesId: s._id });
  for (const se of seasons) {
    await Episode.deleteMany({ seasonId: se._id });
  }
  await Season.deleteMany({ seriesId: s._id });
  res.json({ message: 'Deleted' });
});

router.post(
  '/:id/seasons',
  authenticate,
  requireRole('admin'),
  [body('number').isInt({ min: 1 }), body('title').optional().isString()],
  async (req, res) => {
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
  }
);

module.exports = router;
