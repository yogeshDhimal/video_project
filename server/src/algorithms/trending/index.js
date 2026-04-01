const { norm } = require('../shared/normalization');

const TRENDING_WEIGHTS = {
  views: 0.5,
  likes: 0.3,
  recentViews: 0.2,
};

/**
 * Calculates dynamic trending score utilizing pool maximums
 * to avoid single metrics overpowering the calculation.
 */
function calculateDynamicTrending(signals) {
  const { normalizedViews, normalizedLikes, normalizedRecentViews } = signals;
  
  return (
    (normalizedViews * TRENDING_WEIGHTS.views) +
    (normalizedLikes * TRENDING_WEIGHTS.likes) +
    (normalizedRecentViews * TRENDING_WEIGHTS.recentViews)
  );
}

/**
 * Legacy raw score used for quick database approximations on views.
 * Uses log1p so huge channels don't dominate completely.
 */
function trendingScoreRaw(views, likes, recentViews) {
  const v = Math.log1p(views || 0);
  const l = Math.log1p(Math.max(0, likes || 0));
  const r = Math.log1p(recentViews || 0);
  const maxV = Math.log1p(1e7);
  const maxL = Math.log1p(1e6);
  const maxR = Math.log1p(1e6);
  return (
    TRENDING_WEIGHTS.views * norm(v, maxV) +
    TRENDING_WEIGHTS.likes * norm(l, maxL) +
    TRENDING_WEIGHTS.recentViews * norm(r, maxR)
  );
}

module.exports = { TRENDING_WEIGHTS, trendingScoreRaw, calculateDynamicTrending };
