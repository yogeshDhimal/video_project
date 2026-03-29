/** Client-side checks before publishing (must match server `seriesPublishValidation`). */
export function validatePublishedSeriesFields({
  description,
  genres,
  posterPath,
  releaseYear,
}) {
  const desc = (description || '').trim();
  if (desc.length < 20) {
    return 'Description must be at least 20 characters. Add details on step 2.';
  }
  const g = Array.isArray(genres) ? genres : [];
  if (g.filter(Boolean).length === 0) {
    return 'At least one genre is required.';
  }
  const poster = (posterPath || '').trim();
  if (!poster) {
    return 'Poster file name is required — upload a poster in Media, then paste the file name on step 2.';
  }
  const y = releaseYear;
  if (y == null || y === '') {
    return 'Release year is required.';
  }
  const yr = Number(y);
  if (!Number.isFinite(yr) || yr < 1900 || yr > 2100) {
    return 'Enter a valid release year (1900–2100).';
  }
  return null;
}
