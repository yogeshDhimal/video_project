const express = require('express');
const mongoose = require('mongoose');
const WatchHistory = require('../models/WatchHistory');
const Like = require('../models/Like');
const Episode = require('../models/Episode');
const Season = require('../models/Season');
const Series = require('../models/Series');
const { authenticate } = require('../middleware/auth');
const { recommendationScore, norm } = require('../algorithms');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const userId = req.user._id;

  const history = await WatchHistory.find({ userId })
    .sort({ lastWatchedAt: -1 })
    .limit(100)
    .lean();
  const liked = await Like.find({ userId, value: 1 }).limit(200).lean();

  const episodeIds = [...new Set([...history.map((h) => h.episodeId.toString()), ...liked.map((l) => l.episodeId.toString())])];
  const episodes = await Episode.find({ _id: { $in: episodeIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean();
  const seasons = await Season.find({ _id: { $in: [...new Set(episodes.map((e) => e.seasonId.toString()))].map((id) => new mongoose.Types.ObjectId(id)) } }).lean();
  const seriesIds = [...new Set(seasons.map((s) => s.seriesId.toString()))];
  const seriesList = await Series.find({ _id: { $in: seriesIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean();
  const seasonById = Object.fromEntries(seasons.map((s) => [s._id.toString(), s]));
  const seriesById = Object.fromEntries(seriesList.map((s) => [s._id.toString(), s]));

  const genreWeights = {};
  const addGenres = (sid, weight) => {
    const ser = seriesById[sid];
    if (!ser) return;
    (ser.genres || []).forEach((g) => {
      genreWeights[g] = (genreWeights[g] || 0) + weight;
    });
  };

  history.forEach((h) => {
    const ep = episodes.find((e) => e._id.toString() === h.episodeId.toString());
    if (!ep) return;
    const se = seasonById[ep.seasonId.toString()];
    if (!se) return;
    const wt = Math.min(1, (h.progressSeconds || 0) / Math.max(1, h.durationSeconds || ep.durationSeconds || 1));
    addGenres(se.seriesId.toString(), 0.2 + wt * 0.8);
  });
  liked.forEach((l) => {
    const ep = episodes.find((e) => e._id.toString() === l.episodeId.toString());
    if (!ep) return;
    const se = seasonById[ep.seasonId.toString()];
    if (!se) return;
    addGenres(se.seriesId.toString(), 1);
  });
  (req.user.preferredGenres || []).forEach((g) => {
    genreWeights[g] = (genreWeights[g] || 0) + 0.5;
  });

  const maxGenre = Math.max(1, ...Object.values(genreWeights));

  const watchedSet = new Set(history.map((h) => h.episodeId.toString()));

  const candidates = await Episode.find({
    _id: { $nin: [...watchedSet].map((id) => new mongoose.Types.ObjectId(id)) },
  })
    .sort({ trendingScore: -1 })
    .limit(400)
    .lean();

  const seasonIds = [...new Set(candidates.map((e) => e.seasonId.toString()))];
  const seasons2 = await Season.find({ _id: { $in: seasonIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean();
  const s2map = Object.fromEntries(seasons2.map((s) => [s._id.toString(), s]));
  const seriesIds2 = [...new Set(seasons2.map((s) => s.seriesId.toString()))];
  const series2 = await Series.find({
    _id: { $in: seriesIds2.map((id) => new mongoose.Types.ObjectId(id)) },
    catalogStatus: { $ne: 'draft' },
  }).lean();
  const series2map = Object.fromEntries(series2.map((s) => [s._id.toString(), s]));

  const topLiked = await Episode.findOne().sort({ likes: -1 }).lean();
  const maxLikes = Math.max(1, topLiked?.likes || 1);
  const maxWatch = Math.max(
    1,
    history.reduce((m, h) => Math.max(m, h.progressSeconds || 0), 0)
  );

  const scored = candidates.map((ep) => {
    const se = s2map[ep.seasonId.toString()];
    const ser = se ? series2map[se.seriesId.toString()] : null;
    let categoryMatch = 0;
    if (ser) {
      (ser.genres || []).forEach((g) => {
        categoryMatch += norm(genreWeights[g] || 0, maxGenre);
      });
      if ((ser.genres || []).length) categoryMatch /= ser.genres.length;
    }
    const likeSignal = norm(ep.likes || 0, maxLikes);
    const watchTimeSignal = norm(
      history.find((h) => h.episodeId.toString() === ep._id.toString())?.progressSeconds || 0,
      maxWatch
    );
    const score = recommendationScore({ categoryMatch, likeSignal, watchTimeSignal });
    return { episode: ep, series: ser, season: se, score };
  });

  const visible = scored.filter((r) => r.series);
  visible.sort((a, b) => b.score - a.score);
  res.json({ items: visible.slice(0, 24) });
});

module.exports = router;
