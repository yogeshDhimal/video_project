import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

export default function SeriesDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    setData(null);
    (async () => {
      try {
        const { data: d } = await api.get(`/series/${id}`);
        if (!cancelled) setData(d);
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
    api
      .get('/bookmarks')
      .then((r) => {
        const ids = (r.data.items || []).map((s) => String(s._id));
        setBookmarked(ids.includes(String(id)));
      })
      .catch(() => {});
  }, [user, id]);

  const toggleBookmark = async () => {
    if (!user) return;
    if (bookmarked) {
      await api.delete(`/bookmarks/${id}`);
      setBookmarked(false);
    } else {
      await api.post(`/bookmarks/${id}`);
      setBookmarked(true);
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

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="flex flex-col md:flex-row gap-8 mb-10">
        <div className="w-48 shrink-0 mx-auto md:mx-0">
          <img
            src={`/api/assets/poster/${series._id}`}
            alt=""
            className="w-full rounded-xl border border-slate-200 shadow-lg dark:border-white/10 dark:shadow-glow"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white mb-2">{series.title}</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
            {series.releaseYear} · {(series.genres || []).join(' · ')}
          </p>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed mb-6">{series.description}</p>
          {user && (
            <button
              type="button"
              onClick={toggleBookmark}
              className="px-4 py-2 rounded-lg bg-teal-100 border border-teal-200 text-teal-800 text-sm hover:bg-teal-200/80 dark:bg-teal-600/20 dark:border-teal-500/40 dark:text-teal-300 dark:hover:bg-teal-600/30"
            >
              {bookmarked ? 'Saved to watchlist' : 'Add to watchlist'}
            </button>
          )}
        </div>
      </div>

      <h2 className="font-display text-xl font-semibold text-slate-900 dark:text-white mb-4">Episodes</h2>
      <div className="space-y-8">
        {(seasons || []).map((block) => (
          <div key={block.season._id}>
            <h3 className="text-teal-700 dark:text-teal-400 text-sm font-medium mb-3">
              Season {block.season.number}
              {block.season.title ? ` — ${block.season.title}` : ''}
            </h3>
            <ul className="grid sm:grid-cols-2 gap-3">
              {(block.episodes || []).map((ep) => (
                <li key={ep._id}>
                  <Link
                    to={`/watch/${ep._id}`}
                    className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:border-teal-400/40 transition-colors dark:border-white/5 dark:bg-charcoal-850/50 dark:hover:border-teal-500/30"
                  >
                    <span className="text-xs text-slate-500 w-8">E{ep.number}</span>
                    <span className="text-slate-800 dark:text-slate-200">{ep.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
