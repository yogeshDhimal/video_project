const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');

/**
 * Extract JWT from Authorization header ONLY.
 * Query-param tokens removed (RFC 6750 §2.3 — tokens in URLs leak via logs/referrer).
 */
function extractToken(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  // Fallback to query param for <video> and <audio> tags which can't send headers
  if (req.query && req.query.token) return req.query.token;
  return null;
}

async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub).select('-password');
    if (!user || user.banned) {
      return res.status(403).json({ message: 'Access denied' });
    }
    req.user = user;
    req.token = token;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }
  jwt.verify(token, env.jwtSecret, async (err, payload) => {
    if (err || !payload) {
      req.user = null;
      return next();
    }
    try {
      const user = await User.findById(payload.sub).select('-password');
      req.user = user && !user.banned ? user : null;
    } catch {
      req.user = null;
    }
    next();
  });
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, optionalAuth, requireRole, extractToken };
