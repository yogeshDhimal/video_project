import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../api/client';
import Spinner from '../components/Spinner';
import { Flash, Panel } from './adminUi';

export default function AdminSeriesDrafts() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = () => {
    setLoading(true);
    api
      .get('/series', { params: { limit: 100, page: 1, includeDrafts: '1', catalogStatus: 'draft' } })
      .then((r) => setItems(r.data.items || []))
      .catch(() => {
        setMsg({ type: 'err', text: 'Failed to load drafts.' });
        toast.error('Failed to load drafts');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const publish = async (id) => {
    const dismiss = toast.loading('Publishing…');
    try {
      await api.patch(`/series/${id}`, { catalogStatus: 'published' });
      toast.dismiss(dismiss);
      toast.success('Published to catalog');
      setMsg({ type: 'ok', text: 'Published to catalog.' });
      load();
    } catch (e) {
      toast.dismiss(dismiss);
      const m = e.response?.data?.message || 'Could not publish';
      setMsg({ type: 'err', text: m });
      toast.error(m);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this draft permanently?')) return;
    try {
      await api.delete(`/series/${id}`);
      setMsg({ type: 'ok', text: 'Draft deleted.' });
      toast.success('Draft deleted');
      load();
    } catch (e) {
      const m = e.response?.data?.message || 'Failed to delete';
      setMsg({ type: 'err', text: m });
      toast.error(m);
    }
  };

  return (
    <div className="space-y-6">
      <Flash msg={msg} />
      <Panel
        title="Drafts"
        subtitle="Publishing requires description (20+ chars), genres, poster file name, and release year — complete them on Edit (details) first."
      >
        {loading ? (
          <div className="py-12 flex justify-center">
            <Spinner label="Loading drafts…" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-charcoal-900/80 text-left text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-semibold">Title</th>
                  <th className="p-4 font-semibold">Type</th>
                  <th className="p-4 font-semibold">Updated</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr key={s._id} className="border-t border-slate-100 dark:border-white/5">
                    <td className="p-4 font-medium text-slate-900 dark:text-white">{s.title}</td>
                    <td className="p-4 capitalize text-slate-600 dark:text-slate-400">{s.type}</td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 text-xs">
                      {s.updatedAt ? new Date(s.updatedAt).toLocaleString() : '—'}
                    </td>
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      <Link
                        to={`/admin/series/new?draft=${s._id}&step=1`}
                        className="text-slate-600 dark:text-slate-400 hover:underline text-xs font-medium"
                      >
                        Edit (step 1)
                      </Link>
                      <Link
                        to={`/admin/series/new?draft=${s._id}&step=2`}
                        className="text-teal-700 dark:text-teal-400 hover:underline text-xs font-medium"
                      >
                        Edit (details)
                      </Link>
                      <button
                        type="button"
                        onClick={() => publish(s._id)}
                        className="text-emerald-700 dark:text-emerald-400 hover:underline text-xs font-medium"
                      >
                        Publish
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(s._id)}
                        className="text-red-600 dark:text-red-400 hover:underline text-xs font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && (
              <p className="p-8 text-center text-slate-500">
                No drafts.{' '}
                <Link to="/admin/series/new" className="text-teal-600 dark:text-teal-400 font-medium hover:underline">
                  Start a new series
                </Link>
                .
              </p>
            )}
          </div>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/admin/series/new"
            className="inline-flex items-center px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold"
          >
            + New series
          </Link>
          <Link
            to="/admin/guide"
            className="inline-flex items-center px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 dark:border-white/15 dark:text-slate-300"
          >
            Admin guide
          </Link>
        </div>
      </Panel>
    </div>
  );
}
