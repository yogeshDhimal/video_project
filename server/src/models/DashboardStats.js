const mongoose = require('mongoose');

const dashboardStatsSchema = new mongoose.Schema(
  {
    totalUsers: { type: Number, default: 0 },
    totalSeries: { type: Number, default: 0 },
    totalEpisodes: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    activeUsersLast7Days: { type: Number, default: 0 },
    draftSeries: { type: Number, default: 0 },
    totalReportsResolved: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DashboardStats', dashboardStatsSchema);
