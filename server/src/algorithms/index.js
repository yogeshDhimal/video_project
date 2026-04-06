/**
 * Barrel export for all ClickWatch algorithms.
 *
 * ┌──────────────────────────────────────────────────┐
 * │  collaborative-filtering/  → SVD + Pearson       │
 * │  content-based-filtering/  → TF-IDF + Cosine     │
 * │  hybrid-recommendation/    → Weighted Fusion      │
 * │  trending/                 → Dynamic Trending     │
 * │  engagement/               → Engagement Score     │
 * │  fuzzy-search/             → Levenshtein Distance │
 * │  continue-watching/        → Progress Threshold   │
 * │  video-streaming/          → HTTP Range Chunking  │
 * │  shared/                   → Normalization Utils  │
 * └──────────────────────────────────────────────────┘
 */

// ── Collaborative Filtering (Pearson + SVD) ──
const { buildRatingMatrix, getCollaborativeRecommendations, getSVDRecommendations, invalidateRatingMatrixCache } = require('./collaborative-filtering');

// ── Content-Based Filtering (TF-IDF + Cosine Similarity) ──
const { findSimilarSeries, cosineSimilarity, tokenize, computeTF, computeIDF, buildTFIDFVector } = require('./content-based-filtering');

// ── Hybrid Recommendation Engine ──
const { calculateHybridScore } = require('./hybrid-recommendation');

// ── Trending ──
const { TRENDING_WEIGHTS, trendingScoreRaw, calculateDynamicTrending } = require('./trending');

// ── Engagement ──
const { engagementScore } = require('./engagement');

// ── Continue Watching ──
const { isContinueWatching } = require('./continue-watching');

// ── Fuzzy Search (Levenshtein) ──
// Imported directly where needed (search route)

// ── Video Streaming ──
const { calculateVideoRange } = require('./video-streaming');

// ── Shared Utilities ──
const { norm } = require('./shared/normalization');

module.exports = {
  // Collaborative Filtering
  buildRatingMatrix,
  getCollaborativeRecommendations,
  getSVDRecommendations,
  invalidateRatingMatrixCache,

  // Content-Based Filtering
  findSimilarSeries,
  cosineSimilarity,
  tokenize,
  computeTF,
  computeIDF,
  buildTFIDFVector,

  // Hybrid
  calculateHybridScore,

  // Trending
  TRENDING_WEIGHTS,
  trendingScoreRaw,
  calculateDynamicTrending,

  // Engagement
  engagementScore,

  // Continue Watching
  isContinueWatching,

  // Video Streaming
  calculateVideoRange,

  // Shared
  norm,
};
