const express = require('express');
const { query, validationResult } = require('express-validator');
const Series = require('../models/Series');
const Episode = require('../models/Episode');
const Season = require('../models/Season');
const { createFuzzyIndex } = require('../algorithms/fuzzy-search');

const router = express.Router();

let cache = { series: [], episodes: [], at: 0 };
const CACHE_MS = 60 * 1000;

async function loadSearchCorpus() {
  const now = Date.now();
  if (now - cache.at < CACHE_MS && cache.series.length) return cache;
  const series = await Series.find({ catalogStatus: { $ne: 'draft' } }).limit(800).lean();
  const publishedIds = new Set(series.map((s) => s._id.toString()));
  const episodes = await Episode.find().limit(5000).lean();
  const seasons = await Season.find().lean();
  const seasonMap = Object.fromEntries(seasons.map((s) => [s._id.toString(), s]));
  const epEnriched = episodes
    .map((e) => ({
      ...e,
      seasonNumber: seasonMap[e.seasonId?.toString()]?.number,
      seriesId: seasonMap[e.seasonId?.toString()]?.seriesId?.toString(),
    }))
    .filter((e) => e.seriesId && publishedIds.has(e.seriesId));
  cache = { series, episodes: epEnriched, at: now };
  return cache;
}

router.get(
  '/',
  [
    query('q').optional().isString(),
    query('genre').optional().isString(),
    query('year').optional().isInt(),
    query('sort').optional().isIn(['relevance', 'year', 'popularity']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { q, genre, year, sort } = req.query;
    const { series: allSeries, episodes: allEps } = await loadSearchCorpus();

    let seriesResults = allSeries.filter((s) => {
      if (genre && !(s.genres || []).includes(genre)) return false;
      if (year && s.releaseYear !== Number(year)) return false;
      return true;
    });

    let episodeResults = allEps.filter((e) => {
      if (genre) {
        const ser = allSeries.find((x) => x._id.toString() === e.seriesId);
        if (!ser || !(ser.genres || []).includes(genre)) return false;
      }
      if (year) {
        const ser = allSeries.find((x) => x._id.toString() === e.seriesId);
        if (!ser || ser.releaseYear !== Number(year)) return false;
      }
      return true;
    });

    if (q && String(q).trim()) {
      const fuseS = createFuzzyIndex(seriesResults, ['title', 'description', 'tags']);
      const fuseE = createFuzzyIndex(episodeResults, ['title', 'description']);
      seriesResults = fuseS.search(q).map((r) => ({ ...r.item, _score: r.score }));
      episodeResults = fuseE.search(q).map((r) => ({ ...r.item, _score: r.score }));
      if (sort === 'year') {
        seriesResults.sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));
      } else if (sort === 'popularity') {
        seriesResults.sort((a, b) => (b.totalViews || 0) - (a.totalViews || 0));
        episodeResults.sort((a, b) => (b.views || 0) - (a.views || 0));
      }
    } else {
      if (sort === 'year') {
        seriesResults.sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));
      } else {
        seriesResults.sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
      }
      episodeResults.sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
    }

    res.json({
      series: seriesResults.slice(0, 40),
      episodes: episodeResults.slice(0, 40),
    });
  }
);

router.get('/suggest', [query('q').isString().trim().isLength({ min: 1, max: 80 })], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { series: allSeries } = await loadSearchCorpus();
  const fuse = createFuzzyIndex(allSeries, ['title', 'tags']);
  const hits = fuse.search(req.query.q).slice(0, 8);
  res.json({ suggestions: hits.map((h) => ({ title: h.item.title, id: h.item._id })) });
});

module.exports = router;
