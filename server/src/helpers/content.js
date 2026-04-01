const Series = require('../models/Series');
const Season = require('../models/Season');
const Episode = require('../models/Episode');

async function getEpisodeChain(episodeId) {
  const ep = await Episode.findById(episodeId);
  if (!ep) return null;
  const season = await Season.findById(ep.seasonId);
  if (!season) return { episode: ep, season: null, series: null };
  const series = await Series.findById(season.seriesId);
  return { episode: ep, season, series };
}

async function listEpisodesForSeries(seriesId) {
  const seasons = await Season.find({ seriesId }).sort({ number: 1 });
  const out = [];
  for (const s of seasons) {
    const eps = await Episode.find({ seasonId: s._id }).sort({ number: 1 });
    out.push({ season: s, episodes: eps });
  }
  return out;
}

async function getNextEpisode(episodeId) {
  const { episode, season, series } = await getEpisodeChain(episodeId);
  if (!episode || !season || !series) return null;
  const nextSame = await Episode.findOne({
    seasonId: season._id,
    number: episode.number + 1,
  });
  if (nextSame) {
    const s2 = season;
    const ser = series;
    return { episode: nextSame, season: s2, series: ser };
  }
  const nextSeason = await Season.findOne({ seriesId: series._id, number: season.number + 1 });
  if (!nextSeason) return null;
  const first = await Episode.findOne({ seasonId: nextSeason._id }).sort({ number: 1 });
  if (!first) return null;
  return { episode: first, season: nextSeason, series };
}

async function getPrevEpisode(episodeId) {
  const { episode, season, series } = await getEpisodeChain(episodeId);
  if (!episode || !season || !series) return null;
  const prevSame = await Episode.findOne({
    seasonId: season._id,
    number: episode.number - 1,
  });
  if (prevSame) {
    return { episode: prevSame, season, series };
  }
  const prevSeason = await Season.findOne({ seriesId: series._id, number: season.number - 1 });
  if (!prevSeason) return null;
  const last = await Episode.findOne({ seasonId: prevSeason._id }).sort({ number: -1 });
  if (!last) return null;
  return { episode: last, season: prevSeason, series };
}

module.exports = { getEpisodeChain, listEpisodesForSeries, getNextEpisode, getPrevEpisode };
