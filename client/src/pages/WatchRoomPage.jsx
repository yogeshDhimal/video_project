import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import SyncVideoPlayer from '../components/SyncVideoPlayer';

export default function WatchRoomPage() {
  const { id } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [room, setRoom] = useState(null);        // full REST-populated room (has episode objects)
  const [syncState, setSyncState] = useState(null); // lightweight socket-only sync state
  const [chat, setChat] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const socketRef = useRef(null);

  // Real-time player state (server authoritative)
  const [isPlaying, setIsPlaying] = useState(false);
  const [serverTime, setServerTime] = useState(0);
  const [currentEpIdx, setCurrentEpIdx] = useState(0);

  // Step 1: Load full populated room via REST (so we have episode objects with qualities)
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setError('Login required'); return; }

    api.get(`/watch-rooms/${id}`)
      .then(({ data }) => {
        setRoom(data.room);
        setCurrentEpIdx(data.room.currentEpisodeIndex || 0);
        setIsPlaying(data.room.isPlaying || false);
        // Calculate server time accounting for elapsed time if already playing
        let t = data.room.currentVideoTime || 0;
        if (data.room.isPlaying && data.room.playbackUpdatedAt) {
          t += (Date.now() - new Date(data.room.playbackUpdatedAt).getTime()) / 1000;
        }
        setServerTime(t);
      })
      .catch(() => setError('Room not found or unavailable.'));
  }, [id, authLoading, user]);

  // Step 2: Connect socket once room is loaded
  useEffect(() => {
    if (!room || !user) return;
    const token = localStorage.getItem('sv_token');
    if (!token) return;

    const socket = io({ path: '/socket.io', auth: { token } });
    socketRef.current = socket;

    socket.emit('join_watch_room', id);

    // Override state from socket when host triggers events
    socket.on('watch_room_sync', ({ action, payload }) => {
      if (action === 'play' || action === 'room_started') {
        setIsPlaying(true);
        if (payload?.time !== undefined) setServerTime(payload.time);
      } else if (action === 'pause') {
        setIsPlaying(false);
        if (payload?.time !== undefined) setServerTime(payload.time);
      } else if (action === 'seek') {
        if (payload?.time !== undefined) setServerTime(payload.time);
      } else if (action === 'set_episode') {
        setCurrentEpIdx(payload.index);
        setServerTime(0);
        setIsPlaying(true);
        // Refresh full room to get updated currentEpisodeIndex
        api.get(`/watch-rooms/${id}`).then(({ data }) => setRoom(data.room)).catch(() => {});
      }
    });

    socket.on('watch_room_chat', (message) => {
      setChat(prev => [...prev.slice(-49), message]);
    });

    return () => {
      socket.emit('leave_watch_room', id);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [room, user, id]);

  // Server-side clock interpolation (smooth time progress for viewers)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setServerTime(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  const sendChat = (e) => {
    e.preventDefault();
    if (!msg.trim() || !socketRef.current) return;
    socketRef.current.emit('watch_room_chat', { roomId: id, userId: user._id, message: msg });
    setMsg('');
  };

  const handleEnded = () => {
    if (!room || !user || room.hostId?._id !== user._id) return;
    if (currentEpIdx < room.episodes.length - 1) {
      socketRef.current.emit('watch_room_control', {
        roomId: id, userId: user._id,
        action: 'set_episode', payload: { index: currentEpIdx + 1 }
      });
    } else {
      socketRef.current.emit('watch_room_control', {
        roomId: id, userId: user._id,
        action: 'pause', payload: { time: serverTime }
      });
    }
  };

  const copyToClipboard = () => {
    const url = window.location.href;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url);
    } else {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const emitControl = (action, payload = {}) => {
    if (!socketRef.current) return;
    socketRef.current.emit('watch_room_control', { roomId: id, userId: user._id, action, payload });
  };

  if (authLoading) return <div className="p-24 flex justify-center"><Spinner label="Loading session..." /></div>;
  if (error) return <div className="p-20 text-center font-semibold text-rose-500">{error}</div>;
  if (!room) return <div className="p-24 flex justify-center"><Spinner label="Connecting to room..." /></div>;

  const isHost = !!(user && room.hostId && (room.hostId._id?.toString() === user._id?.toString() || room.hostId?.toString() === user._id?.toString()));
  const currentEpisode = room.episodes[currentEpIdx] || null; // This is a full populated episode object

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 text-slate-900 dark:text-slate-100">
      <div className="flex flex-col lg:flex-row gap-6">

        {/* Main Player Area */}
        <div className="flex-1 min-w-0">
          <div className="mb-4 flex items-center justify-between bg-teal-50 dark:bg-teal-900/10 p-4 rounded-xl border border-teal-100 dark:border-teal-500/20 gap-3 flex-wrap">
            <div>
              <h1 className="text-xl md:text-2xl font-bold font-display text-teal-800 dark:text-teal-300">
                {room.title}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-wider font-semibold">
                {isHost ? '👑 You are hosting' : `👤 Hosted by ${room.hostId?.username}`}
              </p>
            </div>
            <button
              onClick={copyToClipboard}
              className={`shrink-0 px-4 py-2 border rounded-lg text-sm font-semibold transition-all ${
                copied
                  ? 'bg-teal-50 border-teal-300 text-teal-700 dark:bg-teal-900/30 dark:border-teal-500/30 dark:text-teal-400'
                  : 'border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              {copied ? '✅ Copied!' : '🔗 Copy Invite'}
            </button>
          </div>

          {room.status === 'scheduled' ? (
            <div className="aspect-video flex flex-col items-center justify-center bg-black rounded-2xl ring-1 ring-white/10 mb-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(20,184,166,0.12),transparent_70%)]" />
              <h2 className="text-2xl font-bold text-white z-10 mb-2">⏳ Room is Scheduled</h2>
              <p className="text-slate-400 z-10 text-center px-8 text-sm">
                The video will automatically start at the scheduled time. You can wait here or come back.
              </p>
              {isHost && (
                <button
                  onClick={() => emitControl('play', { time: 0 })}
                  className="z-10 mt-6 px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl transition-colors shadow-lg"
                >
                  Start Now
                </button>
              )}
            </div>
          ) : (
            <div className="mb-6">
              {currentEpisode ? (
                <SyncVideoPlayer
                  isHost={isHost}
                  socket={socketRef.current}
                  roomId={room._id}
                  episodeId={currentEpisode._id}
                  episode={currentEpisode}
                  token={localStorage.getItem('sv_token')}
                  isPlaying={isPlaying}
                  serverVideoTime={serverTime}
                  onEnded={handleEnded}
                />
              ) : (
                <div className="aspect-video flex items-center justify-center bg-black rounded-2xl ring-1 ring-white/10 text-white font-semibold">
                  No episodes in playlist.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-5">

          {/* Chat */}
          <div className="flex flex-col rounded-2xl bg-white border border-slate-200 shadow-sm dark:bg-charcoal-900/60 dark:border-white/10 overflow-hidden" style={{ height: '380px' }}>
            <div className="p-3 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 font-semibold text-sm text-slate-800 dark:text-slate-200">
              💬 Room Chat
            </div>
            <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2.5 text-sm">
              {chat.map((c, i) => (
                <div key={i}>
                  <span className="font-bold text-teal-600 dark:text-teal-400 mr-1.5">{c.username}:</span>
                  <span className="text-slate-700 dark:text-slate-300 break-words">{c.message}</span>
                </div>
              ))}
              {chat.length === 0 && <p className="text-xs text-slate-400 italic text-center pt-6">No messages yet.</p>}
            </div>
            <form onSubmit={sendChat} className="p-2.5 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex gap-2">
              <input
                value={msg}
                onChange={e => setMsg(e.target.value)}
                type="text"
                placeholder="Say something..."
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-charcoal-850 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <button type="submit" className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold rounded-lg transition-colors">
                Send
              </button>
            </form>
          </div>

          {/* Playlist */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:bg-charcoal-900/60 dark:border-white/10 p-4">
            <h3 className="font-semibold text-sm mb-3 text-slate-900 dark:text-white uppercase tracking-wider">
              📋 Playlist ({room.episodes.length})
            </h3>
            <ul className="space-y-1.5 overflow-y-auto max-h-72">
              {room.episodes.map((ep, i) => {
                const isActive = currentEpIdx === i;
                const epTitle = ep.title || `Episode ${ep.number || i + 1}`;
                return (
                  <li
                    key={ep._id || i}
                    className={`p-2.5 rounded-xl text-sm transition-all flex items-center gap-3 ${
                      isActive
                        ? 'bg-teal-50 border border-teal-200 dark:bg-teal-900/30 dark:border-teal-500/30'
                        : 'hover:bg-slate-50 border border-transparent dark:hover:bg-white/5'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${isActive ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {i + 1}
                    </span>
                    <span className={`truncate flex-1 ${isActive ? 'font-bold text-teal-800 dark:text-teal-300' : 'text-slate-600 dark:text-slate-400'}`}>
                      {epTitle}
                    </span>
                    {isHost && !isActive && (
                      <button
                        onClick={() => emitControl('set_episode', { index: i })}
                        className="text-[10px] font-bold uppercase shrink-0 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 px-1"
                      >
                        ▶
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
