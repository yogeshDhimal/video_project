/**
 * Wraps an async Express route handler so that rejected promises
 * are automatically forwarded to the global error handler via next().
 * Eliminates the need for try/catch in every route.
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { asyncHandler };
