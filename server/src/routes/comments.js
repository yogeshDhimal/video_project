const express = require('express');
const { body, validationResult } = require('express-validator');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Episode = require('../models/Episode');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.get('/', optionalAuth, async (req, res) => {
  const { episodeId } = req.params;
  const top = await Comment.find({ episodeId, parentId: null }).sort({ createdAt: -1 }).limit(100).lean();
  const ids = top.map((c) => c._id);
  const replies = await Comment.find({ parentId: { $in: ids } }).sort({ createdAt: 1 }).lean();
  const users = await User.find({
    _id: { $in: [...top, ...replies].map((c) => c.userId) },
  })
    .select('username avatar')
    .lean();
  const umap = Object.fromEntries(users.map((u) => [u._id.toString(), u]));
  const repByParent = {};
  replies.forEach((r) => {
    const k = r.parentId.toString();
    if (!repByParent[k]) repByParent[k] = [];
    repByParent[k].push({ ...r, user: umap[r.userId.toString()] });
  });
  res.json({
    comments: top.map((c) => ({
      ...c,
      user: umap[c.userId.toString()],
      replies: repByParent[c._id.toString()] || [],
    })),
  });
});

router.post(
  '/',
  authenticate,
  [body('body').trim().isLength({ min: 1, max: 4000 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { episodeId } = req.params;
    const ep = await Episode.findById(episodeId);
    if (!ep) return res.status(404).json({ message: 'Episode not found' });
    let parentId = null;
    if (req.body.parentId) {
      parentId = req.body.parentId;
      const parent = await Comment.findById(parentId);
      if (!parent) return res.status(400).json({ message: 'Invalid parent' });
      const parentUser = await User.findById(parent.userId);
      if (parentUser && parentUser._id.toString() !== req.user._id.toString()) {
        await Notification.create({
          userId: parent.userId,
          type: 'comment_reply',
          title: 'New reply',
          message: `${req.user.username} replied to your comment`,
          link: `/watch/${episodeId}`,
        });
      }
    }
    const c = await Comment.create({
      episodeId,
      userId: req.user._id,
      parentId,
      body: req.body.body,
    });
    const user = await User.findById(req.user._id).select('username avatar').lean();
    res.status(201).json({ comment: { ...c.toObject(), user } });
  }
);

router.delete('/:commentId', authenticate, async (req, res) => {
  const c = await Comment.findById(req.params.commentId);
  if (!c) return res.status(404).json({ message: 'Not found' });
  if (c.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  await Comment.deleteMany({ $or: [{ _id: c._id }, { parentId: c._id }] });
  res.json({ message: 'Deleted' });
});

module.exports = router;
