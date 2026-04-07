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

// We only ever want one document (the latest stats)
// or a history if we decide to track trends later.
// For now, we'll just keep it simple.

module.exports = mongoose.model('DashboardStats', dashboardStatsSchema);
