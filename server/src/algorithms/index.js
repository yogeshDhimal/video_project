/**
 * Barrel export for scoring & search helpers.
 * Domain logic lives in subfolders: recommendation/, trending/, etc.
 */

const { RECOMMENDATION_WEIGHTS, recommendationScore } = require('./recommendation');
const { TRENDING_WEIGHTS, trendingScoreRaw } = require('./trending');
const { isContinueWatching } = require('./continue-watching');
const { engagementScore } = require('./engagement');
const { norm } = require('./shared/normalization');

module.exports = {
  RECOMMENDATION_WEIGHTS,
  TRENDING_WEIGHTS,
  recommendationScore,
  trendingScoreRaw,
  isContinueWatching,
  engagementScore,
  norm,
};
