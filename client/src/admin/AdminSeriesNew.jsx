import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../api/client';
import { validatePublishedSeriesFields } from '../utils/seriesPublishValidation';
import { Field, Flash, inputClass, Panel } from './adminUi';

const steps = [
  { n: 1, label: 'Basics' },
  { n: 2, label: 'Details & publish' },
];

function StepIndicator({ current }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s.n} className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              current >= s.n ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-500'
            }`}
          >
            {s.n}
          </div>
          <span
            className={`text-sm font-medium truncate ${
              current === s.n ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-500'
            }`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div
              className={`hidden sm:block flex-1 h-0.5 mx-2 rounded ${current > s.n ? 'bg-teal-500' : 'bg-slate-200 dark:bg-white/10'}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function AdminSeriesNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(1);
  const [seriesId, setSeriesId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    genres: '',
    releaseYear: String(new Date().getFullYear()),
    type: 'series',
    posterPath: '',
    videoFile: '',
    thumbnailPath: '',
    subtitleFile: '',
    status: 'ongoing',
  });

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

  const flash = (type, text) => {
    setMsg({ type, text });
    if (text) setTimeout(() => setMsg({ type: '', text: '' }), 7000);
  };

  useEffect(() => {
    try {
      const p = sessionStorage.getItem('sv_admin_last_poster');
      if (p) setForm((f) => ({ ...f, posterPath: p }));
    } catch {
      /* ignore */
    }
  }, []);

  const draftParam = searchParams.get('draft');
  const stepParam = searchParams.get('step');

  useEffect(() => {
    if (!draftParam) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/series/${draftParam}`);
        if (cancelled || !data.series) return;
        const s = data.series;
        setSeriesId(s._id);
        setForm({
          title: s.title || '',
          description: s.description || '',
          genres: (s.genres || []).join(', '),
          releaseYear: s.releaseYear != null ? String(s.releaseYear) : '',
          type: s.type || 'series',
          posterPath: s.posterPath || '',
          videoFile: s.videoFile || '',
          thumbnailPath: s.thumbnailPath || '',
          subtitleFile: s.subtitleFile || '',
          status: s.status || 'ongoing',
        });
        const wantStep = stepParam === '1' ? 1 : 2;
        setStep(wantStep);
      } catch {
        setMsg({ type: 'err', text: 'Could not load draft.' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [draftParam, stepParam]);

  const buildPayload = (catalogStatus) => {
    const genres = form.genres
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);
    const year = form.releaseYear.trim() ? Number(form.releaseYear) : undefined;
    return {
      title: form.title.trim(),
      description: form.description,
      genres,
      releaseYear: Number.isFinite(year) ? year : undefined,
      type: form.type,
      posterPath: form.posterPath.trim() || undefined,
      videoFile: form.videoFile.trim() || undefined,
      thumbnailPath: form.thumbnailPath.trim() || undefined,
      subtitleFile: form.subtitleFile.trim() || undefined,
      status: form.status,
      catalogStatus,
    };
  };

  const saveDraft = async (e) => {
    e?.preventDefault();
    if (!form.title.trim()) {
      flash('err', 'Title is required.');
      return;
    }
    setBusy(true);
    try {
      const body = buildPayload('draft');
      if (seriesId) {
        await api.patch(`/series/${seriesId}`, body);
      } else {
        const { data } = await api.post('/series', body);
        setSeriesId(data.series._id);
      }
      flash('ok', 'Draft saved.');
      navigate('/admin/series/drafts');
    } catch (err) {
      flash('err', err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const goNext = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      flash('err', 'Enter a title to continue.');
      return;
    }
    setBusy(true);
    try {
      const body = buildPayload('draft');
      if (seriesId) {
        await api.patch(`/series/${seriesId}`, body);
      } else {
        const { data } = await api.post('/series', body);
        setSeriesId(data.series._id);
      }
      setStep(2);
      flash('ok', 'Step 2 — add details or publish when ready.');
    } catch (err) {
      flash('err', err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const publish = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      flash('err', 'Title is required.');
      toast.error('Title is required.');
      return;
    }
    const genresArr = form.genres
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);
    const yearRaw = form.releaseYear.trim();
    const pubErr = validatePublishedSeriesFields({
      description: form.description,
      genres: genresArr,
      posterPath: form.posterPath,
      releaseYear: yearRaw ? Number(yearRaw) : '',
    });
    if (pubErr) {
      toast.error(pubErr);
      flash('err', pubErr);
      return;
    }
    setBusy(true);
    try {
      const body = { ...buildPayload('published') };
      let id = seriesId;
      if (seriesId) {
        await api.patch(`/series/${seriesId}`, body);
      } else {
        const { data } = await api.post('/series', body);
        id = data.series._id;
        setSeriesId(id);
      }
      if (form.type === 'movie') {
        flash('ok', 'Movie published to the catalog.');
        toast.success('Movie published');
        setTimeout(() => navigate(`/series/${id}`), 600);
      } else {
        flash('ok', 'Series published to the catalog. Next: add a season.');
        toast.success('Series published');
        setTimeout(() => navigate(`/admin/seasons?series=${id}`), 600);
      }
    } catch (err) {
      const m = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to publish';
      flash('err', m);
      toast.error(m);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Flash msg={msg} />
      <Panel
        title="Add series"
        subtitle="Step through basics, then details. Save a draft anytime — find it under Drafts."
      >
        <StepIndicator current={step} />

        {step === 1 && (
          <form onSubmit={goNext} className="space-y-5 max-w-2xl">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Title *">
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. The Night Shift"
                  required
                />
              </Field>
              <Field label="Type">
                <select
                  className={inputClass}
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="series">Series</option>
                  <option value="movie">Movie</option>
                </select>
              </Field>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              You can add description, genres, and poster on the next step. Use <strong>Save as draft</strong> to pause
              after naming the show.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={saveDraft}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5 disabled:opacity-50"
              >
                Save as draft
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                Next: details →
              </button>
              <Link
                to="/admin/guide"
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-teal-700 dark:text-teal-400 hover:underline"
              >
                How this works
              </Link>
            </div>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={publish} className="space-y-5 max-w-2xl">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Release year *">
                <input
                  type="number"
                  className={inputClass}
                  value={form.releaseYear}
                  onChange={(e) => setForm((f) => ({ ...f, releaseYear: e.target.value }))}
                  min={1900}
                  max={2100}
                />
              </Field>
              <Field label="Show status">
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="hiatus">Hiatus</option>
                </select>
              </Field>
              <Field label="Poster image *" className="sm:col-span-2">
                <input
                  type="file"
                  accept="image/*"
                  className={inputClass}
                  onChange={(e) => handleFileUpload(e, 'poster', 'poster', 'posterPath')}
                  disabled={busy}
                />
                {form.posterPath && <div className="text-xs text-teal-600 mt-1 dark:text-teal-400">Selected: {form.posterPath}</div>}
              </Field>
              {form.type === 'movie' && (
                <>
                  <Field label="Video file (MP4, MKV)">
                    <input
                      type="file"
                      accept=".mp4,.mkv,.webm"
                      className={inputClass}
                      onChange={(e) => handleFileUpload(e, 'video', 'video', 'videoFile')}
                      disabled={busy}
                    />
                    {form.videoFile && <div className="text-xs text-teal-600 mt-1 dark:text-teal-400">Selected: {form.videoFile}</div>}
                  </Field>
                  <Field label="Thumbnail image">
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
                      onChange={(e) => handleFileUpload(e, 'subtitle', 'subtitle', 'subtitleFile')}
                      disabled={busy}
                    />
                    {form.subtitleFile && <div className="text-xs text-teal-600 mt-1 dark:text-teal-400">Selected: {form.subtitleFile}</div>}
                  </Field>
                </>
              )}
            </div>
            <Field label="Genres * (comma-separated)">
              <input
                className={inputClass}
                value={form.genres}
                onChange={(e) => setForm((f) => ({ ...f, genres: e.target.value }))}
                placeholder="Drama, Thriller"
              />
            </Field>
            <Field label="Description * (min. 20 characters)">
              <textarea
                className={`${inputClass} min-h-[120px]`}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Field>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
              >
                ← Back
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={saveDraft}
                className="px-5 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-sm font-semibold text-amber-900 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60"
              >
                Save as draft
              </button>
              <Link
                to="/admin/media"
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5 inline-flex items-center"
              >
                Media uploads
              </Link>
              <button
                type="submit"
                disabled={busy}
                className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                Publish to catalog
              </button>
            </div>
          </form>
        )}
      </Panel>
    </div>
  );
}
