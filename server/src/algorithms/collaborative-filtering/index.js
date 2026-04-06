const WatchHistory = require('../../models/WatchHistory');
const Like = require('../../models/Like');
const Rating = require('../../models/Rating');
const { calculatePearsonCorrelation, predictRating } = require('./pearson');
const { getSVDRecommendations } = require('./svd');

/**
 * Cached rating matrix to avoid full-table-scan on every request.
 * TTL: 5 minutes.
 */
let cachedMatrix = null;
let matrixBuiltAt = 0;
const MATRIX_CACHE_MS = 5 * 60 * 1000;

/**
 * Constructs a comprehensive mathematically normalized user-item rating matrix.
 * Prioritizes explicit 1-5 star ratings, falling back to converted 
 * likes/dislikes (1 or 5) and implicit watch progress (2-4).
 *
 * Results are cached for 5 minutes to avoid rebuilding on every request.
 */
async function buildRatingMatrix() {
  const now = Date.now();
  if (cachedMatrix && now - matrixBuiltAt < MATRIX_CACHE_MS) {
    return cachedMatrix;
  }

  const [history, likes, explicitRatings] = await Promise.all([
    WatchHistory.find().lean(),
    Like.find().lean(),
    Rating.find().lean(),
  ]);

  // Matrix structure: { userId: { episodeId: score (1-5) } }
  const matrix = {};

  // 1. Process Watch History (Implicit Ratings 2-4)
  for (const h of history) {
    const uid = h.userId.toString();
    const eid = h.episodeId.toString();
    if (!matrix[uid]) matrix[uid] = {};

    const duration = h.durationSeconds || 1800; // fallback avg
    const progress = h.progressSeconds || 0;
    const percent = progress / duration;

    let score = 2;
    if (percent >= 0.90) score = 4;
    else if (percent >= 0.50) score = 3;

    matrix[uid][eid] = score;
  }

  // 2. Process Likes (Explicit 1 or 5)
  for (const l of likes) {
    const uid = l.userId.toString();
    const eid = l.episodeId.toString();
    if (!matrix[uid]) matrix[uid] = {};
    matrix[uid][eid] = l.value === 1 ? 5 : 1;
  }

  // 3. Process Explicit Ratings (Precision 1-5)
  // HIGHEST PRIORITY: These override everything else
  for (const r of explicitRatings) {
    const uid = r.userId.toString();
    const eid = r.episodeId.toString();
    if (!matrix[uid]) matrix[uid] = {};
    matrix[uid][eid] = r.rating;
  }

  cachedMatrix = matrix;
  matrixBuiltAt = now;
  return matrix;
}

/**
 * Uses the Pearson Correlation matrix to predict high-value unseen episodes.
 */
async function getCollaborativeRecommendations(targetUserId, candidateEpisodeIds, limit = 10) {
  const matrix = await buildRatingMatrix();
  const targetIdStr = targetUserId.toString();
  const targetRatings = matrix[targetIdStr] || {};

  // 1. Calculate similarity distances between the active user and all other users
  const similarUsersData = [];
  for (const uid in matrix) {
    if (uid === targetIdStr) continue;
    const similarity = calculatePearsonCorrelation(targetRatings, matrix[uid]);
    similarUsersData.push({
      userId: uid,
      similarity,
      ratings: matrix[uid],
    });
  }

  // 2. Predict ratings for requested candidates
  const predictions = [];
  for (const epId of candidateEpisodeIds) {
    const epIdStr = epId.toString();

    // Skip if user already watched or rated it
    if (targetRatings[epIdStr] !== undefined) continue;

    const predictedScore = predictRating(targetRatings, epIdStr, similarUsersData);

    if (predictedScore > 3.0) {
      predictions.push({
        episodeId: epId,
        predictedRating: predictedScore,
      });
    }
  }

  // 3. Sort by highest mathematical prediction
  predictions.sort((a, b) => b.predictedRating - a.predictedRating);
  return predictions.slice(0, limit);
}

/**
 * Invalidates the cached rating matrix.
 * Essential for live demos so ratings update immediately without waiting 5 minutes.
 */
function invalidateRatingMatrixCache() {
  cachedMatrix = null;
  matrixBuiltAt = 0;
}

module.exports = {
  buildRatingMatrix,
  getCollaborativeRecommendations,
  getSVDRecommendations,
  invalidateRatingMatrixCache,
};
