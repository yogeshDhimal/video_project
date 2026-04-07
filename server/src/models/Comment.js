const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null, index: true },
    body: { type: String, required: true, maxlength: 4000, trim: true },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    isFlagged: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

commentSchema.index({ episodeId: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);
