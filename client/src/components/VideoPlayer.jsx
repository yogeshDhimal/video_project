import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/client';

function streamUrl(id, qualityKey, token, isSeries) {
  const q = new URLSearchParams();
  if (token) q.set('token', token);
  if (isSeries) return `/api/stream/series/${id}/video?${q.toString()}`;
  return `/api/stream/episode/${id}/quality/${qualityKey}?${q.toString()}`;
}

function subUrl(id, fileName, token, isSeries) {
  const q = new URLSearchParams();
  if (token) q.set('token', token);
  if (isSeries) return `/api/stream/series/${id}/subtitle/${encodeURIComponent(fileName)}?${q.toString()}`;
  return `/api/stream/subtitle/${id}/${encodeURIComponent(fileName)}?${q.toString()}`;
}

export default function VideoPlayer({
  episode,
  token,
  onEnded,
  onPrev,
  onNext,
  autoNextEnabled = true,
  introOutro = {},
  isSeries = false,
}) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [qualityKey, setQualityKey] = useState(episode?.qualities?.[0]?.key || 'default');
  const [subsOn, setSubsOn] = useState(true);
  const [selectedSub, setSelectedSub] = useState(0);
  const [fs, setFs] = useState(false);
  const sessionId = useMemo(() => Math.random().toString(36).slice(2), [episode?._id]);
  const lastSent = useRef(0);
  // Removed unused progressTimer ref (issue 3.5)

  const qualities = episode?.qualities || [];
  const subtitles = episode?.subtitles || [];

  useEffect(() => {
    if (qualities.length && !qualities.find((q) => q.key === qualityKey)) {
      setQualityKey(qualities[0].key);
    }
  }, [episode, qualities, qualityKey]);

  const src = useMemo(() => {
    if (!episode?._id || (!isSeries && !qualities.length)) return '';
    return streamUrl(episode._id, qualityKey, token, isSeries);
  }, [episode, qualityKey, qualities.length, token, isSeries]);

  const reportProgress = useCallback(
    async (sec, dur) => {
      try {
        await api.post('/watch-history/progress', {
          episodeId: episode._id,
          progressSeconds: sec,
          durationSeconds: dur,
        });
      } catch {
        /* ignore */
      }
    },
    [episode]
  );

  const reportAnalytics = useCallback(
    async (positionSeconds, deltaSeconds) => {
      try {
        await api.post('/analytics/session', {
          episodeId: episode._id,
          sessionId,
          positionSeconds,
          deltaSeconds,
        });
      } catch {
        /* ignore */
      }
    },
    [episode, sessionId]
  );

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    const onTime = () => {
      setCurrent(v.currentTime);
      const now = Date.now();
      if (now - lastSent.current > 8000) {
        lastSent.current = now;
        reportProgress(v.currentTime, v.duration || episode.durationSeconds);
        reportAnalytics(v.currentTime, 8);
      }
    };
    const onMeta = () => setDuration(v.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onFs = () => setFs(!!document.fullscreenElement);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, [episode, reportProgress, reportAnalytics]);

  useEffect(() => {
    return () => {
      const v = videoRef.current;
      if (v && episode?._id) {
        reportProgress(v.currentTime || 0, v.duration || episode.durationSeconds);
      }
    };
  }, [episode, reportProgress]);

  useEffect(() => {
    api.post(`/episodes/${episode._id}/view`).catch(() => {});
  }, [episode._id]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };

  const seek = (t) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(t, duration || v.duration));
  };

  const toggleFullscreen = () => {
    const el = videoRef.current?.parentElement;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const skipIntro = () => {
    const end = introOutro.introEndSec || episode.introEndSec;
    if (end) seek(end);
  };

  const skipOutro = () => {
    const end = introOutro.outroEndSec || episode.outroEndSec;
    if (end) seek(end);
    else if (duration) seek(duration);
  };

  const inIntro =
    (introOutro.introStartSec ?? episode.introStartSec ?? 0) <= current &&
    current < (introOutro.introEndSec ?? episode.introEndSec ?? 0);
  const inOutro =
    (introOutro.outroStartSec ?? episode.outroStartSec ?? 0) <= current &&
    current < (introOutro.outroEndSec ?? episode.outroEndSec ?? duration);

  return (
    <div className="relative rounded-xl overflow-hidden bg-black ring-1 ring-slate-300 dark:ring-white/10 shadow-2xl group">
      <video
        ref={videoRef}
        key={src}
        className="w-full aspect-video bg-black cursor-pointer"
        src={src}
        onClick={togglePlay}
        playsInline
        preload="metadata"
        onEnded={() => {
          if (autoNextEnabled && onEnded) onEnded();
        }}
        onRateChange={() => {
          const v = videoRef.current;
          if (v) setRate(v.playbackRate);
        }}
      >
        {subsOn &&
          subtitles[selectedSub] &&
          token && (
            <track
              kind="subtitles"
              srcLang={subtitles[selectedSub].lang}
              label={subtitles[selectedSub].label || subtitles[selectedSub].lang}
              src={subUrl(episode._id, subtitles[selectedSub].fileName, token, isSeries)}
              default
            />
          )}
      </video>

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/90 to-transparent pointer-events-auto">
        <div className="flex items-center gap-2 text-xs text-slate-300 flex-wrap">
          {onPrev && (
            <button onClick={onPrev} title="Previous Episode" type="button" className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
            </button>
          )}
          <button
            type="button"
            onClick={togglePlay}
            title={playing ? 'Pause' : 'Play'}
            className="p-1.5 rounded-lg bg-teal-600/90 hover:bg-teal-500 text-white transition-colors"
          >
            {playing ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            )}
          </button>
          {onNext && (
            <button onClick={onNext} title="Next Episode" type="button" className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>
            </button>
          )}
          <span>
            {formatTime(current)} / {formatTime(duration)}
          </span>
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
              <option key={r} value={r}>
                {r}x
              </option>
            ))}
          </select>
          {qualities.length > 1 && (
            <select
              value={qualityKey}
              onChange={(e) => setQualityKey(e.target.value)}
              className="bg-white/95 text-slate-900 border border-slate-200 rounded px-2 py-1 text-xs dark:bg-charcoal-900 dark:text-slate-100 dark:border-white/10"
            >
              {qualities.map((q) => (
                <option key={q.key} value={q.key}>
                  {q.key}
                </option>
              ))}
            </select>
          )}
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={subsOn} onChange={(e) => setSubsOn(e.target.checked)} />
            CC
          </label>
          {subtitles.length > 1 && (
            <select
              value={selectedSub}
              onChange={(e) => setSelectedSub(Number(e.target.value))}
              className="bg-white/95 text-slate-900 border border-slate-200 rounded px-2 py-1 text-xs dark:bg-charcoal-900 dark:text-slate-100 dark:border-white/10"
            >
              {subtitles.map((s, i) => (
                <option key={s.fileName} value={i}>
                  {s.label || s.lang}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={fs ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors ml-auto"
          >
            {fs ? (
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>
            ) : (
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
            )}
          </button>
        </div>
      </div>

      {(inIntro || inOutro) && (
        <div className="absolute top-4 right-4 flex gap-2">
          {inIntro && (episode.introEndSec || introOutro.introEndSec) > 0 && (
            <button
              type="button"
              onClick={skipIntro}
              className="px-4 py-2 rounded-lg bg-teal-600/90 text-white text-sm font-medium shadow-lg animate-fadeUp"
            >
              Skip intro
            </button>
          )}
          {inOutro && (
            <button
              type="button"
              onClick={skipOutro}
              className="px-4 py-2 rounded-lg bg-ice-500/20 text-ice-300 text-sm border border-ice-500/30"
            >
              Skip outro
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(s) {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}
