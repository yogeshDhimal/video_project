import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { Field, Flash, inputClass, Panel } from './adminUi';

function loadStored(key, fallback = '') {
  try {
    return sessionStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export default function AdminEpisodeNew() {
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);
  const [seriesList, setSeriesList] = useState([]);
  const [seasonsOptions, setSeasonsOptions] = useState([]);
  const [lastSub, setLastSub] = useState(() => {
    try {
      const raw = sessionStorage.getItem('sv_admin_last_sub');
      return raw ? JSON.parse(raw) : { fileName: '', format: 'vtt' };
    } catch {
      return { fileName: '', format: 'vtt' };
    }
  });

  const [form, setForm] = useState(() => ({
    seriesId: '',
    seasonId: '',
    number: 1,
    title: '',
    description: '',
    durationSeconds: 0,
    qualityKey: '1080p',
    videoFileName: loadStored('sv_admin_last_video', ''),
    thumbnailPath: loadStored('sv_admin_last_epthumb', ''),
    introStartSec: 0,
    introEndSec: 0,
    outroStartSec: 0,
    outroEndSec: 0,
    subLang: 'en',
    subLabel: 'English',
  }));

  const loadSeries = useCallback(async () => {
    const { data } = await api.get('/series', { params: { limit: 200, page: 1, includeDrafts: '1' } });
    setSeriesList(data.items || []);
  }, []);

  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  const loadSeasons = async (seriesId) => {
    if (!seriesId) {
      setSeasonsOptions([]);
      setForm((f) => ({ ...f, seriesId: '', seasonId: '' }));
      return;
    }
    try {
      const { data } = await api.get(`/series/${seriesId}`);
      setSeasonsOptions(data.seasons || []);
      setForm((f) => ({
        ...f,
        seriesId,
        seasonId: data.seasons?.[0]?.season?._id || '',
      }));
    } catch {
      setSeasonsOptions([]);
    }
  };

  const flash = (type, text) => {
    setMsg({ type, text });
    if (text) setTimeout(() => setMsg({ type: '', text: '' }), 8000);
  };

  const uploadVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('video', file);
      const { data } = await api.post('/uploads/video', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      sessionStorage.setItem('sv_admin_last_video', data.fileName);
      setForm((f) => ({ ...f, videoFileName: data.fileName }));
      flash('ok', `Video: ${data.fileName}`);
    } catch (err) {
      flash('err', err.response?.data?.message || 'Upload failed');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const uploadSub = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('subtitle', file);
      const { data } = await api.post('/uploads/subtitle', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const sub = { fileName: data.fileName, format: data.format };
      sessionStorage.setItem('sv_admin_last_sub', JSON.stringify(sub));
      setLastSub(sub);
      flash('ok', `Subtitle: ${data.fileName}`);
    } catch (err) {
      flash('err', err.response?.data?.message || 'Failed');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.seasonId || !form.videoFileName) {
      flash('err', 'Select season and provide video file (upload or paste file name).');
      return;
    }
    setBusy(true);
    try {
      const qualities = [{ key: form.qualityKey || '1080p', fileName: form.videoFileName }];
      const subtitles = [];
      if (lastSub.fileName) {
        subtitles.push({
          lang: form.subLang,
          label: form.subLabel || form.subLang,
          fileName: lastSub.fileName,
          format: lastSub.format === 'srt' ? 'srt' : 'vtt',
        });
      }
      const { data } = await api.post('/episodes', {
        seasonId: form.seasonId,
        number: Number(form.number),
        title: form.title,
        description: form.description,
        durationSeconds: Number(form.durationSeconds) || 0,
        qualities,
        subtitles,
        thumbnailPath: form.thumbnailPath || undefined,
        introStartSec: Number(form.introStartSec) || 0,
        introEndSec: Number(form.introEndSec) || 0,
        outroStartSec: Number(form.outroStartSec) || 0,
        outroEndSec: Number(form.outroEndSec) || 0,
      });
      flash('ok', `Episode ready — watch at /watch/${data.episode._id}`);
    } catch (err) {
      flash('err', err.response?.data?.message || JSON.stringify(err.response?.data) || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Flash msg={msg} />
      <Panel
        title="New episode"
        subtitle="Link an uploaded video file to a season. Upload the video here or on the Media page."
      >
        <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-black/25 border border-slate-200 dark:border-white/10">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-2">Quick upload</p>
          <input
            type="file"
            accept=".mp4,.mkv,.webm"
            onChange={uploadVideo}
            disabled={busy}
            className="text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:bg-teal-600 file:text-white file:border-0"
          />
          <input
            type="file"
            accept=".vtt,.srt"
            onChange={uploadSub}
            disabled={busy}
            className="block mt-3 text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:bg-slate-600 file:text-white file:border-0"
          />
        </div>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Series *">
              <select
                className={inputClass}
                value={form.seriesId}
                onChange={(e) => loadSeasons(e.target.value)}
                required
              >
                <option value="">Select…</option>
                {seriesList.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Season *">
              <select
                className={inputClass}
                value={form.seasonId}
                onChange={(e) => setForm((f) => ({ ...f, seasonId: e.target.value }))}
                required
              >
                <option value="">Select…</option>
                {seasonsOptions.map((block) => (
                  <option key={block.season._id} value={block.season._id}>
                    Season {block.season.number}
                    {block.season.title ? ` — ${block.season.title}` : ''}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Episode # *">
              <input
                type="number"
                min={1}
                className={inputClass}
                value={form.number}
                onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                required
              />
            </Field>
            <Field label="Episode title *">
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
            </Field>
            <Field label="Quality label">
              <input
                className={inputClass}
                value={form.qualityKey}
                onChange={(e) => setForm((f) => ({ ...f, qualityKey: e.target.value }))}
              />
            </Field>
            <Field label="Video file name *">
              <input
                className={inputClass}
                value={form.videoFileName}
                onChange={(e) => setForm((f) => ({ ...f, videoFileName: e.target.value }))}
                required
              />
            </Field>
            <Field label="Duration (seconds)">
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.durationSeconds}
                onChange={(e) => setForm((f) => ({ ...f, durationSeconds: e.target.value }))}
              />
            </Field>
            <Field label="Episode thumbnail file name">
              <input
                className={inputClass}
                value={form.thumbnailPath}
                onChange={(e) => setForm((f) => ({ ...f, thumbnailPath: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              className={`${inputClass} min-h-[80px]`}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Field label="Intro start (s)">
              <input
                type="number"
                className={inputClass}
                value={form.introStartSec}
                onChange={(e) => setForm((f) => ({ ...f, introStartSec: e.target.value }))}
              />
            </Field>
            <Field label="Intro end (s)">
              <input
                type="number"
                className={inputClass}
                value={form.introEndSec}
                onChange={(e) => setForm((f) => ({ ...f, introEndSec: e.target.value }))}
              />
            </Field>
            <Field label="Outro start (s)">
              <input
                type="number"
                className={inputClass}
                value={form.outroStartSec}
                onChange={(e) => setForm((f) => ({ ...f, outroStartSec: e.target.value }))}
              />
            </Field>
            <Field label="Outro end (s)">
              <input
                type="number"
                className={inputClass}
                value={form.outroEndSec}
                onChange={(e) => setForm((f) => ({ ...f, outroEndSec: e.target.value }))}
              />
            </Field>
          </div>
          {lastSub.fileName && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Subtitle language">
                <input
                  className={inputClass}
                  value={form.subLang}
                  onChange={(e) => setForm((f) => ({ ...f, subLang: e.target.value }))}
                />
              </Field>
              <Field label="Subtitle label">
                <input
                  className={inputClass}
                  value={form.subLabel}
                  onChange={(e) => setForm((f) => ({ ...f, subLabel: e.target.value }))}
                />
              </Field>
            </div>
          )}
          <div className="flex flex-wrap gap-3 pt-4">
            <button
              type="submit"
              disabled={busy}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold disabled:opacity-50"
            >
              Publish episode
            </button>
            <Link
              to="/admin/media"
              className="px-6 py-3 rounded-xl border border-slate-200 text-sm font-medium dark:border-white/10"
            >
              Media library
            </Link>
          </div>
        </form>
      </Panel>
    </div>
  );
}
