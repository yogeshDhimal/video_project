/**
 * Trending: views * 0.6 + likes * 0.3 + recent_views * 0.1
 * Uses log-scaled inputs vs caps so huge channels do not dominate.
 */

const { norm } = require('../shared/normalization');

const TRENDING_WEIGHTS = {
  views: 0.6,
  likes: 0.3,
  recentViews: 0.1,
};

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

module.exports = { TRENDING_WEIGHTS, trendingScoreRaw };
