import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import SeriesCard from '../components/SeriesCard';
import { RowSkeleton } from '../components/Skeleton';
import SectionHeader from '../components/SectionHeader';
import EmptyState from '../components/EmptyState';

function EpisodeStrip({ title, subtitle, items, loading, emptyTitle, emptyDescription, emptyIcon }) {
  if (loading) {
    return (
      <section className="mb-14">
        <SectionHeader title={title} subtitle={subtitle} />
        <RowSkeleton />
      </section>
    );
  }
  if (!items?.length) {
    return (
      <section className="mb-14">
        <SectionHeader title={title} subtitle={subtitle} />
        <EmptyState
          title={emptyTitle || 'Nothing here yet'}
          description={emptyDescription || 'Check back after new content is added.'}
          icon={emptyIcon || '✨'}
        />
      </section>
    );
  }
  return (
    <section className="mb-14 animate-fadeUp">
      <SectionHeader title={title} subtitle={subtitle} />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {items.map((row) => (
          <Link
            key={row.episode?._id || row.series?._id}
            to={`/watch/${row.episode._id}`}
            className="group rounded-2xl overflow-hidden border border-slate-200/90 bg-white shadow-sm dark:border-white/[0.07] dark:bg-charcoal-850/60 dark:shadow-none backdrop-blur-sm card-hover ring-0 hover:ring-1 hover:ring-teal-500/25"
          >
            <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 dark:from-charcoal-900 dark:to-black relative">
              <img
                src={`/api/stream/thumbnail/${row.episode._id}?token=${localStorage.getItem('sv_token') || ''}`}
                alt=""
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                onError={(e) => {
                  e.target.style.opacity = 0;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="text-xs text-teal-600 dark:text-teal-300/90 font-medium line-clamp-1">{row.series?.title}</p>
                <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">{row.episode.title}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { user } = useAuth();
  const [trending, setTrending] = useState([]);
  const [recent, setRecent] = useState([]);
  const [rec, setRec] = useState([]);
  const [cont, setCont] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t, r] = await Promise.all([api.get('/trending'), api.get('/recent')]);
        if (!cancelled) {
          setTrending(t.data.items || []);
          setRecent(r.data.items || []);
        }
        if (user) {
          const [recRes, cRes] = await Promise.all([
            api.get('/recommendations').catch(() => ({ data: { items: [] } })),
            api.get('/watch-history/continue').catch(() => ({ data: { items: [] } })),
          ]);
          if (!cancelled) {
            setRec(recRes.data.items || []);
            setCont(cRes.data.items || []);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const recentValid = (recent || []).filter((row) => row.series && row.episode);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 sm:py-12">
      <div className="mb-14 relative rounded-3xl overflow-hidden border border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-teal-50/50 p-8 sm:p-12 md:p-14 shadow-xl shadow-slate-200/50 dark:border-white/[0.08] dark:from-charcoal-850/90 dark:via-charcoal-900 dark:to-charcoal-950 dark:shadow-[0_24px_80px_-20px_rgba(0,0,0,0.6)]">
        <div
          className="absolute inset-0 opacity-[0.5] dark:opacity-[0.35] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2314b8a6' fill-opacity='0.09'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="absolute top-0 right-0 w-[min(100%,420px)] h-[min(100%,420px)] bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.18),transparent_55%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_55%)] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-[radial-gradient(circle,rgba(20,184,166,0.12),transparent_70%)] dark:bg-[radial-gradient(circle,rgba(20,184,166,0.15),transparent_70%)] pointer-events-none blur-2xl" />

        <div className="relative z-10 max-w-2xl">
          <p className="text-teal-700 dark:text-teal-400/95 text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase mb-3">
            Local library
          </p>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 dark:text-white mb-4 leading-[1.1]">
            Your shows,{' '}
            <span className="bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-600 dark:from-teal-300 dark:via-ice-300 dark:to-white bg-clip-text text-transparent">
              your rules
            </span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg mb-8 max-w-xl leading-relaxed">
            Chunked streaming with range requests, fuzzy search, and recommendations — wrapped in a calm charcoal,
            teal, and ice palette.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/browse"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-semibold shadow-lg shadow-teal-500/25 dark:shadow-glow transition-all duration-300 hover:-translate-y-0.5 dark:hover:shadow-[0_0_40px_-8px_rgba(20,184,166,0.55)]"
            >
              Browse catalog
            </Link>
            <Link
              to="/search"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-2xl border border-slate-200 bg-white/80 hover:bg-white text-slate-800 font-medium backdrop-blur-sm transition-all duration-300 dark:border-white/15 dark:bg-white/[0.03] dark:hover:bg-white/[0.08] dark:text-slate-100"
            >
              Search titles
            </Link>
          </div>
        </div>
      </div>

      {user && (
        <EpisodeStrip
          title="Continue watching"
          subtitle="Resume where you left off"
          items={cont.map((x) => ({
            episode: x.episode,
            series: x.series,
          }))}
          loading={loading}
          emptyTitle="No shows in progress"
          emptyDescription="Start watching something — we’ll surface it here when you’re partway through an episode."
          emptyIcon="▶"
        />
      )}

      <EpisodeStrip
        title="Trending now"
        subtitle="Weighted by views, likes, and recent activity"
        items={trending.map((x) => ({ episode: x.episode, series: x.series }))}
        loading={loading}
        emptyTitle="No trending picks yet"
        emptyDescription="As people watch and like episodes, trending titles will appear here."
        emptyIcon="🔥"
      />

      {user && rec.length > 0 && (
        <EpisodeStrip
          title="Recommended for you"
          subtitle="Based on your history, likes, and genres"
          items={rec.map((x) => ({ episode: x.episode, series: x.series }))}
          loading={false}
          emptyTitle="No recommendations yet"
          emptyDescription="Watch a few episodes and we’ll tune suggestions to your taste."
          emptyIcon="💡"
        />
      )}

      <section className="mb-14">
        <SectionHeader title="Recently added" subtitle="Newest episodes in your library" />
        {loading ? (
          <RowSkeleton />
        ) : recentValid.length === 0 ? (
          <EmptyState
            title="No recently added content"
            description="There aren’t any new episodes to show yet. Add series and episodes from the admin workflow, then they’ll land here automatically."
            icon="🎬"
            actionLabel="Browse library"
            actionTo="/browse"
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recentValid.map((row) => (
              <SeriesCard key={row.episode._id} series={row.series} episodeId={row.episode._id} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
