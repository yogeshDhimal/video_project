const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { VIDEOS, THUMBNAILS, SUBTITLES, AVATARS, HLS } = require('./paths');

function ensureDirs() {
  [VIDEOS, THUMBNAILS, SUBTITLES, AVATARS, HLS].forEach((d) => {
    fs.mkdirSync(d, { recursive: true });
  });
}

/** Preserves the original filename (sanitized). If the file already exists, appends _1, _2, … */
function uniqueSafeName(original, destDir) {
  ensureDirs();
  const ext = path.extname(original || '').toLowerCase();
  let stem = path
    .basename(original || 'file', ext || '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  if (!stem) stem = 'file';
  if (stem.length > 80) stem = stem.slice(0, 80);
  const extUse = ext || '.bin';
  let candidate = `${stem}${extUse}`;
  let n = 0;
  while (fs.existsSync(path.join(destDir, candidate))) {
    n += 1;
    candidate = `${stem}_${n}${extUse}`;
  }
  return candidate;
}

const videoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, VIDEOS),
  filename: (_req, file, cb) => cb(null, uniqueSafeName(file.originalname, VIDEOS)),
});

const thumbStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, THUMBNAILS),
  filename: (_req, file, cb) => cb(null, uniqueSafeName(file.originalname, THUMBNAILS)),
});

const subStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, SUBTITLES),
  filename: (_req, file, cb) => cb(null, uniqueSafeName(file.originalname, SUBTITLES)),
});

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, AVATARS),
  filename: (_req, file, cb) => cb(null, uniqueSafeName(file.originalname, AVATARS)),
});

const videoFilter = (_req, file, cb) => {
  const ok = /\.(mp4|mkv|webm)$/i.test(file.originalname);
  cb(ok ? null : new Error('Only MP4, MKV, WebM allowed'), ok);
};

const imageFilter = (_req, file, cb) => {
  const ok = /\.(jpe?g|png|gif|webp)$/i.test(file.originalname);
  cb(ok ? null : new Error('Only image files allowed'), ok);
};

const subFilter = (_req, file, cb) => {
  const ok = /\.(vtt|srt)$/i.test(file.originalname);
  cb(ok ? null : new Error('Only VTT or SRT allowed'), ok);
};

module.exports = {
  ensureDirs,
  uniqueSafeName,
  uploadVideo: multer({ storage: videoStorage, limits: { fileSize: 15 * 1024 * 1024 * 1024 }, fileFilter: videoFilter }),
  uploadThumb: multer({ storage: thumbStorage, limits: { fileSize: 20 * 1024 * 1024 }, fileFilter: imageFilter }),
  uploadSub: multer({ storage: subStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: subFilter }),
  uploadAvatar: multer({ storage: avatarStorage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: imageFilter }),
};
