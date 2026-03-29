import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import SectionHeader from '../components/SectionHeader';

function useDebounced(value, delay) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

export default function SearchPage() {
  const [q, setQ] = useState('');
  const debounced = useDebounced(q, 350);
  const [series, setSeries] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [suggest, setSuggest] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await api.get('/search', { params: { q: debounced } });
      if (!cancelled) {
        setSeries(data.series || []);
        setEpisodes(data.episodes || []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  useEffect(() => {
    let cancelled = false;
    if (!q.trim() || q.length < 2) {
      setSuggest([]);
      return undefined;
    }
    (async () => {
      const { data } = await api.get('/search/suggest', { params: { q } });
      if (!cancelled) setSuggest(data.suggestions || []);
    })();
    return () => {
      cancelled = true;
    };
  }, [q]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
      <SectionHeader title="Search" subtitle="Fuzzy matching for typos · suggestions as you type" />
      <div className="relative mb-8">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Titles, tags, fuzzy matching…"
          className="w-full px-5 py-4 rounded-2xl bg-white border border-slate-200 text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/35 shadow-sm dark:bg-charcoal-850/80 dark:border-white/[0.08] dark:text-white dark:placeholder:text-slate-500 dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]"
        />
        {suggest.length > 0 && (
          <ul className="absolute z-10 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden dark:border-white/[0.08] dark:bg-charcoal-900/95 dark:backdrop-blur-xl dark:shadow-2xl">
            {suggest.map((s) => (
              <li key={s.id}>
                <Link
                  to={`/series/${s.id}`}
                  className="block px-4 py-3 hover:bg-teal-50 text-sm text-slate-800 border-b border-slate-100 last:border-0 transition-colors dark:hover:bg-teal-500/10 dark:text-slate-200 dark:border-white/[0.04]"
                  onClick={() => setSuggest([])}
                >
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      {loading && (
        <div className="flex items-center gap-3 mb-6 text-slate-600 dark:text-slate-400">
          <span className="inline-block h-5 w-5 rounded-full border-2 border-slate-200 border-t-teal-600 dark:border-white/15 dark:border-t-teal-400 animate-spin" />
          <span className="text-sm font-medium">Searching…</span>
        </div>
      )}
      <section className="mb-10">
        <h2 className="text-lg font-display font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-teal-500" />
          Series
        </h2>
        <ul className="space-y-2">
          {series.map((s) => (
            <li key={s._id}>
              <Link to={`/series/${s._id}`} className="text-teal-700 dark:text-teal-400 hover:underline font-medium">
                {s.title}
              </Link>
              <span className="text-slate-500 text-sm ml-2">{s.releaseYear}</span>
            </li>
          ))}
          {!series.length && !loading && <li className="text-slate-500">No series</li>}
        </ul>
      </section>
      <section>
        <h2 className="text-lg font-display font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-cyan-500 dark:bg-ice-500" />
          Episodes
        </h2>
        <ul className="space-y-2">
          {episodes.map((e) => (
            <li key={e._id}>
              <Link to={`/watch/${e._id}`} className="text-cyan-700 dark:text-ice-400 hover:underline font-medium">
                {e.title}
              </Link>
            </li>
          ))}
          {!episodes.length && !loading && <li className="text-slate-500">No episodes</li>}
        </ul>
      </section>
    </div>
  );
}
