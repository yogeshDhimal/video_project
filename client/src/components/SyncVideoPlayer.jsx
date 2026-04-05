import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/client';

function streamUrl(episodeId, qualityKey, token) {
  const q = new URLSearchParams();
  if (token) q.set('token', token);
  return `/api/stream/episode/${episodeId}/quality/${qualityKey}?${q.toString()}`;
}

function formatTime(s) {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function SyncVideoPlayer({
  isHost,
  socket,
  episodeId,
  episode,        // full episode object (with qualities array)
  token,
  isPlaying,
  serverVideoTime,
  roomId,
  onEnded,
}) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [qualityKey, setQualityKey] = useState('');
  const [fs, setFs] = useState(false);
  const lastSync = useRef(null); // Track when we last force-synced to avoid jitter

  // Pick first quality key when episode loads
  useEffect(() => {
    if (episode?.qualities?.length) {
      setQualityKey(episode.qualities[0].key);
    } else if (episode?._id) {
      setQualityKey('default');
    }
  }, [episode]);

  const src = useMemo(() => {
    if (!episodeId || !qualityKey) return '';
    return streamUrl(episodeId, qualityKey, token);
  }, [episodeId, qualityKey, token]);

  // Attach native video event listeners for state mirroring
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrent(v.currentTime);
    const onMeta = () => setDuration(v.duration || 0);
    const onPlayEvt = () => setPlaying(true);
    const onPauseEvt = () => setPlaying(false);
    const onFs = () => setFs(!!document.fullscreenElement);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('play', onPlayEvt);
    v.addEventListener('pause', onPauseEvt);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('play', onPlayEvt);
      v.removeEventListener('pause', onPauseEvt);
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, [src]);

  // Sync effect: react to server-driven state changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return;

    // Drift recovery: only snap if drift > 2s AND it's a new sync event
    const drift = Math.abs(v.currentTime - serverVideoTime);
    if (drift > 2 && lastSync.current !== serverVideoTime) {
      lastSync.current = serverVideoTime;
      v.currentTime = serverVideoTime;
    }

    if (isPlaying && v.paused) {
      v.play().catch(() => {});
    } else if (!isPlaying && !v.paused) {
      v.pause();
    }
  }, [isPlaying, serverVideoTime, src]);

  // Host control emitters
  const handlePlay = useCallback(() => {
    if (!isHost || !socket) return;
    const v = videoRef.current;
    socket.emit('watch_room_control', { roomId, action: 'play', payload: { time: v?.currentTime || 0 } });
  }, [isHost, socket, roomId]);

  const handlePause = useCallback(() => {
    if (!isHost || !socket) return;
    const v = videoRef.current;
    socket.emit('watch_room_control', { roomId, action: 'pause', payload: { time: v?.currentTime || 0 } });
  }, [isHost, socket, roomId]);

  const handleSeeked = useCallback(() => {
    if (!isHost || !socket) return;
    const v = videoRef.current;
    socket.emit('watch_room_control', { roomId, action: 'seek', payload: { time: v?.currentTime || 0 } });
  }, [isHost, socket, roomId]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || !isHost) return;
    if (v.paused) v.play();
    else v.pause();
  };

  const seek = (t) => {
    const v = videoRef.current;
    if (!v || !isHost) return;
    v.currentTime = Math.max(0, Math.min(t, duration || v.duration));
  };

  const toggleFullscreen = () => {
    const el = videoRef.current?.parentElement;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-black ring-1 ring-slate-300 dark:ring-white/10 shadow-2xl group">
      <video
        ref={videoRef}
        key={src}
        src={src}
        onClick={togglePlay}
        tabIndex={isHost ? "0" : "-1"}
        className={`w-full aspect-video bg-black ${isHost ? 'cursor-pointer' : 'pointer-events-none'}`}
        playsInline
        preload="metadata"
        onPlay={handlePlay}
        onPause={handlePause}
        onSeeked={handleSeeked}
        onEnded={onEnded}
        onRateChange={() => {
          const v = videoRef.current;
          if (v) setRate(v.playbackRate);
        }}
      />

      {/* Viewer overlay - blocks click-to-pause since host controls play state */}
      {!isHost && (
        <div className="absolute inset-0 z-10" title="Host controls playback" />
      )}

      {/* Viewer sync status badge */}
      {!isHost && (
        <div className="absolute top-3 left-3 z-20 pointer-events-none">
          <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-white text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'}`} />
            {isPlaying ? 'Synced' : 'Paused'}
          </span>
        </div>
      )}

      {/* Controls - only visible for host */}
      {isHost && (
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/90 to-transparent pointer-events-auto">
          <div className="flex items-center gap-2 text-xs text-slate-300 flex-wrap">
            <button
              type="button"
              onClick={togglePlay}
              title={playing ? 'Pause' : 'Play'}
              className="p-1.5 rounded-lg bg-teal-600/90 hover:bg-teal-500 text-white transition-colors"
            >
              {playing ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              )}
            </button>
            <span>{formatTime(current)} / {formatTime(duration)}</span>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={Math.min(current, duration || 1)}
              onChange={(e) => seek(Number(e.target.value))}
              className="flex-1 min-w-[120px] accent-teal-500"
            />
            <label className="flex items-center gap-1">
              Vol
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  const nv = Number(e.target.value);
                  setVolume(nv);
                  if (videoRef.current) {
                    videoRef.current.volume = nv;
                    videoRef.current.muted = nv === 0;
                  }
                  setMuted(nv === 0);
                }}
                className="w-24 accent-teal-500"
              />
            </label>
            {episode?.qualities?.length > 1 && (
              <select
                value={qualityKey}
                onChange={(e) => setQualityKey(e.target.value)}
                className="bg-white/95 text-slate-900 border border-slate-200 rounded px-2 py-1 text-xs dark:bg-charcoal-900 dark:text-slate-100 dark:border-white/10"
              >
                {episode.qualities.map((q) => (
                  <option key={q.key} value={q.key}>{q.key}</option>
                ))}
              </select>
            )}
            <select
              value={rate}
              onChange={(e) => {
                const r = Number(e.target.value);
                setRate(r);
                if (videoRef.current) videoRef.current.playbackRate = r;
              }}
              className="bg-white/95 text-slate-900 border border-slate-200 rounded px-2 py-1 text-xs dark:bg-charcoal-900 dark:text-slate-100 dark:border-white/10"
            >
              {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((r) => (
                <option key={r} value={r}>{r}x</option>
              ))}
            </select>
            <button
              type="button"
              onClick={toggleFullscreen}
              title={fs ? 'Exit Fullscreen' : 'Fullscreen'}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors ml-auto"
            >
              {fs ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
              )}
            </button>
          </div>
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
}
