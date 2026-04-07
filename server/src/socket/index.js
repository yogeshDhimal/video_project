const jwt = require('jsonwebtoken');
const Comment = require('../models/Comment');
const User = require('../models/User');
const WatchRoom = require('../models/WatchRoom');
const ChatMessage = require('../models/ChatMessage');
const env = require('../config/env');
const redis = require('../utils/redis');

const REDIS_VIEWERS_KEY = 'stats:active_viewers';

function initSocket(httpServer, app) {
  const { Server } = require('socket.io');
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  // Global viewer tracking helper
  const broadcastGlobalViewers = async () => {
    if (!redis) return;
    const count = await redis.get(REDIS_VIEWERS_KEY);
    io.to('admin:stats').emit('global_active_viewers', { count: parseInt(count || 0) });
  };

  // Fixed: Socket.IO authentication middleware (issue 2.7)
  // Verifies JWT on connection instead of trusting client-supplied userId
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      // Allow unauthenticated connections for read-only presence
      socket.data.user = null;
      return next();
    }
    try {
      const payload = jwt.verify(token, env.jwtSecret);
      const user = await User.findById(payload.sub).select('_id username avatar role banned');
      if (!user || user.banned) {
        socket.data.user = null;
        return next();
      }
      socket.data.user = user;
      next();
    } catch (e) {
      socket.data.user = null;
      next(); // Allow connection but without auth
    }
  });

  io.on('connection', (socket) => {
    // 1. Increment global active viewers in Redis (non-blocking)
    if (redis) {
      redis.incr(REDIS_VIEWERS_KEY).then(() => broadcastGlobalViewers()).catch(console.error);
    }

    socket.on('disconnect', () => {
      // 2. Decrement global active viewers in Redis (non-blocking)
      if (redis) {
        redis.decr(REDIS_VIEWERS_KEY).then(() => broadcastGlobalViewers()).catch(console.error);
      }

      if (socket.data && socket.data.watchRoomId) {
        const roomId = socket.data.watchRoomId;
        const count = io.sockets.adapter.rooms.get(`wr:${roomId}`)?.size || 0;
        io.to(`wr:${roomId}`).emit('watch_room_viewers', { count });
      }
    });

    // 3. Admin-only stats channel
    socket.on('join_admin_stats', () => {
      if (socket.data.user?.role === 'admin') {
        socket.join('admin:stats');
        broadcastGlobalViewers();
      }
    });

    socket.on('join_episode', (episodeId) => {
      socket.join(`ep:${episodeId}`);
      io.to(`ep:${episodeId}`).emit('presence', { count: io.sockets.adapter.rooms.get(`ep:${episodeId}`)?.size || 0 });
    });

    socket.on('leave_episode', (episodeId) => {
      socket.leave(`ep:${episodeId}`);
    });

    // Fixed: use verified socket.data.user instead of client-supplied userId (issue 2.7)
    socket.on('live_comment', async (payload, cb) => {
      try {
        const user = socket.data.user;
        if (!user) return cb?.({ error: 'Authentication required' });
        const { episodeId, body } = payload;
        if (!episodeId || !body) return cb?.({ error: 'Invalid' });
        
        // Save to DB for moderation
        const msgDoc = await ChatMessage.create({
          userId: user._id,
          episodeId,
          body: String(body).slice(0, 4000)
        });

        const msg = { 
          _id: msgDoc._id,
          body: msgDoc.body,
          createdAt: msgDoc.createdAt,
          user: { username: user.username, avatar: user.avatar } 
        };
        io.to(`ep:${episodeId}`).emit('live_comment', msg);
        cb?.({ ok: true, comment: msg });
      } catch (e) {
        cb?.({ error: e.message });
      }
    });

    // --- Watch Room Logic ---
    const updateWatchRoomViewers = (roomId) => {
      const count = io.sockets.adapter.rooms.get(`wr:${roomId}`)?.size || 0;
      io.to(`wr:${roomId}`).emit('watch_room_viewers', { count });
    };

    socket.on('join_watch_room', async (roomId) => {
      socket.join(`wr:${roomId}`);
      socket.data = { ...socket.data, watchRoomId: roomId };
      updateWatchRoomViewers(roomId);

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
      updateWatchRoomViewers(roomId);
      if (socket.data?.watchRoomId === roomId) {
        socket.data.watchRoomId = null;
      }
    });

    // Fixed: use verified socket.data.user._id instead of client-supplied userId (issue 2.7)
    socket.on('watch_room_control', async ({ roomId, action, payload }) => {
      const user = socket.data.user;
      if (!user) return;
      const r = await WatchRoom.findById(roomId);
      if (!r || r.hostId.toString() !== user._id.toString()) return; // Only host can emit control
      
      if (action === 'close_room') {
        r.status = 'finished';
        await r.save();
        io.to(`wr:${roomId}`).emit('watch_room_sync', { action: 'close_room' });
        return;
      }
      
      if (action === 'play') {
        r.status = 'active';
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

    // Fixed: use verified user, sanitize and limit message length (issues 2.7, 6.6)
    socket.on('watch_room_chat', async ({ roomId, message }) => {
      const user = socket.data.user;
      if (!user) return;
      const sanitized = String(message || '').trim().slice(0, 2000);
      if (sanitized) {
        // Save to DB for moderation
        const msgDoc = await ChatMessage.create({
          userId: user._id,
          watchRoomId: roomId,
          body: sanitized
        });

        io.to(`wr:${roomId}`).emit('watch_room_chat', {
          _id: msgDoc._id,
          username: user.username,
          message: sanitized,
          timestamp: msgDoc.createdAt,
        });
      }
    });
  });

  // Fixed: increased interval from 5s to 60s, added error logging (issue 2.9)
  setInterval(async () => {
    try {
      const now = new Date();
      const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

      // 1. Auto-Start scheduled rooms whose time has come
      const readyRooms = await WatchRoom.find({ status: 'scheduled', scheduledStartTime: { $lte: now, $gt: sixHoursAgo } });
      for (const r of readyRooms) {
        r.status = 'active';
        r.isPlaying = true;
        r.playbackUpdatedAt = now;
        r.currentVideoTime = 0;
        await r.save();
        io.to(`wr:${r._id}`).emit('watch_room_sync', { action: 'room_started', payload: {}, room: r });
      }

      // 2. Garbage Collection: Mark abandoned Scheduled rooms as finished
      await WatchRoom.updateMany(
        { status: 'scheduled', scheduledStartTime: { $lte: sixHoursAgo } },
        { status: 'finished' }
      );

      // 3. Garbage Collection: Mark stagnant Active rooms as finished
      await WatchRoom.updateMany(
        { status: 'active', playbackUpdatedAt: { $lte: sixHoursAgo } },
        { status: 'finished' }
      );
    } catch (e) {
      console.error('[WatchRoom GC]', e.message);
    }
  }, 60_000); // Every 60 seconds instead of 5 seconds

  app.set('io', io);
  return io;
}

module.exports = { initSocket };
