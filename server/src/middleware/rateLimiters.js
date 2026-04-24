const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many attempts, try again later' },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { message: 'Upload rate limit exceeded' },
});

const streamLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 2000,
});

module.exports = { apiLimiter, authLimiter, uploadLimiter, streamLimiter };
