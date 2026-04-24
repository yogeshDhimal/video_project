const fs = require('fs');
const path = require('path');
const { VIDEOS, HLS } = require('../config/paths');
const { calculateVideoRange } = require('../algorithms/video-streaming');

function sendVideoRange(req, res, absoluteFilePath) {
  return new Promise((resolve, reject) => {
    fs.stat(absoluteFilePath, (err, stat) => {
      if (err || !stat.isFile()) {
        res.status(404).end();
        return resolve();
      }
      const fileSize = stat.size;
      const range = req.headers.range;

      const ext = path.extname(absoluteFilePath).toLowerCase();
      const mime =
        ext === '.mkv'
          ? 'video/x-matroska'
          : ext === '.webm'
            ? 'video/webm'
            : 'video/mp4';

      if (range) {
        const rangeData = calculateVideoRange(range, fileSize);
        if (rangeData && rangeData.error) {
          res.status(416).set('Content-Range', `bytes */${fileSize}`).end();
          return resolve();
        }
        const { start, end, chunkSize } = rangeData;
        res.status(206);
        res.set({
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize,
          'Content-Type': mime,
          'Cache-Control': 'public, max-age=0',
        });
        const stream = fs.createReadStream(absoluteFilePath, { start, end });
        res.on('close', () => { stream.destroy(); resolve(); });
        stream.on('error', (err) => {
          if (err.code === 'ECONNRESET' || err.code === 'ERR_STREAM_DESTROYED') return resolve();
          if (!res.headersSent) res.status(500).end();
          reject(err);
        });
        stream.pipe(res);
        stream.on('end', () => resolve());
      } else {
        res.set({
          'Content-Length': fileSize,
          'Content-Type': mime,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=0',
        });
        const stream = fs.createReadStream(absoluteFilePath);
        res.on('close', () => { stream.destroy(); resolve(); });
        stream.on('error', (err) => {
          if (err.code === 'ECONNRESET' || err.code === 'ERR_STREAM_DESTROYED') return resolve();
          if (!res.headersSent) res.status(500).end();
          reject(err);
        });
        stream.pipe(res);
        stream.on('end', () => resolve());
      }
    });
  });
}

function resolveVideoPath(fileName) {
  if (!fileName || fileName.includes('..') || path.isAbsolute(fileName)) {
    return null;
  }
  const abs = path.join(VIDEOS, fileName);
  const resolved = path.resolve(abs);
  const root = path.resolve(VIDEOS);
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

function resolveHlsPath(relativeManifest) {
  if (!relativeManifest || relativeManifest.includes('..')) return null;
  const abs = path.join(HLS, relativeManifest);
  const resolved = path.resolve(abs);
  const root = path.resolve(HLS);
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

module.exports = { sendVideoRange, resolveVideoPath, resolveHlsPath, VIDEOS, HLS };
