const mongoose = require('mongoose');

const watchRoomSchema = new mongoose.Schema(
  {
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    episodes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Episode' }],
    currentEpisodeIndex: { type: Number, default: 0 },
    scheduledStartTime: { type: Date, default: null },
    status: {
      type: String,
      enum: ['scheduled', 'active', 'finished'],
      default: 'scheduled',
    },
    isPlaying: { type: Boolean, default: false },
    currentVideoTime: { type: Number, default: 0 },
    playbackUpdatedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('WatchRoom', watchRoomSchema);
