const express = require('express');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { uploadAvatar } = require('../config/multer');
const { AVATARS } = require('../config/paths');

const router = express.Router();

router.patch(
  '/profile',
  authenticate,
  [body('username').optional().trim().isLength({ min: 2, max: 32 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    if (req.body.username) req.user.username = req.body.username;
    if (Array.isArray(req.body.preferredGenres)) {
      req.user.preferredGenres = req.body.preferredGenres.slice(0, 20);
    }
    await req.user.save();
    res.json({ user: req.user });
  }
);

router.post('/avatar', authenticate, uploadAvatar.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file' });
  if (req.user.avatar) {
    const old = path.join(AVATARS, path.basename(req.user.avatar));
    if (fs.existsSync(old)) fs.unlinkSync(old);
  }
  req.user.avatar = req.file.filename;
  await req.user.save();
  res.json({ user: req.user });
});

router.post(
  '/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  }
);

router.put(
  '/settings',
  authenticate,
  async (req, res) => {
    if (typeof req.body.watchHistoryPaused === 'boolean') {
      req.user.watchHistoryPaused = req.body.watchHistoryPaused;
      await req.user.save();
    }
    res.json({ user: req.user });
  }
);

router.put(
  '/email',
  authenticate,
  [
    body('email').isEmail().withMessage('Please provide a valid email'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      req.user.email = req.body.email;
      await req.user.save();
      res.json({ user: req.user, message: 'Email updated successfully' });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({ message: 'Email is already in use by another account' });
      }
      res.status(500).json({ message: 'Failed to update email' });
    }
  }
);

router.get('/:id/public', async (req, res) => {
  const u = await User.findById(req.params.id).select('username avatar createdAt');
  if (!u) return res.status(404).json({ message: 'Not found' });
  res.json({ user: u });
});

module.exports = router;
