const express = require('express');
const { body, validationResult } = require('express-validator');
const AnalyticsSession = require('../models/AnalyticsSession');
const Episode = require('../models/Episode');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/session',
  optionalAuth,
  [
    body('episodeId').notEmpty(),
    body('sessionId').isString(),
    body('positionSeconds').isFloat({ min: 0 }),
    body('deltaSeconds').optional().isFloat({ min: 0 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const ep = await Episode.findById(req.body.episodeId);
    if (!ep) return res.status(404).json({ message: 'Not found' });

    const userId = req.user ? req.user._id : null;
    let session = await AnalyticsSession.findOne({ episodeId: ep._id, sessionId: req.body.sessionId });
    if (!session) {
      session = await AnalyticsSession.create({
        episodeId: ep._id,
        userId,
        sessionId: req.body.sessionId,
        checkpoints: [],
        maxPositionSeconds: 0,
        totalWatchSeconds: 0,
      });
    }
    const pos = req.body.positionSeconds;
    session.checkpoints.push({ positionSeconds: pos });
    if (session.checkpoints.length > 200) session.checkpoints = session.checkpoints.slice(-200);
    session.maxPositionSeconds = Math.max(session.maxPositionSeconds, pos);
    session.totalWatchSeconds += req.body.deltaSeconds || 0;
    await session.save();
    res.json({ ok: true });
  }
);

router.get('/dropoff/:episodeId', authenticate, async (req, res) => {
  const ep = await Episode.findById(req.params.episodeId);
  if (!ep) return res.status(404).json({ message: 'Not found' });
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
  const sessions = await AnalyticsSession.find({ episodeId: ep._id }).lean();
  const buckets = {};
  sessions.forEach((s) => {
    const p = Math.floor((s.maxPositionSeconds || 0) / 30);
    buckets[p] = (buckets[p] || 0) + 1;
  });
  res.json({ episodeId: ep._id, buckets, sessions: sessions.length });
});

module.exports = router;
