const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiters');
const { asyncHandler } = require('../middleware/asyncHandler');
const { randomToken } = require('../utils/tokens');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');
const env = require('../config/env');

const router = express.Router();

function signUser(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }),
    body('username').trim().isLength({ min: 2, max: 32 }),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, password, username } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered' });
    const verifyToken = randomToken(24);
    const user = await User.create({
      email,
      password,
      username,
      verifyToken,
      isVerified: false,
    });
    await sendVerificationEmail(email, verifyToken).catch(() => {});
    const token = signUser(user);
    const safe = user.toObject();
    delete safe.password;
    delete safe.verifyToken;
    res.status(201).json({ token, user: safe });
  })
);

router.post(
  '/login',
  authLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (user.banned) return res.status(403).json({ message: 'Account suspended', reason: user.banReason });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
    // Use updateOne instead of full save to avoid triggering pre-save hooks (issue 2.4)
    await User.updateOne({ _id: user._id }, { $set: { lastActiveAt: new Date() } });
    const token = signUser(user);
    const safe = user.toObject();
    delete safe.password;
    res.json({ token, user: safe });
  })
);

router.get('/me', authenticate, asyncHandler(async (req, res) => {
  res.json({ user: req.user });
}));

router.post('/logout', authenticate, (_req, res) => {
  res.json({ message: 'Logged out' });
});

router.post('/verify-email', authLimiter, asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: 'Token required' });
  const user = await User.findOne({ verifyToken: token }).select('+verifyToken');
  if (!user) return res.status(400).json({ message: 'Invalid token' });
  user.isVerified = true;
  user.verifyToken = undefined;
  await user.save();
  res.json({ message: 'Email verified' });
}));

router.post(
  '/forgot-password',
  authLimiter,
  [body('email').isEmail().normalizeEmail()],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const user = await User.findOne({ email: req.body.email }).select('+password');
    if (user) {
      user.resetPasswordToken = randomToken(32);
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
      await user.save();
      await sendPasswordResetEmail(user.email, user.resetPasswordToken).catch(() => {});
    }
    res.json({ message: 'If the email exists, a reset link was sent' });
  })
);

router.post(
  '/reset-password',
  authLimiter,
  [body('token').notEmpty(), body('password').isLength({ min: 8 })],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { token, password } = req.body;
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+password +resetPasswordToken +resetPasswordExpires');
    if (!user) return res.status(400).json({ message: 'Invalid or expired token' });
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    res.json({ message: 'Password updated' });
  })
);

module.exports = router;
