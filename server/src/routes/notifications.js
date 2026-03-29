const express = require('express');
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  const items = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50).lean();
  res.json({ items });
});

router.post('/:id/read', authenticate, async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, userId: req.user._id }, { $set: { read: true } });
  res.json({ ok: true });
});

router.post('/read-all', authenticate, async (req, res) => {
  await Notification.updateMany({ userId: req.user._id }, { $set: { read: true } });
  res.json({ ok: true });
});

module.exports = router;
