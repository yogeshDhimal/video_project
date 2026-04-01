/**
 * Advanced Hybrid Recommendation System (College Project)
 *
 * Combines:
 * - Content-based filtering (genre matching)
 * - User behavior (watch history, watch completion)
 * - Popularity (views, likes)
 * - Recency (new videos boost)
 * - Engagement (likes, comments)
 *
 * Included Math.random() injection for serendipitous diversity
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

  let baseScore = 
    (normalizedGenreMatch * HYBRID_WEIGHTS.genreMatch) +
    (watchCompletion * HYBRID_WEIGHTS.watchCompletion) +
    (normalizedLikes * HYBRID_WEIGHTS.likes) +
    (normalizedViews * HYBRID_WEIGHTS.views) +
    (recencyBoost * HYBRID_WEIGHTS.recencyBoost) +
    (normalizedEngagement * HYBRID_WEIGHTS.engagementScore);

  // Math.random() scale based on user requirement
  baseScore += Math.random() * 0.5;

  return baseScore;
}

module.exports = {
  HYBRID_WEIGHTS,
  calculateHybridScore,
};
