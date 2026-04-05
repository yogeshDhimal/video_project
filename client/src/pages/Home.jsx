import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import SeriesCard from '../components/SeriesCard';
import SpotlightSlider from '../components/SpotlightSlider';
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
          <SeriesCard key={row.episode?._id || row.series?._id} series={row.series} episodeId={row.episode._id} mathProof={row.mathProof} />
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
  const [publicLoading, setPublicLoading] = useState(true);
  const [userLoading, setUserLoading] = useState(false);

  // Fixed: split into two effects so public data isn't refetched on user change (issue 3.6)
  // Effect 1: Public data (trending + recent) — runs once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [t, r] = await Promise.all([api.get('/trending'), api.get('/recent')]);
        if (!cancelled) {
          setTrending(t.data.items || []);
          setRecent(r.data.items || []);
        }
      } finally {
        if (!cancelled) setPublicLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Effect 2: User-specific data (recommendations + continue watching)
  useEffect(() => {
    if (!user) {
      setRec([]);
      setCont([]);
      return;
    }
    let cancelled = false;
    setUserLoading(true);
    (async () => {
      try {
        const [recRes, cRes] = await Promise.all([
          api.get('/recommendations').catch(() => ({ data: { items: [] } })),
          api.get('/watch-history/continue').catch(() => ({ data: { items: [] } })),
        ]);
        if (!cancelled) {
          setRec(recRes.data.items || []);
          setCont(cRes.data.items || []);
        }
      } finally {
        if (!cancelled) setUserLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const loading = publicLoading;
  const recentValid = (recent || []).filter((row) => row.series && row.episode);

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 sm:py-12">
      {loading ? (
        <div className="w-full h-[450px] sm:h-[500px] md:h-[600px] mb-14 rounded-3xl bg-slate-200/50 dark:bg-charcoal-850 animate-pulse border border-slate-300/30 dark:border-white/5" />
      ) : trending.length > 0 ? (
        <SpotlightSlider items={trending.slice(0, 10)} />
      ) : (
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
              Premium Collection
            </p>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-slate-900 dark:text-white mb-4 leading-[1.1]">
              Endless{' '}
              <span className="bg-gradient-to-r from-teal-600 via-teal-500 to-cyan-600 dark:from-teal-300 dark:via-ice-300 dark:to-white bg-clip-text text-transparent">
                Entertainment
              </span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg mb-8 max-w-xl leading-relaxed">
              Experience seamless, high-quality streaming with our intelligent recommendation engine, blazing-fast search, and an intuitive interface designed for the ultimate viewing experience.
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
      )}

      {user && (
        <EpisodeStrip
          title="Continue watching"
          subtitle="Resume where you left off"
          items={cont.map((x) => ({
            episode: x.episode,
            series: x.series,
          }))}
          loading={userLoading}
          emptyTitle="No shows in progress"
          emptyDescription="Start watching something — we'll surface it here when you're partway through an episode."
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
          emptyDescription="Watch a few episodes and we'll tune suggestions to your taste."
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
            description="There aren't any new episodes to show yet. Add series and episodes from the admin workflow, then they'll land here automatically."
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
