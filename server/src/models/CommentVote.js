const mongoose = require('mongoose');

const commentVoteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', required: true, index: true },
    value: { type: Number, enum: [1, -1], required: true },
  },
  { timestamps: true }
);

commentVoteSchema.index({ userId: 1, commentId: 1 }, { unique: true });

module.exports = mongoose.model('CommentVote', commentVoteSchema);
