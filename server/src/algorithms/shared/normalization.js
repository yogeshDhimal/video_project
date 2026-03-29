/** Normalize x in [0, max] to [0, 1] */
function norm(x, max) {
  if (!max || max <= 0) return 0;
  return Math.min(1, Math.max(0, x / max));
}

module.exports = { norm };
