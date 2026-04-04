/**
 * Advanced Hybrid Recommendation System
 *
 * Combines:
 * - Content-based filtering (genre matching)
 * - User behavior (watch history, watch completion)
 * - Popularity (views, likes)
 * - Recency (new videos boost)
 * - Engagement (likes, comments)
 *
 * Math.random() removed — diversity is handled by the Diversity Engine
 * in the recommendations route instead.
 */

const HYBRID_WEIGHTS = {
  genreMatch: 0.30,
  watchCompletion: 0.20,
  views: 0.15,
  likes: 0.15,
  recencyBoost: 0.10,
  engagementScore: 0.10,
};

function calculateHybridScore(signals) {
  const {
    normalizedGenreMatch = 0,
    watchCompletion = 0,
    normalizedLikes = 0,
    normalizedViews = 0,
    recencyBoost = 0,
    normalizedEngagement = 0,
  } = signals;

  const baseScore =
    (normalizedGenreMatch * HYBRID_WEIGHTS.genreMatch) +
    (watchCompletion * HYBRID_WEIGHTS.watchCompletion) +
    (normalizedLikes * HYBRID_WEIGHTS.likes) +
    (normalizedViews * HYBRID_WEIGHTS.views) +
    (recencyBoost * HYBRID_WEIGHTS.recencyBoost) +
    (normalizedEngagement * HYBRID_WEIGHTS.engagementScore);

  return baseScore;
}

module.exports = {
  HYBRID_WEIGHTS,
  calculateHybridScore,
};
