const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seriesId: { type: mongoose.Schema.Types.ObjectId, ref: 'Series', required: true, index: true },
  },
  { timestamps: true }
);

bookmarkSchema.index({ userId: 1, seriesId: 1 }, { unique: true });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
