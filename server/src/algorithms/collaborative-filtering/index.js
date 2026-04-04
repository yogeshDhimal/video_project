const WatchHistory = require('../../models/WatchHistory');
const Like = require('../../models/Like');
const { calculatePearsonCorrelation, predictRating } = require('./pearson');
const { getSVDRecommendations } = require('./svd');

/**
 * Constructs a comprehensive mathematically normalized user-item rating matrix.
 * Converts explicit signals (likes/dislikes) and implicit signals (watch progress)
 * into a standardized 1.0 to 5.0 scale.
 */
async function buildRatingMatrix() {
  const history = await WatchHistory.find().lean();
  const likes = await Like.find().lean();

  // Matrix structure: { userId: { episodeId: score (1-5) } }
  const matrix = {};

  // 1. Process Watch History (Implicit Ratings 2-4)
  for (const h of history) {
    const uid = h.userId.toString();
    const eid = h.episodeId.toString();
    if (!matrix[uid]) matrix[uid] = {};

    const duration = h.durationSeconds || Number.MAX_SAFE_INTEGER; // Prevent division by zero
    const progress = h.progressSeconds || 0;
    const percent = progress / duration;

    let score = 2; // Baseline for dropping the video early (<50%)
    if (percent >= 0.90) score = 4; // Almost completed is highly positive
    else if (percent >= 0.50) score = 3; // Passed the halfway mark is moderately positive

    matrix[uid][eid] = score;
  }

  // 2. Process Explicit Interactions (Explicit Ratings 1 or 5)
  // These override any implicit behavioral signals.
  for (const l of likes) {
    const uid = l.userId.toString();
    const eid = l.episodeId.toString();
    if (!matrix[uid]) matrix[uid] = {};

    matrix[uid][eid] = l.value === 1 ? 5 : 1; 
  }

  return matrix;
}

/**
 * Uses the Pearson Correlation matrix to predict high-value unseen episodes for a specific user.
 * 
 * @param {String|ObjectId} targetUserId 
 * @param {Array<String|ObjectId>} candidateEpisodeIds 
 * @param {Number} limit 
 * @returns {Array<Object>} List of episodes with their predicted Pearson rating 
 */
async function getCollaborativeRecommendations(targetUserId, candidateEpisodeIds, limit = 10) {
  const matrix = await buildRatingMatrix();
  const targetIdStr = targetUserId.toString();
  const targetRatings = matrix[targetIdStr] || {};

  // 1. Calculate similarity distances between the active user and all other network users
  const similarUsersData = [];
  for (const uid in matrix) {
    if (uid === targetIdStr) continue;
    
    const similarity = calculatePearsonCorrelation(targetRatings, matrix[uid]);
    
    similarUsersData.push({
      userId: uid,
      similarity,
      ratings: matrix[uid]
    });
  }

  // 2. Predict ratings for requested candidates
  const predictions = [];
  for (const epId of candidateEpisodeIds) {
    const epIdStr = epId.toString();
    
    // Skip if user already watched or rated it
    if (targetRatings[epIdStr] !== undefined) continue;

    const predictedScore = predictRating(targetRatings, epIdStr, similarUsersData);
    
    // Pearson sometimes returns exactly baseline (e.g. 3.0) or 0 if no overlapping users watched it.
    // We only care about positive mathematical predictions.
    if (predictedScore > 3.0) {
      predictions.push({
        episodeId: epId,
        predictedRating: predictedScore
      });
    }
  }

  // 3. Sort by highest mathematical prediction
  predictions.sort((a, b) => b.predictedRating - a.predictedRating);

  return predictions.slice(0, limit);
}

module.exports = {
  buildRatingMatrix,
  getCollaborativeRecommendations,
  getSVDRecommendations
};
