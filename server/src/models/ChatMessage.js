const mongoose = require('mongoose');

const ChatMessageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  episodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Episode',
    default: null
  },
  watchRoomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WatchRoom',
    default: null
  },
  body: {
    type: String,
    required: true,
    maxlength: 4000
  },
  isFlagged: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient cleanup if needed
ChatMessageSchema.index({ createdAt: 1 });
ChatMessageSchema.index({ isFlagged: 1 });

module.exports = mongoose.model('ChatMessage', ChatMessageSchema);
