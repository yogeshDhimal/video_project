/**
 * Weighted recommendation: category_match * 0.5 + likes * 0.3 + watch_time * 0.2
 * Signals are expected in [0, 1] after normalization upstream.
 */

const RECOMMENDATION_WEIGHTS = {
  categoryMatch: 0.5,
  likes: 0.3,
  watchTime: 0.2,
};

function recommendationScore(signals) {
  const { categoryMatch = 0, likeSignal = 0, watchTimeSignal = 0 } = signals;
  return (
    categoryMatch * RECOMMENDATION_WEIGHTS.categoryMatch +
    likeSignal * RECOMMENDATION_WEIGHTS.likes +
    watchTimeSignal * RECOMMENDATION_WEIGHTS.watchTime
  );
}

module.exports = { RECOMMENDATION_WEIGHTS, recommendationScore };
