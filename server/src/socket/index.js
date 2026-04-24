const jwt = require('jsonwebtoken');
const Comment = require('../models/Comment');
const User = require('../models/User');
const WatchRoom = require('../models/WatchRoom');
const ChatMessage = require('../models/ChatMessage');
const env = require('../config/env');
const redis = require('../utils/redis');
const watchRoomsRoute = require('../routes/watch-rooms');

const REDIS_VIEWERS_KEY = 'stats:active_viewers';

function initSocket(httpServer, app) {
  const { Server } = require('socket.io');
  const io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
  });

  const broadcastGlobalViewers = async () => {
    if (!redis) return;
    const count = await redis.get(REDIS_VIEWERS_KEY);
    io.to('admin:stats').emit('global_active_viewers', { count: parseInt(count || 0) });
  };

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
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
      next();
    }
  });

  io.on('connection', (socket) => {
    if (redis) {
      redis.incr(REDIS_VIEWERS_KEY).then(() => broadcastGlobalViewers()).catch(console.error);
    }

    socket.on('disconnect', () => {
      if (redis) {
        redis.decr(REDIS_VIEWERS_KEY).then(() => broadcastGlobalViewers()).catch(console.error);
      }

      if (socket.data && socket.data.watchRoomId) {
        const roomId = socket.data.watchRoomId;
        const count = io.sockets.adapter.rooms.get(`wr:${roomId}`)?.size || 0;
        io.to(`wr:${roomId}`).emit('watch_room_viewers', { count });
      }
    });

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

    socket.on('live_comment', async (payload, cb) => {
      try {
        const user = socket.data.user;
        if (!user) return cb?.({ error: 'Authentication required' });
        const { episodeId, body } = payload;
        if (!episodeId || !body) return cb?.({ error: 'Invalid' });

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

    const updateWatchRoomViewers = (roomId) => {
      const count = io.sockets.adapter.rooms.get(`wr:${roomId}`)?.size || 0;
      io.to(`wr:${roomId}`).emit('watch_room_viewers', { count });
    };

    socket.on('join_watch_room', async (roomId, cb) => {
      const user = socket.data.user;
      const r = await WatchRoom.findById(roomId).lean();
      if (!r) return cb?.({ error: 'Room not found' });

      if (r.visibility === 'private' && user) {
        const hostId = r.hostId?.toString();
        const userId = user._id?.toString();
        const isHost = hostId === userId;
        if (!isHost && !watchRoomsRoute.isUserAuthorized(roomId, userId)) {
          return cb?.({ error: 'PIN required' });
        }
      }

      socket.join(`wr:${roomId}`);
      socket.data = { ...socket.data, watchRoomId: roomId };
      updateWatchRoomViewers(roomId);

      if (r) {
        let currentTime = r.currentVideoTime;
        if (r.status === 'active' && r.isPlaying && r.playbackUpdatedAt) {
          currentTime += (Date.now() - new Date(r.playbackUpdatedAt).getTime()) / 1000;
        }
        socket.emit('watch_room_state', { ...r, currentVideoTime: currentTime });
      }
      cb?.({ ok: true });
    });

    socket.on('leave_watch_room', (roomId) => {
      socket.leave(`wr:${roomId}`);
      updateWatchRoomViewers(roomId);
      if (socket.data?.watchRoomId === roomId) {
        socket.data.watchRoomId = null;
      }
    });

    socket.on('watch_room_control', async ({ roomId, action, payload }, cb) => {
      const user = socket.data.user;
      if (!user) return cb?.({ error: 'Authentication required' });
      const r = await WatchRoom.findById(roomId);
      if (!r || r.hostId.toString() !== user._id.toString()) {
        return cb?.({ error: 'Only the host can control playback' });
      }

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

    socket.on('watch_room_chat', async ({ roomId, message }) => {
      const user = socket.data.user;
      if (!user) return;
      const sanitized = String(message || '').trim().slice(0, 2000);
      if (sanitized) {
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

  setInterval(async () => {
    try {
      const now = new Date();
      const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);

      const readyRooms = await WatchRoom.find({ status: 'scheduled', scheduledStartTime: { $lte: now, $gt: sixHoursAgo } });
      for (const r of readyRooms) {
        r.status = 'active';
        r.isPlaying = true;
        r.playbackUpdatedAt = now;
        r.currentVideoTime = 0;
        await r.save();
        io.to(`wr:${r._id}`).emit('watch_room_sync', { action: 'room_started', payload: {}, room: r });
      }

      await WatchRoom.updateMany(
        { status: 'scheduled', scheduledStartTime: { $lte: sixHoursAgo } },
        { status: 'finished' }
      );

      await WatchRoom.updateMany(
        { status: 'active', playbackUpdatedAt: { $lte: sixHoursAgo } },
        { status: 'finished' }
      );
    } catch (e) {
      console.error('[WatchRoom GC]', e.message);
    }
  }, 60_000);

  app.set('io', io);
  return io;
}

module.exports = { initSocket };
