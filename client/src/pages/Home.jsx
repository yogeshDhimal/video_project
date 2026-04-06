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
          <SeriesCard key={row.episode?._id || row.series?._id} series={row.series} episodeId={row.episode._id} mathProof={row.mathProof} pearsonPredicted={row.pearsonPredicted} />
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
      ) : null}

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
          items={rec.map((x) => ({ episode: x.episode, series: x.series, pearsonPredicted: x.pearsonPredicted, mathProof: x.mathProof }))}
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
