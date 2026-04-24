const express = require('express');
const User = require('../models/User');
const Episode = require('../models/Episode');
const Series = require('../models/Series');
const AnalyticsSession = require('../models/AnalyticsSession');
const Comment = require('../models/Comment');
const DashboardStats = require('../models/DashboardStats');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, requireRole('admin'));

router.get('/growth', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const growth = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          newUsers: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(growth);
  } catch (error) {
    console.error('Analytics growth error:', error);
    res.status(500).json({ message: 'Error fetching growth analytics' });
  }
});

router.get('/popularity', async (req, res) => {
  try {
    const topSeries = await Series.find()
      .sort({ totalViews: -1 })
      .limit(5)
      .select('title totalViews')
      .lean();

    res.json(topSeries);
  } catch (error) {
    console.error('Analytics popularity error:', error);
    res.status(500).json({ message: 'Error fetching popularity analytics' });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const [userCount, seriesCount, watchData, commentCount, reportCount, stats] = await Promise.all([
      User.countDocuments(),
      Series.countDocuments(),
      AnalyticsSession.aggregate([
        { $group: { _id: null, totalSeconds: { $sum: '$totalWatchSeconds' } } }
      ]),
      Comment.countDocuments(),
      Comment.countDocuments({ isFlagged: true }),
      DashboardStats.findOne().lean()
    ]);

    const totalHours = Math.round((watchData[0]?.totalSeconds || 0) / 3600);

    res.json({
      totalUsers: userCount,
      totalSeries: seriesCount,
      totalHours,
      totalComments: commentCount,
      pendingReports: reportCount,
      totalReportsResolved: stats?.totalReportsResolved || 0
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ message: 'Error fetching summary analytics' });
  }
});

router.get('/genres', async (req, res) => {
  try {
    const genres = await Series.aggregate([
      { $unwind: '$genres' },
      { $group: { _id: '$genres', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    res.json(genres.map(g => ({ name: g._id, value: g.count })));
  } catch (error) {
    console.error('Analytics genres error:', error);
    res.status(500).json({ message: 'Error fetching genre analytics' });
  }
});

router.get('/watchtime', async (req, res) => {
  try {
    const leaderboard = await AnalyticsSession.aggregate([
      {
        $group: {
          _id: '$episodeId',
          totalSeconds: { $sum: '$totalWatchSeconds' }
        }
      },
      {
        $lookup: {
          from: 'episodes',
          localField: '_id',
          foreignField: '_id',
          as: 'episode'
        }
      },
      { $unwind: '$episode' },
      {
        $lookup: {
          from: 'series',
          localField: 'episode.seasonId',
          foreignField: '_id',
          as: 'series_lookup'
        }
      },
      {
        $group: {
          _id: '$episode.title',
          hours: { $sum: { $divide: ['$totalSeconds', 3600] } }
        }
      },
      { $sort: { hours: -1 } },
      { $limit: 5 }
    ]);
    res.json(leaderboard.map(l => ({ title: l._id, hours: Math.round(l.hours * 10) / 10 })));
  } catch (error) {
    console.error('Analytics watchtime error:', error);
    res.status(500).json({ message: 'Error fetching watchtime analytics' });
  }
});

module.exports = router;
