import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../api/client';
import { Field, Flash, inputClass, Panel } from './adminUi';

export default function AdminEpisodeNew() {
  const [searchParams] = useSearchParams();
  const preSeries = searchParams.get('series') || '';
  const preSeason = searchParams.get('season') || '';

  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);
  const [seriesList, setSeriesList] = useState([]);
  const [seasonsOptions, setSeasonsOptions] = useState([]);

  const [form, setForm] = useState(() => ({
    seriesId: preSeries,
    seasonId: preSeason,
    number: 1,
    title: '',
    description: '',
    qualityKey: '1080p',
    videoFileName: '',
    thumbnailPath: '',
    subtitleFileName: '',
    introStartSec: 0,
    introEndSec: 0,
    outroStartSec: 0,
    outroEndSec: 0,
    subLang: 'en',
    subLabel: 'English',
  }));

  const handleFileUpload = async (e, field, endpoint, formKey) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const body = new FormData();
    body.append(field, file);
    setBusy(true);
    let tid;
    if (field === 'video') {
      tid = toast.loading('Uploading video...');
    }
    try {
      const { data } = await api.post(`/uploads/${endpoint}`, body);
      setForm((f) => ({ ...f, [formKey]: data.fileName }));
      if (tid) toast.success('Video uploaded', { id: tid });
      else flash('ok', `Uploaded ${file.name}`);
    } catch (err) {
      const m = err.response?.data?.message || 'Upload failed';
      if (tid) toast.error(m, { id: tid });
      else flash('err', m);
    } finally {
      setBusy(false);
    }
  };

  const loadSeries = useCallback(async () => {
    const { data } = await api.get('/series', { params: { limit: 200, page: 1, includeDrafts: '1', type: 'series' } });
    setSeriesList(data.items || []);
  }, []);

  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  const loadSeasons = useCallback(async (seriesId, defaultSeasonId = '') => {
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
        seasonId: defaultSeasonId || data.seasons?.[0]?.season?._id || '',
      }));
    } catch {
      setSeasonsOptions([]);
    }
  }, []);

  useEffect(() => {
    if (preSeries) {
      loadSeasons(preSeries, preSeason);
    }
  }, [preSeries, preSeason, loadSeasons]);

  const flash = (type, text) => {
    setMsg({ type, text });
    if (text) setTimeout(() => setMsg({ type: '', text: '' }), 8000);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.seasonId || !form.videoFileName) {
      flash('err', 'Select season and provide video file.');
      toast.error('Season and video file required.');
      return;
    }
    setBusy(true);
    try {
      const qualities = [{ key: form.qualityKey || '1080p', fileName: form.videoFileName }];
      const subtitles = [];
      if (form.subtitleFileName) {
        subtitles.push({
          lang: form.subLang,
          label: form.subLabel || form.subLang,
          fileName: form.subtitleFileName,
          format: form.subtitleFileName.endsWith('.srt') ? 'srt' : 'vtt',
        });
      }
      const { data } = await api.post('/episodes', {
        seasonId: form.seasonId,
        number: Number(form.number),
        title: form.title,
        description: form.description,
        qualities,
        subtitles,
        thumbnailPath: form.thumbnailPath || undefined,
        introStartSec: Number(form.introStartSec) || 0,
        introEndSec: Number(form.introEndSec) || 0,
        outroStartSec: Number(form.outroStartSec) || 0,
        outroEndSec: Number(form.outroEndSec) || 0,
      });
      flash('ok', `Episode ready — watch at /watch/${data.episode._id}`);
      toast.success('Episode created successfully!');
      setForm((f) => ({
        ...f,
        number: Number(f.number) + 1,
        title: '',
        description: '',
        videoFileName: '',
        thumbnailPath: '',
        subtitleFileName: '',
        introStartSec: 0,
        introEndSec: 0,
        outroStartSec: 0,
        outroEndSec: 0,
      }));
      e.target.reset();
    } catch (err) {
      toast.error('Failed to create episode');
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
        subtitle="Upload an episode to your selected season. The form resets after publishing."
      >
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
            <Field label="Video file (MP4, MKV) *">
              <input
                type="file"
                accept=".mp4,.mkv,.webm"
                className={inputClass}
                onChange={(e) => handleFileUpload(e, 'video', 'video', 'videoFileName')}
                disabled={busy}
                required={!form.videoFileName}
              />
              {form.videoFileName && <div className="text-xs text-teal-600 mt-1 dark:text-teal-400">Selected: {form.videoFileName}</div>}
            </Field>
            <Field label="Episode thumbnail image">
              <input
                type="file"
                accept="image/*"
                className={inputClass}
                onChange={(e) => handleFileUpload(e, 'thumbnail', 'thumbnail', 'thumbnailPath')}
                disabled={busy}
              />
              {form.thumbnailPath && <div className="text-xs text-teal-600 mt-1 dark:text-teal-400">Selected: {form.thumbnailPath}</div>}
            </Field>
            <Field label="Subtitle (.vtt, .srt)" className="sm:col-span-2">
              <input
                type="file"
                accept=".vtt,.srt"
                className={inputClass}
                onChange={(e) => handleFileUpload(e, 'subtitle', 'subtitle', 'subtitleFileName')}
                disabled={busy}
              />
              {form.subtitleFileName && <div className="text-xs text-teal-600 mt-1 dark:text-teal-400">Selected: {form.subtitleFileName}</div>}
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
          {form.subtitleFileName && (
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
