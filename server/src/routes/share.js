const express = require('express');
const Episode = require('../models/Episode');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/episode/:id', optionalAuth, async (req, res) => {
  const ep = await Episode.findById(req.params.id);
  if (!ep) return res.status(404).json({ message: 'Not found' });
  const base = process.env.CLIENT_URL || 'http://localhost:5173';
  const url = `${base}/watch/${ep._id}`;
  res.json({
    url,
    title: ep.title,
    embedHtml: `<iframe src="${url}" width="560" height="315" allowfullscreen></iframe>`,
  });
});

module.exports = router;
