const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode', required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
  },
  { timestamps: true }
);

// Ensure a user can only rate an episode once
ratingSchema.index({ userId: 1, episodeId: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);
