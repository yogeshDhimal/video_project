import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '../api/client';
import { Flash, Panel } from './adminUi';

const STORAGE_KEY = 'sv_admin_media_panel_v2';

function syncLegacySessionKeys(payload) {
  try {
    if (payload.video?.fileName) sessionStorage.setItem('sv_admin_last_video', payload.video.fileName);
    else sessionStorage.removeItem('sv_admin_last_video');
    if (payload.poster?.fileName) sessionStorage.setItem('sv_admin_last_poster', payload.poster.fileName);
    else sessionStorage.removeItem('sv_admin_last_poster');
    if (payload.epThumb?.fileName) sessionStorage.setItem('sv_admin_last_epthumb', payload.epThumb.fileName);
    else sessionStorage.removeItem('sv_admin_last_epthumb');
    if (payload.sub?.fileName) {
      sessionStorage.setItem(
        'sv_admin_last_sub',
        JSON.stringify({ fileName: payload.sub.fileName, format: payload.sub.format || 'vtt' })
      );
    } else sessionStorage.removeItem('sv_admin_last_sub');
  } catch {
    /* ignore */
  }
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.version === 2 && parsed.data) return parsed.data;
    }
  } catch {
    /* ignore */
  }
  try {
    return {
      video: {
        fileName: sessionStorage.getItem('sv_admin_last_video') || '',
        originalName: '',
      },
      poster: {
        fileName: sessionStorage.getItem('sv_admin_last_poster') || '',
        originalName: '',
      },
      epThumb: {
        fileName: sessionStorage.getItem('sv_admin_last_epthumb') || '',
        originalName: '',
      },
      sub: (() => {
        const s = sessionStorage.getItem('sv_admin_last_sub');
        if (!s) return { fileName: '', originalName: '', format: '' };
        try {
          const j = JSON.parse(s);
          return { fileName: j.fileName || '', originalName: '', format: j.format || '' };
        } catch {
          return { fileName: '', originalName: '', format: '' };
        }
      })(),
    };
  } catch {
    return {
      video: { fileName: '', originalName: '' },
      poster: { fileName: '', originalName: '' },
      epThumb: { fileName: '', originalName: '' },
      sub: { fileName: '', originalName: '', format: '' },
    };
  }
}

function persistAll(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, data }));
    syncLegacySessionKeys(data);
  } catch {
    /* ignore */
  }
}

export default function AdminMedia() {
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busySlot, setBusySlot] = useState(null);
  const [media, setMedia] = useState(() => loadFromStorage());
  const [uploadProgress, setUploadProgress] = useState({ slot: null, percent: 0, phase: 'idle' });

  useEffect(() => {
    setMedia(loadFromStorage());
  }, []);

  const flash = (type, text) => {
    setMsg({ type, text });
    if (text) setTimeout(() => setMsg({ type: '', text: '' }), 7000);
  };

  const saveSnapshot = useCallback((next) => {
    persistAll(next);
    setMedia(next);
  }, []);

  const handleSaveClick = () => {
    persistAll(media);
    toast.success('Media list saved — it will stay after you leave this page.');
  };

  const upload = async (e, slot) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusySlot(slot);
    if (slot === 'video') {
      setUploadProgress({ slot: 'video', percent: 0, phase: 'uploading' });
    }
    try {
      const fd = new FormData();
      const axiosOpts = {
        headers: { 'Content-Type': 'multipart/form-data' },
      };
      if (slot === 'video') {
        axiosOpts.onUploadProgress = (ev) => {
          if (ev.total) {
            setUploadProgress({
              slot: 'video',
              percent: Math.min(100, Math.round((ev.loaded / ev.total) * 100)),
              phase: 'uploading',
            });
          }
        };
      }

      let next = { ...media };
      if (slot === 'video') {
        fd.append('video', file);
        const { data } = await api.post('/uploads/video', fd, axiosOpts);
        next = {
          ...next,
          video: { fileName: data.fileName, originalName: data.originalName || file.name },
        };
        setUploadProgress({ slot: 'video', percent: 100, phase: 'complete' });
        flash('ok', `Video saved as “${data.fileName}”. Use this exact name in episode qualities.`);
        toast.success('Video upload complete');
        setTimeout(() => setUploadProgress({ slot: null, percent: 0, phase: 'idle' }), 1600);
      } else if (slot === 'poster' || slot === 'epThumb') {
        fd.append('thumbnail', file);
        const { data } = await api.post('/uploads/thumbnail', fd, axiosOpts);
        const entry = { fileName: data.fileName, originalName: data.originalName || file.name };
        next = { ...next, [slot === 'poster' ? 'poster' : 'epThumb']: entry };
        flash('ok', `Image saved as “${data.fileName}”.`);
        toast.success('Image upload complete');
      } else if (slot === 'sub') {
        fd.append('subtitle', file);
        const { data } = await api.post('/uploads/subtitle', fd, axiosOpts);
        next = {
          ...next,
          sub: {
            fileName: data.fileName,
            originalName: data.originalName || file.name,
            format: data.format || 'vtt',
          },
        };
        flash('ok', `Subtitle saved as “${data.fileName}”.`);
        toast.success('Subtitle upload complete');
      }

      saveSnapshot(next);
    } catch (err) {
      if (slot === 'video') {
        setUploadProgress({ slot: 'video', percent: 0, phase: 'error' });
        setTimeout(() => setUploadProgress({ slot: null, percent: 0, phase: 'idle' }), 2000);
      }
      const m = err.response?.data?.message || 'Upload failed';
      flash('err', m);
      toast.error(m);
    } finally {
      setBusySlot(null);
      e.target.value = '';
    }
  };

  const rows = [
    { slot: 'video', label: 'Video file', accept: '.mp4,.mkv,.webm', hint: 'MP4, MKV, WebM — progress shown while uploading' },
    { slot: 'poster', label: 'Series poster', accept: 'image/*', hint: 'JPEG, PNG, WebP' },
    { slot: 'epThumb', label: 'Episode thumbnail', accept: 'image/*', hint: 'Optional key art' },
    { slot: 'sub', label: 'Subtitle track', accept: '.vtt,.srt', hint: 'VTT or SRT' },
  ];

  const storedLine = (slot) => {
    if (slot === 'sub') {
      const s = media.sub;
      if (!s?.fileName) return null;
      return `${s.fileName}${s.format ? ` · ${s.format}` : ''}`;
    }
    const m = media[slot];
    if (!m?.fileName) return null;
    return m.fileName;
  };

  const originalNameFor = (slot) => {
    if (slot === 'sub') return media.sub?.originalName || '';
    return media[slot]?.originalName || '';
  };

  const fileNameFor = (slot) => {
    if (slot === 'sub') return media.sub?.fileName || '';
    return media[slot]?.fileName || '';
  };

  return (
    <div className="space-y-6">
      <Flash msg={msg} />
      <Panel
        title="Upload to server"
        subtitle="Files keep your original filename when possible (special characters are sanitized). If a file with the same name already exists, _1, _2… is added. Your last uploads are saved in the browser until you change them."
      >
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-6 border-b border-slate-100 dark:border-white/5">
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xl">
            After uploading, use <strong className="text-slate-800 dark:text-slate-200">Save media list</strong> to pin
            the current file names (also auto-saved on each successful upload).
          </p>
          <button
            type="button"
            onClick={handleSaveClick}
            className="shrink-0 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold shadow-sm"
          >
            Save media list
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {rows.map((row) => (
            <div
              key={row.slot}
              className="rounded-xl border border-dashed border-slate-200 dark:border-white/10 p-4 bg-slate-50/50 dark:bg-black/20"
            >
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{row.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 mb-3">{row.hint}</p>
              <input
                type="file"
                accept={row.accept}
                onChange={(e) => upload(e, row.slot)}
                disabled={busySlot !== null}
                className="text-xs w-full file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-teal-600 file:text-white file:text-xs file:font-medium disabled:opacity-50"
              />

              {row.slot === 'video' && uploadProgress.slot === 'video' && uploadProgress.phase === 'uploading' && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                    <span>Uploading…</span>
                    <span>{uploadProgress.percent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-teal-500 transition-[width] duration-150 ease-out"
                      style={{ width: `${uploadProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}

              {row.slot === 'video' && uploadProgress.slot === 'video' && uploadProgress.phase === 'complete' && (
                <p className="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400">Upload complete</p>
              )}

              {row.slot === 'video' && uploadProgress.slot === 'video' && uploadProgress.phase === 'error' && (
                <p className="mt-3 text-xs font-medium text-red-600 dark:text-red-400">Upload failed — try again.</p>
              )}

              {busySlot === row.slot && row.slot !== 'video' && (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                  <span className="inline-block h-3.5 w-3.5 rounded-full border border-slate-300 border-t-teal-600 animate-spin dark:border-white/20 dark:border-t-teal-400" />
                  Uploading…
                </p>
              )}

              {storedLine(row.slot) && (
                <div className="mt-3 space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-500">Stored on server</p>
                  <p className="text-xs font-mono text-teal-700 dark:text-teal-400 break-all">{storedLine(row.slot)}</p>
                  {originalNameFor(row.slot) &&
                    originalNameFor(row.slot) !== fileNameFor(row.slot) && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-500">
                        Your file was named: <span className="font-mono">{originalNameFor(row.slot)}</span>
                      </p>
                    )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
