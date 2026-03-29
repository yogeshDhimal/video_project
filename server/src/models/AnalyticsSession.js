const mongoose = require('mongoose');

const analyticsSessionSchema = new mongoose.Schema(
  {
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    sessionId: { type: String, required: true },
    checkpoints: [
      {
        positionSeconds: Number,
        at: { type: Date, default: Date.now },
      },
    ],
    maxPositionSeconds: { type: Number, default: 0 },
    totalWatchSeconds: { type: Number, default: 0 },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

analyticsSessionSchema.index({ episodeId: 1, sessionId: 1 });

module.exports = mongoose.model('AnalyticsSession', analyticsSessionSchema);
