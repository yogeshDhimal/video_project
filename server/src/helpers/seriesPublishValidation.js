/**
 * Required fields before a series can be published (visible in the public catalog).
 */
function validatePublishedSeriesDoc(doc) {
  const desc = (doc.description || '').trim();
  if (desc.length < 20) {
    return 'Description must be at least 20 characters. Add details on step 2.';
  }
  const genres = doc.genres || [];
  if (!Array.isArray(genres) || genres.filter(Boolean).length === 0) {
    return 'At least one genre is required.';
  }
  const poster = (doc.posterPath || '').trim();
  if (!poster) {
    return 'Poster file name is required — upload a poster in Media, then paste the file name on step 2.';
  }
  const y = doc.releaseYear;
  if (y == null || y === '') {
    return 'Release year is required.';
  }
  const yr = Number(y);
  if (!Number.isFinite(yr) || yr < 1900 || yr > 2100) {
    return 'Enter a valid release year (1900–2100).';
  }
  return null;
}

module.exports = { validatePublishedSeriesDoc };
