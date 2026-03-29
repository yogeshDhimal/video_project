const Comment = require('../models/Comment');
const User = require('../models/User');

function initSocket(httpServer, app) {
  const { Server } = require('socket.io');
  const io = new Server(httpServer, {
    cors: { origin: process.env.CLIENT_URL || '*', credentials: true },
  });

  io.on('connection', (socket) => {
    socket.on('join_episode', (episodeId) => {
      socket.join(`ep:${episodeId}`);
      io.to(`ep:${episodeId}`).emit('presence', { count: io.sockets.adapter.rooms.get(`ep:${episodeId}`)?.size || 0 });
    });

    socket.on('leave_episode', (episodeId) => {
      socket.leave(`ep:${episodeId}`);
    });

    socket.on('live_comment', async (payload, cb) => {
      try {
        const { episodeId, body, userId } = payload;
        if (!episodeId || !body || !userId) return cb?.({ error: 'Invalid' });
        const user = await User.findById(userId);
        if (!user) return cb?.({ error: 'User not found' });
        const c = await Comment.create({ episodeId, userId, body: String(body).slice(0, 4000), parentId: null });
        const msg = { ...c.toObject(), user: { username: user.username, avatar: user.avatar } };
        io.to(`ep:${episodeId}`).emit('live_comment', msg);
        cb?.({ ok: true, comment: msg });
      } catch (e) {
        cb?.({ error: e.message });
      }
    });
  });

  app.set('io', io);
  return io;
}

module.exports = { initSocket };
