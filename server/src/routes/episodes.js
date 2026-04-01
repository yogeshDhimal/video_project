const express = require('express');
const { body, validationResult } = require('express-validator');
const Episode = require('../models/Episode');
const Season = require('../models/Season');
const Series = require('../models/Series');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { authenticate, optionalAuth, requireRole } = require('../middleware/auth');
const { getEpisodeChain, getNextEpisode, getPrevEpisode } = require('../helpers/content');
const { trendingScoreRaw } = require('../algorithms');

const router = express.Router();

router.get('/:id/prev', optionalAuth, async (req, res) => {
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
});

router.get('/:id/next', optionalAuth, async (req, res) => {
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
});

router.get('/:id', optionalAuth, async (req, res) => {
  const data = await getEpisodeChain(req.params.id);
  if (!data || !data.episode) return res.status(404).json({ message: 'Not found' });
  res.json({
    episode: data.episode,
    season: data.season,
    series: data.series,
  });
});

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
  async (req, res) => {
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
      if (series && series.catalogStatus !== 'draft') {
        const users = await User.find({ preferredGenres: { $in: series.genres } }).select('_id');
        await Promise.all(
          users.map((u) =>
            Notification.create({
              userId: u._id,
              type: 'new_episode',
              title: 'New episode',
              message: `${series.title} — ${episode.title}`,
              link: `/watch/${episode._id}`,
            })
          )
        );
      }
      res.status(201).json({ episode });
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ message: 'Episode number exists in season' });
      throw e;
    }
  }
);

router.patch('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const ep = await Episode.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  if (!ep) return res.status(404).json({ message: 'Not found' });
  ep.trendingScore = trendingScoreRaw(ep.views, ep.likes, ep.recentViews);
  await ep.save();
  res.json({ episode: ep });
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const ep = await Episode.findByIdAndDelete(req.params.id);
  if (!ep) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Deleted' });
});

router.post('/:id/view', optionalAuth, async (req, res) => {
  const ep = await Episode.findById(req.params.id);
  if (!ep) return res.status(404).json({ message: 'Not found' });
  ep.views += 1;
  ep.recentViews += 1;
  ep.trendingScore = trendingScoreRaw(ep.views, ep.likes, ep.recentViews);
  await ep.save();
  const series = await getEpisodeChain(ep._id);
  if (series && series.series) {
    await Series.updateOne({ _id: series.series._id }, { $inc: { totalViews: 1 } });
  }
  res.json({ views: ep.views, trendingScore: ep.trendingScore });
});

module.exports = router;
