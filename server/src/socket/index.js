const Comment = require('../models/Comment');
const User = require('../models/User');
const WatchRoom = require('../models/WatchRoom');

function initSocket(httpServer, app) {
  const { Server } = require('socket.io');
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
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

    // --- Watch Room Logic ---
    socket.on('join_watch_room', async (roomId) => {
      socket.join(`wr:${roomId}`);
      const r = await WatchRoom.findById(roomId).lean();
      if (r) {
        let currentTime = r.currentVideoTime;
        if (r.status === 'active' && r.isPlaying && r.playbackUpdatedAt) {
          currentTime += (Date.now() - new Date(r.playbackUpdatedAt).getTime()) / 1000;
        }
        socket.emit('watch_room_state', { ...r, currentVideoTime: currentTime });
      }
    });

    socket.on('leave_watch_room', (roomId) => {
      socket.leave(`wr:${roomId}`);
    });

    socket.on('watch_room_control', async ({ roomId, action, payload, userId }) => {
      const r = await WatchRoom.findById(roomId);
      if (!r || r.hostId.toString() !== userId) return; // Only host can emit control
      
      if (action === 'play') {
        r.status = 'active'; // Force transition if scheduled
        r.isPlaying = true;
        r.currentVideoTime = payload.time;
        r.playbackUpdatedAt = new Date();
      } else if (action === 'pause') {
        r.isPlaying = false;
        r.currentVideoTime = payload.time;
        r.playbackUpdatedAt = new Date();
      } else if (action === 'seek') {
        r.currentVideoTime = payload.time;
        r.playbackUpdatedAt = new Date();
      } else if (action === 'set_episode') {
        r.currentEpisodeIndex = payload.index;
        r.currentVideoTime = 0;
        r.playbackUpdatedAt = new Date();
      }
      
      await r.save();
      io.to(`wr:${roomId}`).emit('watch_room_sync', { action, payload, room: r });
    });

    socket.on('watch_room_chat', async ({ roomId, userId, message }) => {
       const user = await User.findById(userId);
       if (user && message.trim()) {
          io.to(`wr:${roomId}`).emit('watch_room_chat', { username: user.username, message: message.trim(), timestamp: new Date() });
       }
    });
  });

  // Scheduled Rooms Auto-Start Ticker (Offline-first source of truth)
  setInterval(async () => {
    try {
      const now = new Date();
      const readyRooms = await WatchRoom.find({ status: 'scheduled', scheduledStartTime: { $lte: now } });
      for (const r of readyRooms) {
        r.status = 'active';
        r.isPlaying = true;
        r.playbackUpdatedAt = now;
        r.currentVideoTime = 0;
        await r.save();
        io.to(`wr:${r._id}`).emit('watch_room_sync', { action: 'room_started', payload: {}, room: r });
      }
    } catch (e) { /* ignore */ }
  }, 5000);

  app.set('io', io);
  return io;
}

module.exports = { initSocket };
