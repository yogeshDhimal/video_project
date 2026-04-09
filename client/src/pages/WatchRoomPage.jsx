import { useEffect, useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import ConfirmModal from '../components/ConfirmModal';
import PinEntryModal from '../components/PinEntryModal';
import Spinner from '../components/Spinner';
import SyncVideoPlayer from '../components/SyncVideoPlayer';
import DiscussionDrawer from '../components/DiscussionDrawer';

export default function WatchRoomPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [room, setRoom] = useState(null);
  const [syncState, setSyncState] = useState(null);
  const [chat, setChat] = useState([]);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [viewers, setViewers] = useState(0);
  const [roomClosed, setRoomClosed] = useState(false);
  const [closingCountdown, setClosingCountdown] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [itemToReport, setItemToReport] = useState(null);
  const [isReporting, setIsReporting] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState('chat');
  const socketRef = useRef(null);

  // Private room gate state
  const [requiresPin, setRequiresPin] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // Real-time player state (server authoritative)
  const [isPlaying, setIsPlaying] = useState(false);
  const [serverTime, setServerTime] = useState(0);
  const [currentEpIdx, setCurrentEpIdx] = useState(0);

  // Step 1: Load full populated room via REST
  useEffect(() => {
    if (authLoading) return;
    if (!user) { setError('Login required'); return; }

    api.get(`/watch-rooms/${id}`)
      .then(({ data }) => {
        if (data.room.requiresPin) {
          const cached = sessionStorage.getItem(`wr_auth_${id}`);
          if (cached === 'true') {
            api.post(`/watch-rooms/${id}/join`, { pin: '0000' }).catch(() => {});
            setRequiresPin(true);
            setRoom(data.room);
            return;
          }
          setRequiresPin(true);
          setRoom(data.room);
          return;
        }
        setRequiresPin(false);
        setRoom(data.room);
        setCurrentEpIdx(data.room.currentEpisodeIndex || 0);
        setIsPlaying(data.room.isPlaying || false);
        let t = data.room.currentVideoTime || 0;
        if (data.room.isPlaying && data.room.playbackUpdatedAt) {
          t += (Date.now() - new Date(data.room.playbackUpdatedAt).getTime()) / 1000;
        }
        setServerTime(t);
      })
      .catch(() => setError('Room not found or unavailable.'));
  }, [id, authLoading, user]);

  const handlePinSubmit = async (pin) => {
    setPinLoading(true);
    setPinError('');
    try {
      const { data } = await api.post(`/watch-rooms/${id}/join`, { pin });
      if (data.authorized) {
        sessionStorage.setItem(`wr_auth_${id}`, 'true');
        const { data: fullData } = await api.get(`/watch-rooms/${id}`);
        setRoom(fullData.room);
        setRequiresPin(false);
        setCurrentEpIdx(fullData.room.currentEpisodeIndex || 0);
        setIsPlaying(fullData.room.isPlaying || false);
        let t = fullData.room.currentVideoTime || 0;
        if (fullData.room.isPlaying && fullData.room.playbackUpdatedAt) {
          t += (Date.now() - new Date(fullData.room.playbackUpdatedAt).getTime()) / 1000;
        }
        setServerTime(t);
      }
    } catch (err) {
      setPinError(err.response?.data?.message || 'Incorrect PIN');
    } finally {
      setPinLoading(false);
    }
  };

  useEffect(() => {
    if (!room || !user || requiresPin) return;
    const token = localStorage.getItem('sv_token');
    if (!token) return;

    const socket = io({ path: '/socket.io', auth: { token } });
    socketRef.current = socket;

    socket.emit('join_watch_room', id);

    socket.on('watch_room_sync', ({ action, payload }) => {
      if (action === 'close_room') {
        setRoomClosed(true);
        setIsPlaying(false);
        return;
      }
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
        api.get(`/watch-rooms/${id}`).then(({ data }) => setRoom(data.room)).catch(() => {});
      }
    });

    socket.on('watch_room_chat', (message) => {
      setChat(prev => [...prev.slice(-49), message]);
    });

    socket.on('watch_room_viewers', ({ count }) => {
      setViewers(count);
    });

    return () => {
      socket.emit('leave_watch_room', id);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [room, user, id]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setServerTime(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (closingCountdown === null) return;
    if (closingCountdown <= 0) {
      if (socketRef.current) {
        socketRef.current.emit('watch_room_control', { roomId: id, userId: user._id, action: 'close_room' });
      }
      setClosingCountdown(null);
      return;
    }
    const timer = setTimeout(() => {
      setClosingCountdown(prev => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [closingCountdown, id, user]);

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
      setClosingCountdown(30);
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

  const handleReportChatMessage = (msgId) => {
    if (!user) return toast.error("Please log in to report content.");
    setItemToReport(msgId);
    setShowReportModal(true);
  };

  const confirmReport = async () => {
    if (!itemToReport) return;
    setIsReporting(true);
    try {
      await api.post(`/chat/${itemToReport}/report`);
      toast.success("Flagged for review. Thank you for keeping ClickWatch safe!");
    } catch {
      toast.error("Failed to report. Please try again.");
    } finally {
      setIsReporting(false);
      setShowReportModal(false);
      setItemToReport(null);
    }
  };

  if (authLoading) return <div className="p-24 flex justify-center"><Spinner label="Loading session..." /></div>;
  if (error) return <div className="p-20 text-center font-semibold text-rose-500">{error}</div>;
  if (!room) return <div className="p-24 flex justify-center"><Spinner label="Connecting to room..." /></div>;

  if (requiresPin) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white mb-2">{room.title}</h1>
          <p className="text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
            This is a private room. Enter the PIN to continue.
          </p>
        </div>
        <PinEntryModal
          isOpen={true}
          onSubmit={handlePinSubmit}
          onCancel={() => navigate('/watch-together')}
          isLoading={pinLoading}
          error={pinError}
        />
      </div>
    );
  }

  const isHost = !!(user && room.hostId && (room.hostId._id?.toString() === user._id?.toString() || room.hostId?.toString() === user._id?.toString()));
  const currentEpisode = room.episodes[currentEpIdx] || null;

  if (roomClosed) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 py-32 text-center flex flex-col items-center justify-center animate-fadeUp">
        <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white mb-3">Room Ended</h1>
        <Link to="/watch-together" className="px-6 py-3 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl shadow-lg">
          Browse Active Rooms
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-3 sm:py-6 text-slate-900 dark:text-slate-100 h-[calc(100dvh-64px)] sm:h-auto overflow-hidden sm:overflow-visible flex flex-col">
      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_380px] gap-8">
        
        {/* Main Column */}
        <div className="min-w-0">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-white/[0.02] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-white/5 gap-4">
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold font-display text-slate-900 dark:text-white mb-2 underline decoration-teal-500/30 truncate">
                {room.title}
              </h1>
              <div className="flex items-center gap-3">
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 px-2 py-0.5 rounded shrink-0">
                  {isHost ? 'Host' : 'Guest'}
                </p>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {viewers} Online
                </div>
              </div>
            </div>
            <div className="flex flex-nowrap sm:flex-wrap items-center gap-3 w-full sm:w-auto">
              <button
                onClick={copyToClipboard}
                className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl border text-[11px] font-black uppercase tracking-widest transition-all ${
                  copied ? 'bg-teal-600 border-teal-600 text-white shadow-lg' : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300'
                }`}
              >
                {copied ? 'Copied' : 'Invite'}
              </button>
              {isHost && (
                <button
                  onClick={() => emitControl('close_room')}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-xl text-[11px] font-black uppercase tracking-widest"
                >
                  End Room
                </button>
              )}
            </div>
          </div>

          {/* Persistent Room Chat (Mobile Only) - Dynamic height to fill screen */}
          <div className="flex-1 min-h-0 lg:hidden mt-4 bg-white dark:bg-charcoal-900/60 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden flex flex-col shadow-sm mb-4">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/5">
               <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
                  <h2 className="font-black uppercase tracking-widest text-[9px] text-slate-500 dark:text-slate-400">Room Chat</h2>
               </div>
               <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded-full uppercase">Live</span>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col-reverse gap-3.5 bg-slate-50/30 dark:bg-transparent">
               <div className="space-y-4">
                  {chat.map((c, i) => (
                    <div key={i} className="group/chat relative pr-6 animate-fadeIn items-start flex gap-2">
                      <span className="font-black text-teal-600 dark:text-teal-400 text-[10px] uppercase shrink-0 mt-1">{c.username}:</span>
                      <span className="text-sm text-slate-700 dark:text-slate-300 break-words leading-relaxed">{c.message}</span>
                      {user && c._id && (
                        <button
                          onClick={() => handleReportChatMessage(c._id)}
                          className="absolute right-0 top-0 opacity-0 group-hover/chat:opacity-100 text-[10px] text-slate-400 hover:text-rose-500 transition-all p-0.5"
                        >
                          🚩
                        </button>
                      )}
                    </div>
                  ))}
                  {chat.length === 0 && <p className="text-xs text-slate-400 italic text-center py-20 uppercase tracking-widest opacity-50 font-bold">No messages yet.</p>}
               </div>
            </div>

            <form onSubmit={sendChat} className="p-3 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-charcoal-850 flex gap-2">
              <input
                value={msg}
                onChange={e => setMsg(e.target.value)}
                placeholder="Message the room..."
                className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-charcoal-850 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
              <button type="submit" className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md transition-colors">
                Send
              </button>
            </form>
          </div>

          {room.status === 'scheduled' ? (
            <div className="aspect-video flex flex-col items-center justify-center bg-black rounded-2xl ring-1 ring-white/10 mb-6 relative overflow-hidden">
              <h2 className="text-2xl font-bold text-white z-10 mb-2">Room is Scheduled</h2>
              {isHost && (
                <button onClick={() => emitControl('play', { time: 0 })} className="z-10 mt-6 px-8 py-3 bg-teal-600 text-white font-black uppercase tracking-widest rounded-xl">Start Now</button>
              )}
            </div>
          ) : closingCountdown !== null ? (
            <div className="aspect-video flex flex-col items-center justify-center bg-black rounded-2xl ring-1 ring-rose-500/20 mb-6">
              <div className="text-5xl font-black text-rose-500 mb-4 animate-pulse">{closingCountdown}s</div>
              <p className="text-slate-400 uppercase tracking-widest text-[10px] font-bold">Auto-closing room...</p>
            </div>
          ) : (
            <div className="mb-0">
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
                <div className="aspect-video flex items-center justify-center bg-black rounded-3xl text-slate-500">Playlist Empty</div>
              )}
            </div>
          )}

          {/* New Playlist Design below Player */}
          <div className="bg-white dark:bg-white/[0.02] rounded-3xl border border-slate-200 dark:border-white/5 p-6 mt-8">
             <div className="flex items-center justify-between mb-6">
                <h3 className="font-black uppercase tracking-widest text-[11px] text-slate-500">Queue & Timeline</h3>
                <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 dark:bg-white/10 rounded-full">{room.episodes.length} Episodes</span>
             </div>
             <div className="space-y-3">
                {room.episodes.map((ep, i) => {
                  const isActive = currentEpIdx === i;
                  return (
                    <div key={ep._id || i} className={`p-4 rounded-2xl border transition-all flex items-center gap-4 ${isActive ? 'bg-teal-50 border-teal-200 dark:bg-teal-900/20 dark:border-teal-500/30' : 'bg-transparent border-slate-100 dark:border-white/5 hover:border-teal-500/30'}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${isActive ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20' : 'bg-slate-100 dark:bg-white/10 text-slate-400'}`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${isActive ? 'text-teal-900 dark:text-teal-300' : 'text-slate-700 dark:text-slate-300'}`}>{ep.title || `Episode ${i + 1}`}</p>
                        <p className="text-[10px] uppercase text-slate-400 tracking-tighter">{ep.seasonId?.seriesId?.title || 'Episode'}</p>
                      </div>
                      {isHost && !isActive && (
                        <button onClick={() => emitControl('set_episode', { index: i })} className="p-2.5 bg-teal-600 text-white rounded-xl shadow-md hover:scale-105 active:scale-95 transition-all">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        </button>
                      )}
                    </div>
                  );
                })}
             </div>
          </div>
        </div>

        {/* Persistent Chat Sidebar (Hides when hub is open for wide mode) */}
        {!isDrawerOpen && (
          <div className="hidden lg:flex flex-col gap-4 animate-fadeIn">
            <div className="rounded-3xl border border-slate-200 dark:border-white/5 bg-white dark:bg-charcoal-900/60 overflow-hidden flex flex-col h-[650px] shadow-sm sticky top-24">
                <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/5">
                  <h2 className="font-black uppercase tracking-widest text-[11px] text-slate-500">Room Chat</h2>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-teal-100 dark:bg-teal-900/40 text-[9px] font-black text-teal-700 dark:text-teal-400 rounded-lg">LIVE</div>
                </div>
                <div className="flex-1 p-5 overflow-y-auto custom-scrollbar flex flex-col-reverse gap-4">
                  <div className="space-y-4">
                      {chat.map((c, i) => (
                        <div key={i} className="animate-fadeIn group/chat relative">
                          <span className="font-bold text-teal-600 dark:text-teal-400 text-[11px] mr-2">{c.username}</span>
                          <span className="text-[13px] text-slate-700 dark:text-slate-300 break-words leading-relaxed">{c.message}</span>
                          {user && c._id && (
                            <button onClick={() => handleReportChatMessage(c._id)} className="absolute right-0 top-0 opacity-0 group-hover/chat:opacity-100 text-[10px] text-slate-400 hover:text-rose-500 transition-all font-black uppercase">🚩</button>
                          )}
                        </div>
                      ))}
                      {!chat.length && <p className="text-slate-400 italic text-center text-xs py-20">No messages yet.</p>}
                  </div>
                </div>
                <form onSubmit={sendChat} className="p-4 border-t border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex gap-2">
                  <input
                    value={msg}
                    onChange={e => setMsg(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-charcoal-850 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    placeholder="Message group..."
                  />
                  <button type="submit" className="px-4 py-3 bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-md">Send</button>
                </form>
            </div>
          </div>
        )}

        {/* Mobile Floating Button for Chat */}
        <div className="lg:hidden fixed bottom-6 right-6 z-50">
           <button 
             onClick={() => { setActiveDrawerTab('chat'); setIsDrawerOpen(true); }}
             className="w-14 h-14 bg-teal-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-95 transition-all"
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
           </button>
        </div>
      </div>

      <DiscussionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Room Hub"
        activeTab={activeDrawerTab}
        onTabChange={setActiveDrawerTab}
        tabs={[
          {
            id: 'playlist',
            label: 'Playlist',
            content: (
              <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                   <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Queue</h3>
                   <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-white/5 rounded-full">{room.episodes.length} Episodes</span>
                </div>
                <ul className="space-y-2">
                  {room.episodes.map((ep, i) => {
                    const isActive = currentEpIdx === i;
                    return (
                      <li
                        key={ep._id || i}
                        className={`p-3.5 rounded-2xl transition-all border flex items-center gap-4 ${
                          isActive
                            ? 'bg-teal-50 border-teal-200 dark:bg-teal-900/20 dark:border-teal-500/30'
                            : 'bg-white dark:bg-white/[0.02] border-slate-100 dark:border-white/5 hover:border-teal-500/30'
                        }`}
                      >
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isActive ? 'bg-teal-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate font-semibold leading-none mb-1 ${isActive ? 'text-teal-900 dark:text-teal-300' : 'text-slate-700 dark:text-slate-300'}`}>
                            {ep.title || `Episode ${i + 1}`}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                            {ep.seasonId?.seriesId?.title || 'Episode'}
                          </p>
                        </div>
                        {isHost && !isActive && (
                          <button
                            onClick={() => emitControl('set_episode', { index: i })}
                            className="p-2 rounded-lg bg-teal-600 text-white hover:bg-teal-500 transition-colors shadow-sm"
                            title="Play this next"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )
          }
        ]}
      />
      <ConfirmModal
        isOpen={showReportModal}
        title="Report Message"
        description="Are you sure you want to flag this chat message as inappropriate?"
        confirmLabel="Confirm Report"
        isDestructive={true}
        isLoading={isReporting}
        onConfirm={confirmReport}
        onCancel={() => setShowReportModal(false)}
      />
    </div>
  );
}
