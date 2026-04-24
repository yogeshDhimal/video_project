const express = require('express');
const { body, validationResult } = require('express-validator');
const Comment = require('../models/Comment');
const CommentVote = require('../models/CommentVote');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Episode = require('../models/Episode');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.get('/', optionalAuth, async (req, res) => {
  const { episodeId } = req.params;
  const allComments = await Comment.find({ episodeId }).sort({ createdAt: -1 }).lean();

  if (!allComments.length) return res.json({ comments: [] });

  const userIds = [...new Set(allComments.map(c => c.userId.toString()))];
  const users = await User.find({ _id: { $in: userIds } }).select('username avatar').lean();
  const umap = Object.fromEntries(users.map(u => [u._id.toString(), u]));

  let userVotes = {};
  if (req.user) {
    const votes = await CommentVote.find({
      userId: req.user._id,
      commentId: { $in: allComments.map(c => c._id) }
    }).lean();
    userVotes = Object.fromEntries(votes.map(v => [v.commentId.toString(), v.value]));
  }

  const { buildCommentTree } = require('../algorithms/comment-hierarchy');
  const roots = buildCommentTree(allComments, umap, userVotes);

  res.json({ comments: roots });
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
  await CommentVote.deleteMany({ commentId: c._id });
  res.json({ message: 'Deleted' });
});

router.post('/:commentId/vote', authenticate, async (req, res) => {
  const { episodeId, commentId } = req.params;
  const { value } = req.body;
  if (![1, -1].includes(value)) return res.status(400).json({ message: 'value must be 1 or -1' });

  const comment = await Comment.findOne({ _id: commentId, episodeId });
  if (!comment) return res.status(404).json({ message: 'Comment not found' });

  const existing = await CommentVote.findOne({ userId: req.user._id, commentId: comment._id });
  let deltaLikes = 0;
  let deltaDis = 0;

  if (existing) {
    if (existing.value === value) {
      await CommentVote.deleteOne({ _id: existing._id });
      if (value === 1) deltaLikes = -1;
      else deltaDis = -1;
    } else {
      existing.value = value;
      await existing.save();
      if (value === 1) {
        deltaLikes = 1;
        deltaDis = -1;
      } else {
        deltaLikes = -1;
        deltaDis = 1;
      }
    }
  } else {
    await CommentVote.create({ userId: req.user._id, commentId: comment._id, value });
    if (value === 1) deltaLikes = 1;
    else deltaDis = 1;
  }

  comment.likes = Math.max(0, (comment.likes || 0) + deltaLikes);
  comment.dislikes = Math.max(0, (comment.dislikes || 0) + deltaDis);
  await comment.save();

  const mine = await CommentVote.findOne({ userId: req.user._id, commentId: comment._id });
  res.json({
    likes: comment.likes,
    dislikes: comment.dislikes,
    userVote: mine ? mine.value : 0,
  });
});

router.post('/:commentId/report', authenticate, async (req, res) => {
  const c = await Comment.findById(req.params.commentId);
  if (!c) return res.status(404).json({ message: 'Comment not found' });
  c.isFlagged = true;
  await c.save();
  res.json({ message: 'Reported successfully' });
});

module.exports = router;
