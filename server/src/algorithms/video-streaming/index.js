/**
 * Algorithm: Video Streaming Chunk Calculator
 * Purpose: Content segmentation for HTTP Range Requests
 * Why Important: Smooth playback, less server load, enables skipping
 */
function calculateVideoRange(rangeHeader, fileSize) {
  if (!rangeHeader) return null;

  const parts = rangeHeader.replace(/bytes=/, '').split('-');
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

  if (Number.isNaN(start) || start >= fileSize || end < start) {
    return { error: 'Range Not Satisfiable', fileSize };
  }

  const chunkSize = end - start + 1;
  return { start, end, chunkSize, fileSize };
}

module.exports = { calculateVideoRange };
