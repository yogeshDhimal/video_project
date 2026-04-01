const express = require('express');
const Episode = require('../models/Episode');
const Season = require('../models/Season');
const Series = require('../models/Series');
const { optionalAuth } = require('../middleware/auth');
const { calculateDynamicTrending, norm } = require('../algorithms'); // Assuming it's in index

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

// Updated route to explicitly match GET /api/videos/trending
router.get('/videos/trending', optionalAuth, async (_req, res) => {
  // Pull a large candidate pool of recently interacted videos to sort dynamically
  const candidates = await Episode.find().sort({ trendingScore: -1 }).limit(200).lean();
  
  if (!candidates.length) return res.json({ items: [] });

  // Calculate maximums for normalization to ensure metrics don't overpower each other
  const maxViews = Math.max(1, ...candidates.map(c => c.views || 0));
  const maxLikes = Math.max(1, ...candidates.map(c => c.likes || 0));
  const maxRecent = Math.max(1, ...candidates.map(c => c.recentViews || 0));

  const now = Date.now();

  const scored = candidates.map(ep => {
    // Normalize raw stats via [0, 1] bounds
    const normalizedViews = norm(ep.views || 0, maxViews);
    const normalizedLikes = norm(ep.likes || 0, maxLikes);
    const normalizedRecentViews = norm(ep.recentViews || 0, maxRecent);

    // Dynamic Trending Equation
    const trendingScore = calculateDynamicTrending({ 
      normalizedViews, 
      normalizedLikes, 
      normalizedRecentViews 
    });

    // Time decay calculation
    const daysSinceUpload = Math.max(0, (now - new Date(ep.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const recencyBoost = 1 / (daysSinceUpload + 1);

    // Final mathematical resolution
    const finalScore = trendingScore * recencyBoost;

    return { ...ep, finalScore };
  });

  // Sort descending and grab top 10
  scored.sort((a, b) => b.finalScore - a.finalScore);
  const top10 = scored.slice(0, 10);

  const items = await attachSeries(top10);
  res.json({ items });
});

// Alias for old frontend clients if necessary, otherwise it just sits unused.
router.get('/trending', optionalAuth, async (req, res) => {
  res.redirect(301, '/api/videos/trending');
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
