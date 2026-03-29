const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode', required: true, index: true },
    value: { type: Number, enum: [1, -1], required: true },
  },
  { timestamps: true }
);

likeSchema.index({ userId: 1, episodeId: 1 }, { unique: true });

module.exports = mongoose.model('Like', likeSchema);
