const mongoose = require('mongoose');
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
  const seasons = await Season.find({ seriesId }).sort({ number: 1 }).lean();
  const seasonIds = seasons.map((s) => s._id);
  const allEps = await Episode.find({ seasonId: { $in: seasonIds } })
    .sort({ number: 1 })
    .lean();

  const epMap = {};
  allEps.forEach((ep) => {
    const sid = ep.seasonId.toString();
    if (!epMap[sid]) epMap[sid] = [];
    epMap[sid].push(ep);
  });

  return seasons.map((s) => ({
    season: s,
    episodes: epMap[s._id.toString()] || [],
  }));
}

async function getNextEpisode(episodeId) {
  const { episode, season, series } = await getEpisodeChain(episodeId);
  if (!episode || !season || !series) return null;
  const nextSame = await Episode.findOne({
    seasonId: season._id,
    number: episode.number + 1,
  });
  if (nextSame) {
    return { episode: nextSame, season, series };
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

async function updateRatings(episodeId) {
  const Rating = require('../models/Rating');
  const Episode = require('../models/Episode');
  const Season = require('../models/Season');
  const Series = require('../models/Series');

  const stats = await Rating.aggregate([
    { $match: { episodeId: new mongoose.Types.ObjectId(episodeId) } },
    { $group: { _id: '$episodeId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const episode = await Episode.findById(episodeId);
  if (!episode) return;

  if (stats.length > 0) {
    episode.ratingAvg = stats[0].avg;
    episode.totalRatings = stats[0].count;
  } else {
    episode.ratingAvg = 0;
    episode.totalRatings = 0;
  }
  await episode.save();

  const season = await Season.findById(episode.seasonId);
  if (!season) return;

  const seasons = await Season.find({ seriesId: season.seriesId }).select('_id');
  const sIds = seasons.map((s) => s._id);

  const seriesStats = await Episode.aggregate([
    { $match: { seasonId: { $in: sIds }, ratingAvg: { $gt: 0 } } },
    { $group: { _id: null, avg: { $avg: '$ratingAvg' } } },
  ]);

  const seriesAvg = seriesStats.length > 0 ? seriesStats[0].avg : 0;
  await Series.findByIdAndUpdate(season.seriesId, { ratingAvg: seriesAvg });
}

module.exports = {
  getEpisodeChain,
  listEpisodesForSeries,
  getNextEpisode,
  getPrevEpisode,
  updateRatings,
};
