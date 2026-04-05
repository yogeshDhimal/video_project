import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import VideoPlayer from '../components/VideoPlayer';
import RatingStars from '../components/RatingStars';

export default function SeriesDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [activeSeasonId, setActiveSeasonId] = useState(null);
  const [similarSeries, setSimilarSeries] = useState([]);
  const [togglingBookmark, setTogglingBookmark] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    setData(null);
    (async () => {
      try {
        const { data: d } = await api.get(`/series/${id}`);
        if (!cancelled) setData(d);
        // Fetch TF-IDF similar series in parallel
        api.get(`/series/${id}/similar`)
          .then(r => { if (!cancelled) setSimilarSeries(r.data.items || []); })
          .catch(() => {});
      } catch {
        if (!cancelled) {
          setLoadError(true);
          setData(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;
    // Fixed: use the new /check endpoint instead of fetching all bookmarks (issue 3.4)
    api
      .get(`/bookmarks/${id}/check`)
      .then((r) => {
        setBookmarked(r.data.bookmarked);
      })
      .catch(() => {});
  }, [user, id]);

  const toggleBookmark = async () => {
    if (!user || togglingBookmark) return;
    setTogglingBookmark(true);
    try {
      if (bookmarked) {
        await api.delete(`/bookmarks/${id}`);
        setBookmarked(false);
      } else {
        await api.post(`/bookmarks/${id}`);
        setBookmarked(true);
      }
    } finally {
      setTogglingBookmark(false);
    }
  };

  if (loadError) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-700 dark:text-slate-300 font-medium mb-2">Couldn’t load this title</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">It may have been removed or isn’t available.</p>
        <Link to="/browse" className="text-teal-600 dark:text-teal-400 font-medium hover:underline">
          Back to browse
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-24 flex justify-center">
        <Spinner label="Loading series…" />
      </div>
    );
  }

  const { series, seasons } = data;
  const token = localStorage.getItem('sv_token');

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row gap-8 mb-10">
        <div className="w-48 shrink-0 mx-auto md:mx-0">
          <img
            src={series.posterPath ? `/api/assets/poster/${series._id}` : series.thumbnailPath ? `/api/stream/series/${series._id}/thumbnail` : 'https://placehold.co/300x450/1e293b/94a3b8?text=No+Poster'}
            alt={`${series.title} Poster`}
            className="w-full rounded-xl border border-slate-200 shadow-lg dark:border-white/10 dark:shadow-glow object-cover aspect-[2/3]"
            onError={(e) => {
              e.target.src = 'https://placehold.co/300x450/1e293b/94a3b8?text=No+Poster';
            }}
          />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white mb-2">{series.title}</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
            {series.releaseYear} · {(series.genres || []).join(' · ')}
          </p>
          <div className="mb-6">
            {series.status === 'completed' ? (
              <div className="flex items-center gap-3 bg-white/50 dark:bg-white/[0.03] w-fit px-4 py-2 rounded-2xl border border-slate-100 dark:border-white/5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Global Rating</span>
                <RatingStars rating={series.ratingAvg || 0} size="md" />
              </div>
            ) : (
              <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/20 w-fit px-3 py-1.5 rounded-xl border border-teal-100 dark:border-teal-800/50">
                <span className="text-[10px] font-bold uppercase tracking-widest">Rating Pending (Ongoing)</span>
              </div>
            )}
          </div>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-6">{series.description}</p>
          {user && (
            <button
              type="button"
              disabled={togglingBookmark}
              onClick={toggleBookmark}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                togglingBookmark ? 'opacity-60 cursor-not-allowed' : ''
              } ${
                bookmarked 
                ? 'bg-rose-100 border border-rose-200 text-rose-800 hover:bg-rose-200 dark:bg-rose-500/20 dark:border-rose-500/40 dark:text-rose-300'
                : 'bg-teal-100 border border-teal-200 text-teal-800 hover:bg-teal-200 dark:bg-teal-600/20 dark:border-teal-500/40 dark:text-teal-300'
              }`}
            >
              {bookmarked ? 'Saved to watchlist' : 'Add to watchlist'}
            </button>
          )}
        </div>
      </div>

      {series.videoFile && (
        <div className="mb-12">
          <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white mb-4">Watch Movie</h2>
          {!token || !user ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6 text-amber-900 text-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              Log in to stream protected video URLs.
            </div>
          ) : (
            <VideoPlayer
              isSeries={true}
              episode={{
                _id: series._id,
                title: series.title,
                durationSeconds: 0,
                qualities: [],
                subtitles: series.subtitleFile
                  ? [{ lang: 'en', label: 'English', fileName: series.subtitleFile, format: series.subtitleFile.endsWith('.srt') ? 'srt' : 'vtt' }]
                  : [],
              }}
              token={token}
              autoNextEnabled={false}
            />
          )}
        </div>
      )}

      {!series.videoFile && seasons && seasons.length > 0 && (
        <div className="mt-8">
          {!activeSeasonId ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-xl md:text-2xl font-semibold text-slate-900 dark:text-white">Seasons</h2>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                {seasons.map((block) => (
                  <button
                    key={block.season._id}
                    onClick={() => setActiveSeasonId(block.season._id)}
                    className="flex flex-col items-start p-5 rounded-2xl bg-white border border-slate-200 hover:border-teal-400/50 hover:shadow-lg transition-all text-left dark:bg-charcoal-850/50 dark:border-white/5 active:scale-95 group"
                  >
                    <span className="text-teal-600 dark:text-teal-400 font-bold text-lg mb-1 group-hover:text-teal-500 transition-colors">
                      Season {block.season.number}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                      {(block.episodes || []).length} Episodes
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="animate-fadeIn">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="text-teal-600 dark:text-teal-400">Season {seasons.find(b => b.season._id === activeSeasonId)?.season.number}</span>
                  <span className="text-slate-300 dark:text-slate-700 mx-1">/</span>
                  <span className="text-slate-600 dark:text-slate-400 text-lg font-medium">Episodes</span>
                </h2>
                <button
                  onClick={() => setActiveSeasonId(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100/80 hover:bg-slate-200 rounded-lg transition-colors dark:text-slate-300 dark:bg-white/5 dark:hover:bg-white/10"
                >
                  &larr; Back to Seasons
                </button>
              </div>

              <div className="space-y-4 min-h-[200px]">
            {seasons
              .filter((block) => block.season._id === activeSeasonId)
              .map((block) => (
                <div key={block.season._id} className="animate-fadeUp">
                  {seasons.length === 1 && block.season.title && (
                    <h3 className="text-teal-700 dark:text-teal-400 text-sm font-semibold mb-4 tracking-wide uppercase">
                      Season {block.season.number} — {block.season.title}
                    </h3>
                  )}
                  {(!block.episodes || block.episodes.length === 0) ? (
                    <div className="flex p-8 items-center justify-center rounded-2xl border border-dashed border-slate-300 dark:border-white/10 bg-slate-50/50 dark:bg-black/10">
                      <p className="text-slate-500 font-medium dark:text-slate-400 text-sm">Episodes coming soon.</p>
                    </div>
                  ) : (
                    <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {block.episodes.map((ep) => (
                        <li key={ep._id}>
                          <Link
                            to={`/watch/${ep._id}`}
                            className="group flex flex-col gap-3 p-4 rounded-2xl border border-slate-200 bg-white hover:border-teal-400/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 dark:border-white/5 dark:bg-charcoal-850/50 dark:hover:border-teal-500/30 dark:hover:bg-charcoal-800"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex flex-col items-center justify-center min-w-[3rem] h-12 bg-slate-50 rounded-xl group-hover:bg-teal-50 transition-colors dark:bg-black/30 dark:group-hover:bg-teal-900/30">
                                <span className="text-[10px] uppercase font-bold text-slate-400 group-hover:text-teal-500/70 dark:text-slate-500">EP</span>
                                <span className="text-lg leading-none font-bold text-slate-700 group-hover:text-teal-600 dark:text-slate-300 dark:group-hover:text-teal-400">{ep.number}</span>
                              </div>
                              <div className="flex flex-col overflow-hidden">
                                <span className="text-slate-900 font-semibold truncate group-hover:text-teal-700 transition-colors dark:text-slate-200 dark:group-hover:text-teal-300">
                                  {ep.title}
                                </span>
                                {ep.durationSeconds > 0 ? (
                                  <span className="text-xs font-medium text-slate-500 mt-0.5">{Math.floor(ep.durationSeconds/60)}m</span>
                                ) : (
                                  <span className="text-xs font-medium text-slate-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Play episode</span>
                                )}
                              </div>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TF-IDF Cosine Similarity: Similar Series Section ── */}
      {similarSeries.length > 0 && (
        <div className="mt-14 pt-10 border-t border-slate-200 dark:border-white/10">
          <div className="mb-6">
            <h2 className="font-display text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <span className="w-1 h-7 rounded-full bg-gradient-to-b from-teal-400 to-cyan-500" />
              Similar Series
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {similarSeries.map(({ series: s, similarity }) => (
              <Link
                key={s._id}
                to={`/series/${s._id}`}
                className="group flex flex-col rounded-2xl overflow-hidden border border-slate-200 bg-white hover:border-teal-400/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 dark:border-white/5 dark:bg-charcoal-850/60 dark:hover:border-teal-500/30"
              >
                <div className="aspect-[2/3] overflow-hidden bg-slate-100 dark:bg-black/30">
                  <img
                    src={`/api/assets/poster/${s._id}`}
                    alt={s.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={e => { e.target.style.display = 'none'; }}
                  />
                </div>
                <div className="p-3 flex-1 flex flex-col">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {s.title}
                  </p>
                  <div className="mt-auto pt-2 flex items-center gap-1">
                    <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-900/30 px-1.5 py-0.5 rounded-md">
                      {Math.round(similarity * 100)}% match
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
