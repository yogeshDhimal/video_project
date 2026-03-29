const express = require('express');
const Bookmark = require('../models/Bookmark');
const Series = require('../models/Series');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const marks = await Bookmark.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
  const ids = marks.map((m) => m.seriesId);
  const series = await Series.find({ _id: { $in: ids }, catalogStatus: { $ne: 'draft' } }).lean();
  const order = Object.fromEntries(ids.map((id, i) => [id.toString(), i]));
  series.sort((a, b) => order[a._id.toString()] - order[b._id.toString()]);
  res.json({ items: series });
});

router.post('/:seriesId', authenticate, async (req, res) => {
  const s = await Series.findById(req.params.seriesId);
  if (!s || s.catalogStatus === 'draft') return res.status(404).json({ message: 'Not found' });
  try {
    await Bookmark.create({ userId: req.user._id, seriesId: s._id });
  } catch (e) {
    if (e.code !== 11000) throw e;
  }
  res.json({ bookmarked: true });
});

router.delete('/:seriesId', authenticate, async (req, res) => {
  await Bookmark.deleteOne({ userId: req.user._id, seriesId: req.params.seriesId });
  res.json({ bookmarked: false });
});

module.exports = router;
