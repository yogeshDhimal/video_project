const express = require('express');
const { body, validationResult } = require('express-validator');
const WatchHistory = require('../models/WatchHistory');
const Episode = require('../models/Episode');
const Season = require('../models/Season');
const Series = require('../models/Series');
const { authenticate } = require('../middleware/auth');
const { isContinueWatching } = require('../algorithms');

const router = express.Router();

router.get('/continue', authenticate, async (req, res) => {
  const rows = await WatchHistory.find({ userId: req.user._id, completed: false })
    .sort({ lastWatchedAt: -1 })
    .limit(30)
    .lean();
  const epIds = rows.map((r) => r.episodeId);
  const episodes = await Episode.find({ _id: { $in: epIds } }).lean();
  const emap = Object.fromEntries(episodes.map((e) => [e._id.toString(), e]));
  const seasons = await Season.find({ _id: { $in: episodes.map((e) => e.seasonId) } }).lean();
  const smap = Object.fromEntries(seasons.map((s) => [s._id.toString(), s]));
  const series = await Series.find({ _id: { $in: seasons.map((s) => s.seriesId) } }).lean();
  const seriesMap = Object.fromEntries(series.map((s) => [s._id.toString(), s]));

  const items = rows
    .filter((r) => {
      const ep = emap[r.episodeId.toString()];
      if (!ep) return false;
      const dur = r.durationSeconds || ep.durationSeconds || 0;
      return isContinueWatching(r.progressSeconds, dur);
    })
    .map((r) => {
      const ep = emap[r.episodeId.toString()];
      const se = smap[ep.seasonId.toString()];
      const ser = se ? seriesMap[se.seriesId.toString()] : null;
      return { history: r, episode: ep, season: se, series: ser };
    });

  res.json({ items });
});

router.get('/', authenticate, async (req, res) => {
  const rows = await WatchHistory.find({ userId: req.user._id }).sort({ lastWatchedAt: -1 }).limit(100).lean();
  res.json({ items: rows });
});

router.post(
  '/progress',
  authenticate,
  [
    body('episodeId').notEmpty(),
    body('progressSeconds').isFloat({ min: 0 }),
    body('durationSeconds').optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const ep = await Episode.findById(req.body.episodeId);
    if (!ep) return res.status(404).json({ message: 'Episode not found' });
    const durationSeconds = req.body.durationSeconds ?? ep.durationSeconds ?? 0;
    const progressSeconds = req.body.progressSeconds;
    const ratio = durationSeconds > 0 ? progressSeconds / durationSeconds : 0;
    const completed = ratio >= 0.95;

    const doc = await WatchHistory.findOneAndUpdate(
      { userId: req.user._id, episodeId: ep._id },
      {
        $set: {
          progressSeconds,
          durationSeconds,
          completed,
          lastWatchedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );
    res.json({ watchHistory: doc });
  }
);

module.exports = router;
