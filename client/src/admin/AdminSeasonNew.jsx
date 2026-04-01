import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../api/client';
import { Field, Flash, inputClass, Panel } from './adminUi';

export default function AdminSeasonNew() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const preSeries = search.get('series');

  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);
  const [seriesList, setSeriesList] = useState([]);
  const [createdSeasonId, setCreatedSeasonId] = useState('');
  const [form, setForm] = useState({
    seriesId: preSeries || '',
    number: 1,
    title: '',
  });

  const loadSeries = useCallback(async () => {
    const { data } = await api.get('/series', { params: { limit: 200, page: 1, includeDrafts: '1', type: 'series' } });
    setSeriesList(data.items || []);
  }, []);

  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  useEffect(() => {
    if (preSeries) setForm((f) => ({ ...f, seriesId: preSeries }));
  }, [preSeries]);

  const flash = (type, text) => {
    setMsg({ type, text });
    if (text) setTimeout(() => setMsg({ type: '', text: '' }), 6000);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.seriesId) {
      flash('err', 'Select a series');
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.post(`/series/${form.seriesId}/seasons`, {
        number: Number(form.number),
        title: form.title || undefined,
      });
      setCreatedSeasonId(data.season._id);
      toast.success(`Season ${data.season.number} created. Navigating...`);
      setTimeout(() => navigate(`/admin/episodes?series=${form.seriesId}&season=${data.season._id}`), 600);
    } catch (err) {
      flash('err', err.response?.data?.message || 'Failed');
      toast.error('Failed to create season');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Flash msg={msg} />
      <Panel
        title="New season"
        subtitle="Each series has numbered seasons. Movies typically use season 1 only."
      >
        <form onSubmit={submit} className="space-y-5 max-w-xl">
          <Field label="Series *">
            <select
              className={inputClass}
              value={form.seriesId}
              onChange={(e) => setForm((f) => ({ ...f, seriesId: e.target.value }))}
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
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Season number *">
              <input
                type="number"
                min={1}
                className={inputClass}
                value={form.number}
                onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                required
              />
            </Field>
            <Field label="Season title (optional)">
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Part One"
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={busy}
              className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold disabled:opacity-50"
            >
              Create season
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
