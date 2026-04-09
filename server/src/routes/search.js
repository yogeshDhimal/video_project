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
    query('title').optional().isString(),
    query('tag').optional().isString(),
    query('genre').optional().isString(),
    query('year').optional().isInt(),
    query('sort').optional().isIn(['relevance', 'year', 'popularity']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { q, title, tag, genre, year, sort } = req.query;
    const { series: allSeries, episodes: allEps } = await loadSearchCorpus();

    const isActiveSearch = !!(q?.trim() || title?.trim() || tag?.trim());

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

    // Ensure we always have some trending results as a fallback
    const trendingFallback = [...allSeries]
      .sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0))
      .slice(0, 30);


    // Targeted Split Search Logic
    if (isActiveSearch && q?.trim()) {
      const fuseS = createFuzzyIndex(seriesResults, ['title', 'description', 'tags'], { threshold: 0.25 });
      const rawResults = fuseS.search(q);
      
      // The internal search now uses the 0.25 threshold, so we just map items
      seriesResults = rawResults.map(r => r.item);

      const fuseE = createFuzzyIndex(episodeResults, ['title'], { threshold: 0.25 });
      episodeResults = fuseE.search(q).map(r => r.item);

      // Handle Sorting
      if (sort === 'year') {
        seriesResults.sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));
      } else if (sort === 'popularity') {
        seriesResults.sort((a, b) => (b.totalViews || 0) - (a.totalViews || 0));
      }
    } else if (isActiveSearch) {
       if (title?.trim()) {
         const fuseT = createFuzzyIndex(seriesResults, ['title'], { threshold: 0.25 });
         seriesResults = fuseT.search(title).map(r => r.item);
       }
       if (tag?.trim()) {
         const fuseTag = createFuzzyIndex(seriesResults, ['genres', 'tags'], { threshold: 0.25 });
         seriesResults = fuseTag.search(tag).map(r => r.item);
       }
    } else {
      // Direct Trending Result
      seriesResults = trendingFallback;
      episodeResults.sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
    }

    // IF search was active but no matches found, swap in trending as 'recommendations'
    const finalSeries = (isActiveSearch && seriesResults.length === 0) 
      ? trendingFallback 
      : seriesResults.slice(0, 40);

    const matchFound = isActiveSearch && seriesResults.length > 0;

    res.json({
      series: finalSeries,
      episodes: episodeResults.slice(0, 40),
      isSearch: isActiveSearch,
      matchFound: matchFound
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
