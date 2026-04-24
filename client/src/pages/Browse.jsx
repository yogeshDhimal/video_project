import { useEffect, useState } from 'react';
import api from '../api/client';
import SeriesCard from '../components/SeriesCard';
import { RowSkeleton } from '../components/Skeleton';
import SectionHeader from '../components/SectionHeader';
import EmptyState from '../components/EmptyState';

export default function Browse() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [genre, setGenre] = useState('');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await api.get('/series', { params: { page, limit: 24, genre: genre || undefined, sort } });
      if (!cancelled) {
        setItems((prev) => (page === 1 ? data.items || [] : [...prev, ...(data.items || [])]));
        setTotal(data.total || 0);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, genre, sort]);

  return (
    <div className="w-full px-8 sm:px-12 md:px-16 lg:px-20 py-10 sm:py-12">
      <SectionHeader
        title="Browse"
        subtitle={total ? `${total} titles in your library` : 'Explore everything you’ve added'}
      />
      <div className="flex flex-wrap gap-3 mb-10">
        <input
          placeholder="Filter by genre"
          value={genre}
          onChange={(e) => {
            setPage(1);
            setGenre(e.target.value);
          }}
          className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 min-w-[160px] dark:bg-charcoal-850/80 dark:border-white/[0.08] dark:text-white dark:placeholder:text-slate-500"
        />
        <select
          value={sort}
          onChange={(e) => {
            setPage(1);
            setSort(e.target.value);
          }}
          className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:bg-charcoal-850/80 dark:border-white/[0.08] dark:text-slate-200"
        >
          <option value="newest">Newest</option>
          <option value="popular">Popular</option>
          <option value="rating">Top rated</option>
        </select>
      </div>
      {loading ? (
        <RowSkeleton n={12} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No series found"
          description="Try clearing the genre filter or add new content from the admin panel."
          icon="🔍"
          actionLabel="Back to home"
          actionTo="/"
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6 sm:gap-8">
          {items.map((s) => (
            <SeriesCard key={s._id} series={s} />
          ))}
        </div>
      )}
      {!loading && page * 24 < total && (
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          className="mt-10 w-full py-3.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium transition-colors dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:bg-white/[0.06] dark:text-slate-200"
        >
          Load more
        </button>
      )}
    </div>
  );
}
