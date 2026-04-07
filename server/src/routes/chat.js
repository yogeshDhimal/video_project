const express = require('express');
const ChatMessage = require('../models/ChatMessage');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Report a chat message
router.post('/:msgId/report', authenticate, async (req, res) => {
  try {
    const msg = await ChatMessage.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    
    msg.isFlagged = true;
    await msg.save();
    
    res.json({ message: 'Message reported successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
