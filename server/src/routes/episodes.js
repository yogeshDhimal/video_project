const express = require('express');
const { body, validationResult } = require('express-validator');
const Episode = require('../models/Episode');
const Season = require('../models/Season');
const Series = require('../models/Series');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { getEpisodeChain, getNextEpisode, getPrevEpisode } = require('../helpers/content');
const { trendingScoreRaw } = require('../algorithms');

const router = express.Router();

/** Whitelist of fields allowed in episode PATCH to prevent mass assignment (issue 1.4) */
const EPISODE_ALLOWED_FIELDS = [
  'title', 'description', 'durationSeconds', 'thumbnailPath',
  'qualities', 'subtitles', 'introStartSec', 'introEndSec',
  'outroStartSec', 'outroEndSec',
];

/** Simple in-memory view deduplication by IP (issue 2.3) */
const recentViewKeys = new Map();
const VIEW_DEDUP_MS = 60_000; // 1 minute

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, ts] of recentViewKeys) {
    if (now - ts > VIEW_DEDUP_MS * 5) recentViewKeys.delete(key);
  }
}, 5 * 60_000);

router.get('/:id/prev', optionalAuth, asyncHandler(async (req, res) => {
  const prev = await getPrevEpisode(req.params.id);
  if (!prev) return res.json({ prev: null });
  if (prev.series?.catalogStatus === 'draft' && req.user?.role !== 'admin') {
    return res.json({ prev: null });
  }
  res.json({
    prev: {
      episode: prev.episode,
      season: prev.season,
      series: prev.series,
    },
  });
}));

router.get('/:id/next', optionalAuth, asyncHandler(async (req, res) => {
  const next = await getNextEpisode(req.params.id);
  if (!next) return res.json({ next: null });
  if (next.series?.catalogStatus === 'draft' && req.user?.role !== 'admin') {
    return res.json({ next: null });
  }
  res.json({
    next: {
      episode: next.episode,
      season: next.season,
      series: next.series,
    },
  });
}));

router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const data = await getEpisodeChain(req.params.id);
  if (!data || !data.episode) return res.status(404).json({ message: 'Not found' });
  res.json({
    episode: data.episode,
    season: data.season,
    series: data.series,
  });
}));

router.post(
  '/',
  authenticate,
  requireRole('admin'),
  [
    body('seasonId').notEmpty(),
    body('number').isInt({ min: 1 }),
    body('title').trim().notEmpty(),
    body('qualities').isArray({ min: 1 }),
    body('qualities.*.key').isString(),
    body('qualities.*.fileName').isString(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const season = await Season.findById(req.body.seasonId);
    if (!season) return res.status(404).json({ message: 'Season not found' });
    const epData = {
      seasonId: season._id,
      number: req.body.number,
      title: req.body.title,
      description: req.body.description || '',
      durationSeconds: req.body.durationSeconds || 0,
      thumbnailPath: req.body.thumbnailPath || '',
      qualities: req.body.qualities,
      subtitles: req.body.subtitles || [],
      introStartSec: req.body.introStartSec ?? 0,
      introEndSec: req.body.introEndSec ?? 0,
      outroStartSec: req.body.outroStartSec ?? 0,
      outroEndSec: req.body.outroEndSec ?? 0,
    };
    try {
      const episode = await Episode.create(epData);
      episode.trendingScore = trendingScoreRaw(episode.views, episode.likes, episode.recentViews);
      episode.engagementScore = 0;
      await episode.save();
      const series = await Series.findById(season.seriesId);

      // Fixed: use insertMany instead of Promise.all(map(create)) (issue 2.5)
      if (series && series.catalogStatus !== 'draft') {
        const users = await User.find({ preferredGenres: { $in: series.genres } }).select('_id');
        if (users.length > 0) {
          const notifs = users.map((u) => ({
            userId: u._id,
            type: 'new_episode',
            title: 'New episode',
            message: `${series.title} — ${episode.title}`,
            link: `/watch/${episode._id}`,
          }));
          await Notification.insertMany(notifs);
        }
      }
      res.status(201).json({ episode });
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ message: 'Episode number exists in season' });
      throw e;
    }
  })
);

// Fixed: whitelist allowed fields to prevent mass assignment (issue 1.4)
router.patch('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const updates = {};
  for (const key of EPISODE_ALLOWED_FIELDS) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const ep = await Episode.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
  if (!ep) return res.status(404).json({ message: 'Not found' });
  ep.trendingScore = trendingScoreRaw(ep.views, ep.likes, ep.recentViews);
  await ep.save();
  res.json({ episode: ep });
}));

router.delete('/:id', authenticate, requireRole('admin'), asyncHandler(async (req, res) => {
  const ep = await Episode.findByIdAndDelete(req.params.id);
  if (!ep) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
}));

// Fixed: view deduplication by IP to prevent inflation (issue 2.3)
router.post('/:id/view', optionalAuth, asyncHandler(async (req, res) => {
  const ep = await Episode.findById(req.params.id);
  if (!ep) return res.status(404).json({ message: 'Not found' });

  // Deduplicate: 1 view per IP per episode per minute
  const dedupKey = `${req.ip}:${req.params.id}`;
  const now = Date.now();
  if (recentViewKeys.has(dedupKey) && now - recentViewKeys.get(dedupKey) < VIEW_DEDUP_MS) {
    return res.json({ views: ep.views, trendingScore: ep.trendingScore });
  }
  recentViewKeys.set(dedupKey, now);

  ep.views += 1;
  ep.recentViews += 1;
  ep.trendingScore = trendingScoreRaw(ep.views, ep.likes, ep.recentViews);
  await ep.save();
  const series = await getEpisodeChain(ep._id);
  if (series && series.series) {
    await Series.updateOne({ _id: series.series._id }, { $inc: { totalViews: 1 } });
  }
  res.json({ views: ep.views, trendingScore: ep.trendingScore });
}));

module.exports = router;
