import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../api/client';
import Spinner from '../components/Spinner';
import { Panel } from './adminUi';
import ManageSeasonsModal from './ManageSeasonsModal';

export default function AdminSeriesIndex() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [managingSeries, setManagingSeries] = useState(null); // Series object for modal

  const loadData = async () => {
    try {
      const r = await api.get('/series', { params: { limit: 500, page: 1, includeDrafts: '1' } });
      setItems(r.data.items || []);
    } catch (err) {
      toast.error('Failed to load catalog');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (id, newStatus) => {
    setBusy(true);
    try {
      await api.patch(`/series/${id}`, { status: newStatus });
      setItems((prev) => prev.map((s) => (s._id === id ? { ...s, status: newStatus } : s)));
      toast.success('Series status updated');
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setBusy(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);

  return (
    <>
      <Panel
        title="Manage Series"
        subtitle="Update series lifecycle, manage seasons, and track visibility."
      >
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Search series by title..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-charcoal-900 text-sm focus:ring-2 focus:ring-teal-500/30 outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Link
            to="/admin/series/new"
            className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold shadow-lg shadow-teal-600/20 transition-all active:scale-95"
          >
            + New series
          </Link>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Spinner label="Loading catalog…" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-charcoal-900/80 text-left text-slate-600 dark:text-slate-400">
                <tr>
                  <th className="p-4 font-semibold">Title</th>
                  <th className="p-4 font-semibold">Visibility</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Year</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((s) => (
                  <tr key={s._id} className="border-t border-slate-100 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 dark:text-white">{s.title}</div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">{s.type}</div>
                    </td>
                    <td className="p-4">
                      {s.catalogStatus === 'draft' ? (
                        <span className="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                          Draft
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100">
                          Live
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <select
                        disabled={busy}
                        value={s.status || 'ongoing'}
                        onChange={(e) => handleStatusChange(s._id, e.target.value)}
                        className={`text-xs font-bold rounded-lg px-2 py-1 outline-none border transition-all ${
                          s.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50'
                            : s.status === 'hiatus'
                            ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50'
                            : 'bg-sky-50 text-sky-700 border-sky-100 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/50'
                        }`}
                      >
                        <option value="ongoing">Ongoing</option>
                        <option value="completed">Completed</option>
                        <option value="hiatus">Hiatus</option>
                      </select>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-400 font-medium">{s.releaseYear ?? '—'}</td>
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setManagingSeries(s)}
                        className="px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 font-bold text-xs hover:bg-teal-100 transition-all border border-teal-200 dark:border-teal-900/50"
                      >
                        Manage
                      </button>
                      <Link
                        to={s.catalogStatus === 'draft' ? `/admin/series/new?draft=${s._id}&step=2` : `/admin/series/${s._id}`}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition-all"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredItems.length === 0 && (
              <div className="p-12 text-center text-slate-500">
                {search ? 'No series match your search.' : 'No series yet. Create one first.'}
              </div>
            )}
          </div>
        )}
        
        <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-100 dark:border-white/5 pt-6">
          <Link
            to="/admin/series/drafts"
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 dark:border-white/15 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
          >
            Drafts library
          </Link>
          <Link
            to="/admin/guide"
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 dark:border-white/15 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
          >
            Admin guide
          </Link>
        </div>
      </Panel>

      {managingSeries && (
        <ManageSeasonsModal
          series={managingSeries}
          onClose={() => {
            setManagingSeries(null);
            loadData(); // Refresh data in case something changed
          }}
        />
      )}
    </>
  );
}
