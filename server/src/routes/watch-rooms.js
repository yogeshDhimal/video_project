const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const WatchRoom = require('../models/WatchRoom');
const Episode = require('../models/Episode');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();

const authorizedUsers = {};

function authorizeUser(roomId, userId) {
  if (!authorizedUsers[roomId]) authorizedUsers[roomId] = new Set();
  authorizedUsers[roomId].add(userId.toString());
}

function isUserAuthorized(roomId, userId) {
  return authorizedUsers[roomId]?.has(userId.toString()) || false;
}

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

  const userId = req.user?._id?.toString();
  const hostId = room.hostId?._id?.toString() || room.hostId?.toString();
  const isHost = userId && userId === hostId;

  if (room.visibility === 'private' && !isHost && !isUserAuthorized(req.params.id, userId || '')) {
    return res.json({
      room: {
        _id: room._id,
        title: room.title,
        hostId: room.hostId,
        visibility: room.visibility,
        status: room.status,
        episodes: room.episodes,
        requiresPin: true,
      }
    });
  }

  res.json({ room });
}));

router.post('/:id/join', authenticate, asyncHandler(async (req, res) => {
  const room = await WatchRoom.findById(req.params.id).select('+pin');
  if (!room) return res.status(404).json({ message: 'Room not found' });

  if (room.visibility !== 'private') {
    return res.json({ authorized: true });
  }

  if (room.hostId.toString() === req.user._id.toString()) {
    authorizeUser(room._id.toString(), req.user._id);
    return res.json({ authorized: true });
  }

  const { pin } = req.body;
  if (!pin) return res.status(400).json({ message: 'PIN is required' });

  const match = await bcrypt.compare(pin, room.pin);
  if (!match) return res.status(401).json({ message: 'Incorrect PIN' });

  authorizeUser(room._id.toString(), req.user._id);
  res.json({ authorized: true });
}));

router.post(
  '/',
  authenticate,
  [
    body('title').trim().isLength({ min: 1, max: 100 }),
    body('episodes').isArray({ min: 1, max: 10 }),
    body('scheduledStartTime').optional({ nullable: true }).isISO8601(),
    body('visibility').optional().isIn(['public', 'private']),
    body('pin').optional().matches(/^\d{4}$/).withMessage('PIN must be exactly 4 digits'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const episodes = await Episode.find({ _id: { $in: req.body.episodes } });
    if (episodes.length !== req.body.episodes.length) {
      return res.status(400).json({ message: 'Invalid episode ID(s) provided' });
    }

    const { title, scheduledStartTime, visibility, pin } = req.body;

    if (visibility === 'private' && !pin) {
      return res.status(400).json({ message: 'Private rooms require a 4-digit PIN' });
    }

    let hashedPin = null;
    if (visibility === 'private' && pin) {
      const salt = await bcrypt.genSalt(10);
      hashedPin = await bcrypt.hash(pin, salt);
    }

    let status = scheduledStartTime ? 'scheduled' : 'active';
    let isPlaying = status === 'active';
    let playbackUpdatedAt = status === 'active' ? new Date() : null;

    const room = await WatchRoom.create({
      hostId: req.user._id,
      title,
      episodes: req.body.episodes,
      scheduledStartTime: scheduledStartTime || null,
      status,
      visibility: visibility || 'public',
      pin: hashedPin,
      isPlaying,
      currentVideoTime: 0,
      playbackUpdatedAt,
    });

    if (visibility === 'private') {
      authorizeUser(room._id.toString(), req.user._id);
    }

    res.status(201).json({ room });
  })
);

router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const room = await WatchRoom.findById(req.params.id);
  if (!room) return res.status(404).json({ message: 'Not found' });
  if (room.hostId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden' });
  }
  delete authorizedUsers[room._id.toString()];
  await WatchRoom.deleteOne({ _id: room._id });
  res.json({ message: 'Deleted' });
}));

router.authorizedUsers = authorizedUsers;
router.isUserAuthorized = isUserAuthorized;
router.authorizeUser = authorizeUser;

module.exports = router;
