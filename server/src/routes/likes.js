const express = require('express');
const Like = require('../models/Like');
const Episode = require('../models/Episode');
const Series = require('../models/Series');
const Season = require('../models/Season');
const { authenticate } = require('../middleware/auth');
const { trendingScoreRaw, engagementScore } = require('../algorithms');

const router = express.Router({ mergeParams: true });

async function recomputeEpisode(epId) {
  const ep = await Episode.findById(epId);
  if (!ep) return;
  const likes = ep.likes || 0;
  const dislikes = ep.dislikes || 0;
  const views = ep.views || 0;
  ep.engagementScore = engagementScore({
    likes,
    dislikes,
    views,
    completionRatio: likes / (likes + dislikes + 1),
  });
  ep.trendingScore = trendingScoreRaw(views, likes, ep.recentViews);
  await ep.save();
  const season = await Season.findById(ep.seasonId);
  if (season) {
    const seasonIds = await Season.find({ seriesId: season.seriesId }).distinct('_id');
    const agg = await Episode.aggregate([
      { $match: { seasonId: { $in: seasonIds } } },
      { $group: { _id: null, likes: { $sum: '$likes' } } },
    ]);
    const totalLikes = agg[0]?.likes || 0;
    await Series.updateOne({ _id: season.seriesId }, { $set: { totalLikes } });
  }
}

router.post('/', authenticate, async (req, res) => {
  const { episodeId } = req.params;
  const { value } = req.body;
  if (![1, -1].includes(value)) return res.status(400).json({ message: 'value must be 1 or -1' });
  const ep = await Episode.findById(episodeId);
  if (!ep) return res.status(404).json({ message: 'Not found' });

  const existing = await Like.findOne({ userId: req.user._id, episodeId: ep._id });
  let deltaLikes = 0;
  let deltaDis = 0;
  if (existing) {
    if (existing.value === value) {
      await Like.deleteOne({ _id: existing._id });
      if (value === 1) deltaLikes = -1;
      else deltaDis = -1;
    } else {
      existing.value = value;
      await existing.save();
      if (value === 1) {
        deltaLikes = 1;
        deltaDis = -1;
      } else {
        deltaLikes = -1;
        deltaDis = 1;
      }
    }
  } else {
    await Like.create({ userId: req.user._id, episodeId: ep._id, value });
    if (value === 1) deltaLikes = 1;
    else deltaDis = 1;
  }

  ep.likes = Math.max(0, ep.likes + deltaLikes);
  ep.dislikes = Math.max(0, ep.dislikes + deltaDis);
  await ep.save();
  await recomputeEpisode(ep._id);

  const mine = await Like.findOne({ userId: req.user._id, episodeId: ep._id });
  res.json({
    likes: ep.likes,
    dislikes: ep.dislikes,
    userVote: mine ? mine.value : 0,
  });
});

router.get('/me', authenticate, async (req, res) => {
  const { episodeId } = req.params;
  const mine = await Like.findOne({ userId: req.user._id, episodeId });
  res.json({ userVote: mine ? mine.value : 0 });
});

module.exports = { router, recomputeEpisode };
