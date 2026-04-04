const express = require('express');
const { body, validationResult } = require('express-validator');
const WatchRoom = require('../models/WatchRoom');
const Episode = require('../models/Episode');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();

// Fixed: added limit() to prevent unbounded result sets (issue 2.8)
router.get('/', optionalAuth, asyncHandler(async (req, res) => {
  const active = await WatchRoom.find({ status: 'active' })
    .populate('hostId', 'username avatar')
    .populate({
      path: 'episodes',
      populate: { path: 'seasonId', populate: { path: 'seriesId', select: 'title' } }
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  const scheduled = await WatchRoom.find({ status: 'scheduled', scheduledStartTime: { $ne: null } })
    .populate('hostId', 'username avatar')
    .populate({
      path: 'episodes',
      populate: { path: 'seasonId', populate: { path: 'seriesId', select: 'title' } }
    })
    .sort({ scheduledStartTime: 1 })
    .limit(50)
    .lean();

  res.json({ active, scheduled });
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  const rooms = await WatchRoom.find({ hostId: req.user._id })
    .populate({
      path: 'episodes',
      populate: { path: 'seasonId', populate: { path: 'seriesId', select: 'title' } }
    })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
  res.json({ rooms });
}));

router.get('/:id', optionalAuth, asyncHandler(async (req, res) => {
  const room = await WatchRoom.findById(req.params.id)
    .populate('hostId', 'username avatar')
    .populate({
      path: 'episodes',
      populate: { path: 'seasonId', populate: { path: 'seriesId', select: 'title posterPath' } }
    })
    .lean();
  if (!room) return res.status(404).json({ message: 'Room not found' });
  res.json({ room });
}));

router.post(
  '/',
  authenticate,
  [
    body('title').trim().isLength({ min: 1, max: 100 }),
    body('episodes').isArray({ min: 1, max: 10 }),
    body('scheduledStartTime').optional({ nullable: true }).isISO8601(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const episodes = await Episode.find({ _id: { $in: req.body.episodes } });
    if (episodes.length !== req.body.episodes.length) {
      return res.status(400).json({ message: 'Invalid episode ID(s) provided' });
    }

    const { title, scheduledStartTime } = req.body;
    let status = scheduledStartTime ? 'scheduled' : 'active';
    let isPlaying = status === 'active';
    let playbackUpdatedAt = status === 'active' ? new Date() : null;

    const room = await WatchRoom.create({
      hostId: req.user._id,
      title,
      episodes: req.body.episodes,
      scheduledStartTime: scheduledStartTime || null,
      status,
      isPlaying,
      currentVideoTime: 0,
      playbackUpdatedAt,
    });

    res.status(201).json({ room });
  })
);

router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const room = await WatchRoom.findById(req.params.id);
  if (!room) return res.status(404).json({ message: 'Not found' });
  if (room.hostId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  await WatchRoom.deleteOne({ _id: room._id });
  res.json({ message: 'Deleted' });
}));

module.exports = router;
