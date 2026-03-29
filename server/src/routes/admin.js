const express = require('express');
const User = require('../models/User');
const Series = require('../models/Series');
const Episode = require('../models/Episode');
const Comment = require('../models/Comment');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.get('/dashboard', async (_req, res) => {
  const [users, series, episodes, viewsAgg, draftSeries] = await Promise.all([
    User.countDocuments(),
    Series.countDocuments(),
    Episode.countDocuments(),
    Episode.aggregate([{ $group: { _id: null, v: { $sum: '$views' } } }]),
    Series.countDocuments({ catalogStatus: 'draft' }),
  ]);
  const totalViews = viewsAgg[0]?.v || 0;
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const activeUsers = await User.countDocuments({ lastActiveAt: { $gte: weekAgo } });
  res.json({
    totalUsers: users,
    totalSeries: series,
    totalEpisodes: episodes,
    totalViews,
    activeUsersLast7Days: activeUsers,
    draftSeries,
  });
});

router.get('/users', async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 30;
  const [items, total] = await Promise.all([
    User.find()
      .select('-password -verifyToken -resetPasswordToken')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(),
  ]);
  res.json({ items, total, page, limit });
});

router.patch('/users/:id/ban', async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ message: 'Not found' });
  u.banned = !!req.body.banned;
  u.banReason = req.body.reason || '';
  await u.save();
  res.json({ user: u });
});

router.patch('/users/:id/role', async (req, res) => {
  const u = await User.findById(req.params.id);
  if (!u) return res.status(404).json({ message: 'Not found' });
  if (['user', 'admin'].includes(req.body.role)) u.role = req.body.role;
  await u.save();
  res.json({ user: u });
});

router.delete('/comments/:id', async (req, res) => {
  await Comment.findByIdAndDelete(req.params.id);
  await Comment.deleteMany({ parentId: req.params.id });
  res.json({ message: 'Deleted' });
});

module.exports = router;
