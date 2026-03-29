/**
 * Engagement score for ranking / analytics (0–100).
 * Blends like rate, view volume (log), and optional completion signal.
 */

const { norm } = require('../shared/normalization');

function engagementScore({ likes = 0, dislikes = 0, views = 0, completionRatio = 0 }) {
  const likeRate = likes + dislikes > 0 ? likes / (likes + dislikes) : 0.5;
  const viewSignal = norm(Math.log1p(views), Math.log1p(1e7));
  const completionSignal = Math.min(1, Math.max(0, completionRatio));
  return Math.round(100 * (0.4 * likeRate + 0.35 * viewSignal + 0.25 * completionSignal));
}

module.exports = { engagementScore };
