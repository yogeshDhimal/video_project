const express = require('express');
const path = require('path');
const fs = require('fs');
const Episode = require('../models/Episode');
const Season = require('../models/Season');
const Series = require('../models/Series');
const { authenticate } = require('../middleware/auth');
const { streamLimiter } = require('../middleware/rateLimiters');
const { sendVideoRange, resolveVideoPath } = require('../services/streamService');
const { SUBTITLES, THUMBNAILS } = require('../config/paths');

const router = express.Router();

async function assertEpisodePlayable(ep, user) {
  const season = await Season.findById(ep.seasonId);
  if (!season) return false;
  const series = await Series.findById(season.seriesId).lean();
  if (!series) return false;
  if (series.catalogStatus === 'draft' && user?.role !== 'admin') return false;
  return true;
}

router.get('/episode/:episodeId/quality/:qualityKey', streamLimiter, authenticate, async (req, res) => {
  const ep = await Episode.findById(req.params.episodeId);
  if (!ep) return res.status(404).json({ message: 'Episode not found' });
  if (!(await assertEpisodePlayable(ep, req.user))) return res.status(404).json({ message: 'Not found' });
  const q = ep.qualities.find((x) => x.key === req.params.qualityKey);
  if (!q) return res.status(404).json({ message: 'Quality not found' });
  const abs = resolveVideoPath(q.fileName);
  if (!abs || !fs.existsSync(abs)) return res.status(404).json({ message: 'File missing' });
  try {
    await sendVideoRange(req, res, abs);
  } catch (e) {
    if (!res.headersSent) res.status(500).end();
  }
});

/** Optional HLS: use quality.hlsManifestRelative; serve with GET /api/stream/hls-file (see streamService.resolveHlsPath). */

router.get('/subtitle/:episodeId/:fileName', streamLimiter, authenticate, async (req, res) => {
  const ep = await Episode.findById(req.params.episodeId);
  if (!ep) return res.status(404).json({ message: 'Not found' });
  if (!(await assertEpisodePlayable(ep, req.user))) return res.status(404).json({ message: 'Not found' });
  const sub = ep.subtitles.find((s) => s.fileName === req.params.fileName);
  if (!sub) return res.status(404).json({ message: 'Not found' });
  if (req.params.fileName.includes('..')) return res.status(400).end();
  const abs = path.join(SUBTITLES, path.basename(req.params.fileName));
  if (!fs.existsSync(abs)) return res.status(404).end();
  res.setHeader('Content-Type', sub.format === 'srt' ? 'text/plain' : 'text/vtt');
  fs.createReadStream(abs).pipe(res);
});

router.get('/thumbnail/:episodeId', streamLimiter, async (req, res) => {
  const ep = await Episode.findById(req.params.episodeId);
  if (!ep || !ep.thumbnailPath) return res.status(404).end();
  if (!(await assertEpisodePlayable(ep, req.user))) return res.status(404).end();
  const abs = path.join(THUMBNAILS, path.basename(ep.thumbnailPath));
  if (!fs.existsSync(abs)) return res.status(404).end();
  res.setHeader('Content-Type', 'image/jpeg');
  fs.createReadStream(abs).pipe(res);
});

async function assertSeriesPlayable(series, user) {
  if (series.catalogStatus === 'draft' && user?.role !== 'admin') return false;
  return true;
}

router.get('/series/:seriesId/video', streamLimiter, authenticate, async (req, res) => {
  const s = await Series.findById(req.params.seriesId);
  if (!s || !s.videoFile) return res.status(404).json({ message: 'Not found' });
  if (!(await assertSeriesPlayable(s, req.user))) return res.status(404).json({ message: 'Not found' });
  const abs = resolveVideoPath(s.videoFile);
  if (!abs || !fs.existsSync(abs)) return res.status(404).json({ message: 'File missing' });
  try {
    await sendVideoRange(req, res, abs);
  } catch (e) {
    if (!res.headersSent) res.status(500).end();
  }
});

router.get('/series/:seriesId/subtitle/:fileName', streamLimiter, authenticate, async (req, res) => {
  const s = await Series.findById(req.params.seriesId);
  if (!s || !s.subtitleFile) return res.status(404).json({ message: 'Not found' });
  if (!(await assertSeriesPlayable(s, req.user))) return res.status(404).json({ message: 'Not found' });
  if (req.params.fileName.includes('..')) return res.status(400).end();
  const abs = path.join(SUBTITLES, path.basename(req.params.fileName));
  if (!fs.existsSync(abs)) return res.status(404).end();
  const ext = s.subtitleFile.toLowerCase().endsWith('.srt') ? 'srt' : 'vtt';
  res.setHeader('Content-Type', ext === 'srt' ? 'text/plain' : 'text/vtt');
  fs.createReadStream(abs).pipe(res);
});

router.get('/series/:seriesId/thumbnail', streamLimiter, async (req, res) => {
  const s = await Series.findById(req.params.seriesId);
  if (!s || !s.thumbnailPath) return res.status(404).end();
  if (!(await assertSeriesPlayable(s, req.user))) return res.status(404).end();
  const abs = path.join(THUMBNAILS, path.basename(s.thumbnailPath));
  if (!fs.existsSync(abs)) return res.status(404).end();
  res.setHeader('Content-Type', 'image/jpeg');
  fs.createReadStream(abs).pipe(res);
});

module.exports = router;
