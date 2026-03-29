/**
 * Continue watching: show when progress > 10% and < 95%.
 */
function isContinueWatching(progressSeconds, durationSeconds) {
  if (!durationSeconds || durationSeconds <= 0) return false;
  const p = progressSeconds / durationSeconds;
  return p > 0.1 && p < 0.95;
}

module.exports = { isContinueWatching };
