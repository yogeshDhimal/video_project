const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

module.exports = {
  ROOT,
  VIDEOS: path.join(ROOT, 'videos'),
  THUMBNAILS: path.join(ROOT, 'thumbnails'),
  SUBTITLES: path.join(ROOT, 'subtitles'),
  AVATARS: path.join(ROOT, 'avatars'),
  HLS: path.join(ROOT, 'hls'),
};
