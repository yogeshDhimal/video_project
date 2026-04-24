const express = require('express');
const path = require('path');
const fs = require('fs');
const Series = require('../models/Series');
const User = require('../models/User');
const { optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');
const { POSTERS, AVATARS, THUMBNAILS } = require('../config/paths');

const router = express.Router();

router.get('/poster/:seriesId', optionalAuth, asyncHandler(async (req, res) => {
  const s = await Series.findById(req.params.seriesId);
  if (!s || !s.posterPath) return res.status(404).end();
  if (s.catalogStatus === 'draft' && req.user?.role !== 'admin') return res.status(404).end();
  
  const fileName = path.basename(s.posterPath);
  let abs = path.join(POSTERS, fileName);
  
  if (!fs.existsSync(abs)) {
    abs = path.join(THUMBNAILS, fileName);
  }
  
  if (!fs.existsSync(abs)) return res.status(404).end();
  
  res.setHeader('Content-Type', 'image/jpeg');
  fs.createReadStream(abs).pipe(res);
}));

router.get('/avatar/:userId', optionalAuth, asyncHandler(async (req, res) => {
  const u = await User.findById(req.params.userId);
  if (!u || !u.avatar) return res.status(404).end();
  const abs = path.join(AVATARS, path.basename(u.avatar));
  if (!fs.existsSync(abs)) return res.status(404).end();
  res.setHeader('Content-Type', 'image/jpeg');
  fs.createReadStream(abs).pipe(res);
}));

module.exports = router;
