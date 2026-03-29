const express = require('express');
const Season = require('../models/Season');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/:id', async (req, res) => {
  const s = await Season.findById(req.params.id);
  if (!s) return res.status(404).json({ message: 'Not found' });
  res.json({ season: s });
});

router.patch('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const s = await Season.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
  if (!s) return res.status(404).json({ message: 'Not found' });
  res.json({ season: s });
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const Episode = require('../models/Episode');
  const s = await Season.findByIdAndDelete(req.params.id);
  if (!s) return res.status(404).json({ message: 'Not found' });
  await Episode.deleteMany({ seasonId: s._id });
  res.json({ message: 'Deleted' });
});

module.exports = router;
