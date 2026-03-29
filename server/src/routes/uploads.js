const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiters');
const { uploadVideo, uploadThumb, uploadSub } = require('../config/multer');

const router = express.Router();

router.post(
  '/video',
  uploadLimiter,
  authenticate,
  requireRole('admin'),
  uploadVideo.single('video'),
  (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file' });
    res.json({
      fileName: req.file.filename,
      originalName: req.file.originalname,
      sizeBytes: req.file.size,
      mimeType: req.file.mimetype,
    });
  }
);

router.post(
  '/thumbnail',
  uploadLimiter,
  authenticate,
  requireRole('admin'),
  uploadThumb.single('thumbnail'),
  (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file' });
    res.json({ fileName: req.file.filename, originalName: req.file.originalname });
  }
);

router.post(
  '/subtitle',
  uploadLimiter,
  authenticate,
  requireRole('admin'),
  uploadSub.single('subtitle'),
  (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file' });
    const ext = req.file.originalname.toLowerCase().endsWith('.srt') ? 'srt' : 'vtt';
    res.json({ fileName: req.file.filename, originalName: req.file.originalname, format: ext });
  }
);

module.exports = router;
