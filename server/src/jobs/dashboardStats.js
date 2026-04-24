const cron = require('node-cron');
const User = require('../models/User');
const Series = require('../models/Series');
const Episode = require('../models/Episode');
const DashboardStats = require('../models/DashboardStats');
const redis = require('../utils/redis');

const REDIS_KEY = 'admin:dashboard_stats';

async function updateDashboardStats() {
  try {
    const [users, series, episodes, viewsAgg, draftSeries] = await Promise.all([
      User.countDocuments(),
      Series.countDocuments(),
      Episode.countDocuments(),
      Episode.aggregate([{ $group: { _id: null, v: { $sum: '$views' } } }]),
      Series.countDocuments({ catalogStatus: 'draft' }),
    ]);

    const totalViews = viewsAgg[0]?.v || 0;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers = await User.countDocuments({ lastActiveAt: { $gte: weekAgo } });

    const statsData = {
      totalUsers: users,
      totalSeries: series,
      totalEpisodes: episodes,
      totalViews,
      activeUsersLast7Days: activeUsers,
      draftSeries,
      lastUpdated: new Date(),
    };

    await DashboardStats.findOneAndUpdate({}, statsData, { upsert: true, new: true });

    if (redis) {
      await redis.set(REDIS_KEY, JSON.stringify(statsData), 'EX', 3600);
    }

    return statsData;
  } catch (error) {
    console.error('Error updating dashboard stats:', error);
  }
}

cron.schedule('*/15 * * * *', updateDashboardStats);

module.exports = { updateDashboardStats, REDIS_KEY };
