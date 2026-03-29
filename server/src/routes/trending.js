const express = require('express');
const Episode = require('../models/Episode');
const Season = require('../models/Season');
const Series = require('../models/Series');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

async function attachSeries(episodes) {
  const seasonIds = [...new Set(episodes.map((e) => e.seasonId.toString()))];
  const seasons = await Season.find({ _id: { $in: seasonIds } }).lean();
  const smap = Object.fromEntries(seasons.map((s) => [s._id.toString(), s]));
  const seriesIds = [...new Set(seasons.map((s) => s.seriesId.toString()))];
  const series = await Series.find({ _id: { $in: seriesIds }, catalogStatus: { $ne: 'draft' } }).lean();
  const seriesMap = Object.fromEntries(series.map((s) => [s._id.toString(), s]));
  return episodes
    .map((e) => ({
      episode: e,
      season: smap[e.seasonId.toString()],
      series: seriesMap[smap[e.seasonId.toString()]?.seriesId?.toString()],
    }))
    .filter((row) => row.series);
}

router.get('/trending', optionalAuth, async (_req, res) => {
  const eps = await Episode.find().sort({ trendingScore: -1 }).limit(20).lean();
  res.json({ items: await attachSeries(eps) });
});

router.get('/most-watched', optionalAuth, async (_req, res) => {
  const eps = await Episode.find().sort({ views: -1 }).limit(20).lean();
  res.json({ items: await attachSeries(eps) });
});

router.get('/top-rated', optionalAuth, async (_req, res) => {
  const eps = await Episode.find().sort({ engagementScore: -1, likes: -1 }).limit(20).lean();
  res.json({ items: await attachSeries(eps) });
});

router.get('/recent', optionalAuth, async (_req, res) => {
  const eps = await Episode.find().sort({ createdAt: -1 }).limit(20).lean();
  res.json({ items: await attachSeries(eps) });
});

module.exports = router;
