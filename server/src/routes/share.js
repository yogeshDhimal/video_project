const express = require('express');
const Episode = require('../models/Episode');
const { optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const env = require('../config/env');

const router = express.Router();

// Fixed: escape HTML entities in embed output to prevent XSS (issue 6.5)
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

router.get('/episode/:id', optionalAuth, asyncHandler(async (req, res) => {
  const ep = await Episode.findById(req.params.id);
  if (!ep) return res.status(404).json({ message: 'Not found' });
  const base = env.clientUrl;
  const url = `${base}/watch/${ep._id}`;
  const safeUrl = escapeHtml(url);
  res.json({
    url,
    title: ep.title,
    embedHtml: `<iframe src="${safeUrl}" width="560" height="315" allowfullscreen></iframe>`,
  });
}));

module.exports = router;
