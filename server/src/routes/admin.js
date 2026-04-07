const express = require('express');
const User = require('../models/User');
const Series = require('../models/Series');
const Episode = require('../models/Episode');
const Comment = require('../models/Comment');
const ChatMessage = require('../models/ChatMessage');
const { authenticate, requireRole } = require('../middleware/auth');
const redis = require('../utils/redis');
const DashboardStats = require('../models/DashboardStats');
const { REDIS_KEY, updateDashboardStats } = require('../jobs/dashboardStats');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.get('/dashboard', async (_req, res) => {
  try {
    // 1. Try to get from Redis first (the fastest path)
    if (redis) {
      const cached = await redis.get(REDIS_KEY);
      if (cached) {
        // console.log('[CACHE HIT] Serving from Redis');
        return res.json(JSON.parse(cached));
      }
    }

    // 2. Fallback to MongoDB DashboardStats collection
    // console.log('[CACHE MISS] Falling back to MongoDB');
    let stats = await DashboardStats.findOne().lean();

    // 3. If everything is empty (first run), trigger an update immediately
    if (!stats) {
      // console.log('[CACHE EMPTY] Triggering initial aggregation');
      stats = await updateDashboardStats();
    }

    res.json(stats);
  } catch (error) {
    console.error('Admin dashboard route error:', error);
    res.status(500).json({ message: 'Error retrieving dashboard statistics' });
  }
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

/** Moderation Endpoints */
router.delete('/moderation/comments/:id', async (req, res) => {
  await Comment.findByIdAndDelete(req.params.id);
  // Also delete all replies to this comment
  await Comment.deleteMany({ parentId: req.params.id });
  await DashboardStats.findOneAndUpdate({}, { $inc: { totalReportsResolved: 1 } }, { upsert: true });
  res.json({ message: 'Deleted' });
});

/** Moderation Endpoints */
router.get('/moderation/flags', async (req, res) => {
  const [comments, chatMessages] = await Promise.all([
    Comment.find({ isFlagged: true })
      .populate('userId', 'username email avatar')
      .populate({
        path: 'episodeId',
        select: 'title seasonId',
        populate: {
          path: 'seasonId',
          select: 'number seriesId',
          populate: { path: 'seriesId', select: 'title' }
        }
      })
      .sort({ createdAt: -1 })
      .lean(),
    ChatMessage.find({ isFlagged: true })
      .populate('userId', 'username email avatar')
      .populate({
        path: 'episodeId',
        select: 'title seasonId',
        populate: {
          path: 'seasonId',
          select: 'number seriesId',
          populate: { path: 'seriesId', select: 'title' }
        }
      })
      .populate('watchRoomId', 'title')
      .sort({ createdAt: -1 })
      .lean()
  ]);
  res.json({ comments, chatMessages });
});

router.post('/moderation/comments/:id/clear-flags', async (req, res) => {
  await Comment.findByIdAndUpdate(req.params.id, { isFlagged: false });
  await DashboardStats.findOneAndUpdate({}, { $inc: { totalReportsResolved: 1 } }, { upsert: true });
  res.json({ message: 'Flags cleared' });
});

router.post('/moderation/chat/:id/clear-flags', async (req, res) => {
  await ChatMessage.findByIdAndUpdate(req.params.id, { isFlagged: false });
  await DashboardStats.findOneAndUpdate({}, { $inc: { totalReportsResolved: 1 } }, { upsert: true });
  res.json({ message: 'Flags cleared' });
});

router.delete('/moderation/chat/:id', async (req, res) => {
  await ChatMessage.findByIdAndDelete(req.params.id);
  await DashboardStats.findOneAndUpdate({}, { $inc: { totalReportsResolved: 1 } }, { upsert: true });
  res.json({ message: 'Deleted' });
});

module.exports = router;
