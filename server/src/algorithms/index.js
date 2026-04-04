/**
 * Barrel export for scoring & search helpers.
 * Domain logic lives in subfolders: recommendation/, trending/, etc.
 */

const { RECOMMENDATION_WEIGHTS, recommendationScore } = require('./recommendation');
const { TRENDING_WEIGHTS, trendingScoreRaw, calculateDynamicTrending } = require('./trending');
const { isContinueWatching } = require('./continue-watching');
const { engagementScore } = require('./engagement');
const { norm } = require('./shared/normalization');
const { calculateVideoRange } = require('./video-streaming');
const { calculateHybridScore } = require('./hybrid-recommendation');
const { findSimilarSeries, cosineSimilarity, tokenize, computeTF, computeIDF, buildTFIDFVector } = require('./content-similarity');
const { buildRatingMatrix, getCollaborativeRecommendations, getSVDRecommendations } = require('./collaborative-filtering');

module.exports = {
  RECOMMENDATION_WEIGHTS,
  TRENDING_WEIGHTS,
  recommendationScore,
  trendingScoreRaw,
  calculateDynamicTrending,
  isContinueWatching,
  engagementScore,
  norm,
  calculateVideoRange,
  calculateHybridScore,
  findSimilarSeries,
  cosineSimilarity,
  tokenize,
  computeTF,
  computeIDF,
  buildTFIDFVector,
  buildRatingMatrix,
  getCollaborativeRecommendations,
  getSVDRecommendations,
};
