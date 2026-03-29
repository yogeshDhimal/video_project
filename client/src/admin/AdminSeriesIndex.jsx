import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Spinner from '../components/Spinner';
import { Panel } from './adminUi';

export default function AdminSeriesIndex() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/series', { params: { limit: 100, page: 1, includeDrafts: '1' } })
      .then((r) => setItems(r.data.items || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Panel
      title="Catalog"
      subtitle="Published and draft entries. Drafts are hidden from Browse until published."
    >
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
                <th className="p-4 font-semibold">Catalog</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Year</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s._id} className="border-t border-slate-100 dark:border-white/5">
                  <td className="p-4 font-medium text-slate-900 dark:text-white">{s.title}</td>
                  <td className="p-4">
                    {s.catalogStatus === 'draft' ? (
                      <span className="inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                        Draft
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-100">
                        Live
                      </span>
                    )}
                  </td>
                  <td className="p-4 capitalize text-slate-600 dark:text-slate-400">{s.type}</td>
                  <td className="p-4 text-slate-600 dark:text-slate-400">{s.releaseYear ?? '—'}</td>
                  <td className="p-4 text-right space-x-3 whitespace-nowrap">
                    {s.catalogStatus === 'published' ? (
                      <Link
                        to={`/series/${s._id}`}
                        className="text-teal-700 dark:text-teal-400 hover:underline text-xs font-medium"
                      >
                        Public page
                      </Link>
                    ) : (
                      <Link
                        to={`/admin/series/new?draft=${s._id}&step=2`}
                        className="text-amber-700 dark:text-amber-400 hover:underline text-xs font-medium"
                      >
                        Continue edit
                      </Link>
                    )}
                    <Link
                      to={`/admin/seasons?series=${s._id}`}
                      className="text-slate-600 dark:text-slate-400 hover:underline text-xs font-medium"
                    >
                      Add season
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && <p className="p-8 text-center text-slate-500">No series yet. Create one first.</p>}
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
          to="/admin/series/drafts"
          className="inline-flex items-center px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 dark:border-white/15 dark:text-slate-300"
        >
          Drafts
        </Link>
        <Link
          to="/admin/guide"
          className="inline-flex items-center px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 dark:border-white/15 dark:text-slate-300"
        >
          Admin guide
        </Link>
      </div>
    </Panel>
  );
}
