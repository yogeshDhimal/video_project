import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../api/client';
import Spinner from '../components/Spinner';

export default function ManageSeasonsModal({ series, onClose }) {
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const loadSeasons = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/series/${series._id}`);
      setSeasons(data.seasons || []);
    } catch (err) {
      toast.error('Failed to load seasons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (series?._id) loadSeasons();
  }, [series?._id]);

  const toggleStatus = async (seasonId, currentStatus) => {
    const nextStatus = currentStatus === 'airing' ? 'finished' : 'airing';
    setBusy(true);
    try {
      await api.patch(`/seasons/${seasonId}`, { status: nextStatus });
      setSeasons((prev) =>
        prev.map((s) => (s.season._id === seasonId ? { ...s, season: { ...s.season, status: nextStatus } } : s))
      );
      toast.success(`Season marked as ${nextStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setBusy(false);
    }
  };

  const deleteSeason = async (seasonId, num) => {
    if (!window.confirm(`Delete Season ${num} and ALL its episodes? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api.delete(`/seasons/${seasonId}`);
      setSeasons((prev) => prev.filter((s) => s.season._id !== seasonId));
      toast.success('Season deleted');
    } catch (err) {
      toast.error('Failed to delete season');
    } finally {
      setBusy(false);
    }
  };

  if (!series) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm dark:bg-black/80" onClick={onClose} />

      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-charcoal-900 rounded-3xl shadow-2xl shadow-teal-500/10 overflow-hidden flex flex-col max-h-[90vh]">
        <header className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-white/[0.02]">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Manage Seasons</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{series.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200/50 dark:hover:bg-white/10 text-slate-400 transition-colors"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Spinner label="Loading seasons…" />
            </div>
          ) : seasons.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-slate-500 mb-4">No seasons found for this series.</p>
              <Link
                to={`/admin/seasons?series=${series._id}`}
                className="inline-flex items-center px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold"
              >
                + Add first season
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {seasons.map(({ season, episodesCount }) => (
                <div
                  key={season._id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] hover:border-teal-500/30 transition-all"
                >
                  <div className="mb-3 sm:mb-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-lg">
                        Season {season.number}
                      </span>
                      {season.title && (
                        <span className="text-sm text-slate-500 dark:text-slate-400">— {season.title}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{episodesCount || 0} episodes published</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      disabled={busy}
                      onClick={() => toggleStatus(season._id, season.status)}
                      className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                        season.status === 'airing'
                          ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400 ring-1 ring-sky-200 dark:ring-sky-500/30'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-500/30'
                      }`}
                    >
                      {season.status === 'airing' ? '● Airing' : '✓ Finished'}
                    </button>

                    <Link
                      to={`/admin/episodes?series=${series._id}&season=${season._id}`}
                      className="p-2 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-100 transition-colors"
                      title="Add Episode"
                    >
                      ▶
                    </Link>

                    <button
                      disabled={busy}
                      onClick={() => deleteSeason(season._id, season.number)}
                      className="p-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors"
                      title="Delete Season"
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex justify-end gap-3 shrink-0">
          <Link
            to={`/admin/seasons?series=${series._id}`}
            className="px-5 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            + Create New Season
          </Link>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-semibold hover:opacity-90"
          >
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
