const express = require('express');
const mongoose = require('mongoose');
const WatchHistory = require('../models/WatchHistory');
const Like = require('../models/Like');
const Episode = require('../models/Episode');
const Season = require('../models/Season');
const Series = require('../models/Series');
const Comment = require('../models/Comment');
const { authenticate } = require('../middleware/auth');
const { calculateHybridScore, norm, getCollaborativeRecommendations, buildRatingMatrix, getSVDRecommendations } = require('../algorithms');

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

  // Exclude completed episodes (>= 95% watched)
  const completedSet = new Set(
    history
      .filter((h) => {
        const duration = h.durationSeconds || 1;
        return h.progressSeconds / duration >= 0.95;
      })
      .map((h) => h.episodeId.toString())
  );

  const candidates = await Episode.find({
    _id: { $nin: [...completedSet].map((id) => new mongoose.Types.ObjectId(id)) },
  })
    .sort({ trendingScore: -1 })
    .limit(400)
    .lean();

  const candidateIds = candidates.map((c) => c._id);
  
  // Predict using User-to-User Pearson Correlation
  const cfRecs = await getCollaborativeRecommendations(req.user._id, candidateIds, 100);
  const cfScores = Object.fromEntries(cfRecs.map(r => [r.episodeId.toString(), r.predictedRating]));

  // Predict using Latent Matrix Factorization (SVD via SGD)
  const matrixData = await buildRatingMatrix();
  const svdRecs = getSVDRecommendations(req.user._id, candidateIds, matrixData);
  const svdScores = Object.fromEntries(svdRecs.map(r => [r.episodeId, r]));

  // Aggregate comment counts for engagement score
  const commentCountsRaw = await Comment.aggregate([
    { $match: { episodeId: { $in: candidateIds } } },
    { $group: { _id: '$episodeId', count: { $sum: 1 } } }
  ]);
  const commentCounts = Object.fromEntries(commentCountsRaw.map(c => [c._id.toString(), c.count]));

  const seasonIds = [...new Set(candidates.map((e) => e.seasonId.toString()))];
  const seasons2 = await Season.find({ _id: { $in: seasonIds.map((id) => new mongoose.Types.ObjectId(id)) } }).lean();
  const s2map = Object.fromEntries(seasons2.map((s) => [s._id.toString(), s]));
  const seriesIds2 = [...new Set(seasons2.map((s) => s.seriesId.toString()))];
  const series2 = await Series.find({
    _id: { $in: seriesIds2.map((id) => new mongoose.Types.ObjectId(id)) },
    catalogStatus: { $ne: 'draft' },
  }).lean();
  const series2map = Object.fromEntries(series2.map((s) => [s._id.toString(), s]));

  // Find max values for normalization
  const maxLikes = Math.max(1, ...candidates.map((c) => c.likes || 0));
  const maxViews = Math.max(1, ...candidates.map((c) => c.views || 0));
  
  const engagements = candidates.map((c) => (c.likes || 0) + (commentCounts[c._id.toString()] || 0) * 2);
  const maxEngagement = Math.max(1, ...engagements);

  const userPreferredGenres = new Set(Object.keys(genreWeights));
  const maxPossibleGenreMatch = Math.max(1, userPreferredGenres.size);

  const now = Date.now();

  const scored = candidates.map((ep) => {
    const se = s2map[ep.seasonId.toString()];
    const ser = se ? series2map[se.seriesId.toString()] : null;
    
    // 1. genreMatch
    let genreMatch = 0;
    if (ser && ser.genres) {
      genreMatch = ser.genres.filter((g) => userPreferredGenres.has(g)).length;
    }
    const normalizedGenreMatch = norm(genreMatch, maxPossibleGenreMatch);

    // 2. watchCompletion
    let watchCompletion = 0;
    const histEntry = history.find((h) => h.episodeId.toString() === ep._id.toString());
    if (histEntry) {
       watchCompletion = Math.min(1, (histEntry.progressSeconds || 0) / Math.max(1, histEntry.durationSeconds || ep.durationSeconds || 1));
    }

    // 3. normalizedLikes & normalizedViews
    const normalizedLikes = norm(ep.likes || 0, maxLikes);
    const normalizedViews = norm(ep.views || 0, maxViews);

    // 4. recencyBoost (1 / (daysSinceUpload + 1))
    const daysSinceUpload = Math.max(0, (now - new Date(ep.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    const recencyBoost = 1 / (daysSinceUpload + 1);

    // 5. engagementScore
    const comments = commentCounts[ep._id.toString()] || 0;
    const rawEngagement = (ep.likes || 0) + comments * 2;
    const normalizedEngagement = norm(rawEngagement, maxEngagement);

    // 6. Collaborative Pearson Core
    // Normalize math prediction (3.0 - 5.0) to (0.0 - 1.0)
    let pearsonBoost = 0;
    const pred = cfScores[ep._id.toString()];
    if (pred && pred > 3.0) {
      pearsonBoost = norm(pred - 3.0, 2.0);
    }

    // 7. SVD Matrix Factorization
    let svdBoost = 0;
    const svdData = svdScores[ep._id.toString()];
    if (svdData && svdData.predictedRating > 3.0) {
      svdBoost = norm(svdData.predictedRating - 3.0, 2.0);
    }

    let score = calculateHybridScore({
      normalizedGenreMatch,
      watchCompletion,
      normalizedLikes,
      normalizedViews,
      recencyBoost,
      normalizedEngagement,
    });
    
    // Hard mathematically proven predictions get massive boosts over heuristics
    score += (pearsonBoost * 5) + (svdBoost * 7);

    return { 
      episode: ep, 
      series: ser, 
      season: se, 
      score, 
      pearsonPredicted: pred || null,
      mathProof: svdData ? {
        uVector: svdData.uVector,
        vVector: svdData.vVector,
        dotProduct: svdData.predictedRating
      } : null
    };
  });

  // Diversity Engine: Avoid consecutive same-genre repetition
  const visible = scored.filter((r) => r.series && r.series.genres && r.series.genres.length > 0);
  visible.sort((a, b) => b.score - a.score);
  
  const diversityItems = [];
  const recentGenres = [];
  
  for (const item of visible) {
    if (diversityItems.length >= 20) break;
    
    // Use the primary categorizing genre to detect duplicates
    const primaryGenre = item.series.genres[0];
    
    // Prevent 3 consecutive identical genres
    const consecutiveCount = 2;
    let isRepeating = true;
    for (let i = 1; i <= consecutiveCount; i++) {
      if (recentGenres.length < i || recentGenres[recentGenres.length - i] !== primaryGenre) {
        isRepeating = false;
        break;
      }
    }

    if (isRepeating) {
      continue; // Skip this video to ensure structural diversity
    }
    
    diversityItems.push(item);
    recentGenres.push(primaryGenre);
  }

  res.json({ items: diversityItems });
});

module.exports = router;
