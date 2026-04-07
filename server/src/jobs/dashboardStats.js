const cron = require('node-cron');
const User = require('../models/User');
const Series = require('../models/Series');
const Episode = require('../models/Episode');
const DashboardStats = require('../models/DashboardStats');
const redis = require('../utils/redis');

const REDIS_KEY = 'admin:dashboard_stats';

/**
 * Runs the heavy aggregation logic and saves the results to MongoDB and Redis.
 */
async function updateDashboardStats() {
  console.log('--- [CRON] Starting Dashboard Stats Aggregation ---');
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

    // 1. Keep a persistent history in MongoDB (or update the latest)
    await DashboardStats.findOneAndUpdate({}, statsData, { upsert: true, new: true });

    // 2. Cache in Redis for ultra-fast access (expires in 1 hour just in case)
    if (redis) {
      await redis.set(REDIS_KEY, JSON.stringify(statsData), 'EX', 3600);
    }

    console.log('--- [CRON] Dashboard Stats Updated Successfully ---');
    return statsData;
  } catch (error) {
    console.error('--- [CRON] Error updating dashboard stats:', error);
  }
}

// Schedule the job to run every 15 minutes
// Format: minute hour day-of-month month day-of-week
cron.schedule('*/15 * * * *', updateDashboardStats);

module.exports = { updateDashboardStats, REDIS_KEY };
