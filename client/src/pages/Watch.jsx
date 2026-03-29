import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import VideoPlayer from '../components/VideoPlayer';
import Spinner from '../components/Spinner';
import { io } from 'socket.io-client';

export default function Watch() {
  const { episodeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = localStorage.getItem('sv_token');
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [next, setNext] = useState(null);
  const [live, setLive] = useState([]);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    setData(null);
    (async () => {
      try {
        const { data: d } = await api.get(`/episodes/${episodeId}`);
        const { data: n } = await api.get(`/episodes/${episodeId}/next`);
        const { data: c } = await api.get(`/episodes/${episodeId}/comments`);
        if (!cancelled) {
          setData(d);
          setNext(n.next);
          setComments(c.comments || []);
        }
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
  }, [episodeId]);

  useEffect(() => {
    if (!user || !episodeId) return undefined;
    const socket = io({
      path: '/socket.io',
      auth: { token },
    });
    socket.emit('join_episode', episodeId);
    socket.on('live_comment', (msg) => {
      setLive((prev) => [...prev.slice(-20), msg]);
    });
    return () => {
      socket.emit('leave_episode', episodeId);
      socket.disconnect();
    };
  }, [episodeId, user, token]);

  if (loadError) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-700 dark:text-slate-300 font-medium mb-2">Episode unavailable</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">It may have been removed or you don’t have access.</p>
        <Link to="/browse" className="text-teal-600 dark:text-teal-400 font-medium hover:underline">
          Back to browse
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-24 flex justify-center">
        <Spinner label="Loading episode…" />
      </div>
    );
  }

  const { episode, series, season } = data;

  const submitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    await api.post(`/episodes/${episodeId}/comments`, { body: comment });
    setComment('');
    const { data: c } = await api.get(`/episodes/${episodeId}/comments`);
    setComments(c.comments || []);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        <Link to="/" className="hover:text-teal-700 dark:hover:text-white">
          Home
        </Link>
        <span className="mx-2">/</span>
        <Link to={`/series/${series?._id}`} className="hover:text-teal-700 dark:hover:text-white">
          {series?.title}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-800 dark:text-slate-200">
          S{season?.number}E{episode.number}
        </span>
      </div>
      <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-2">
        {episode.title}
      </h1>
      <p className="text-slate-600 dark:text-slate-400 mb-6">{episode.description}</p>

      {!token || !user ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6 text-amber-900 text-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          Log in to stream protected video URLs. JWT is required for range streaming.
        </div>
      ) : (
        <VideoPlayer
          episode={episode}
          token={token}
          autoNextEnabled
          onEnded={() => {
            if (next?.episode) navigate(`/watch/${next.episode._id}`);
          }}
        />
      )}

      <div className="mt-8 grid md:grid-cols-2 gap-8">
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-3">Comments</h2>
          {user && (
            <form onSubmit={submitComment} className="mb-4 flex gap-2">
              <input
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 dark:bg-charcoal-850 dark:border-white/10 dark:text-slate-100"
                placeholder="Write a comment…"
              />
              <button type="submit" className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium">
                Post
              </button>
            </form>
          )}
          <ul className="space-y-4">
            {comments.map((c) => (
              <li key={c._id} className="border-b border-slate-200 dark:border-white/5 pb-4">
                <p className="text-xs text-teal-700 dark:text-teal-400">{c.user?.username}</p>
                <p className="text-slate-800 dark:text-slate-200 mt-1">{c.body}</p>
                {(c.replies || []).map((r) => (
                  <div key={r._id} className="ml-4 mt-2 text-sm text-slate-600 dark:text-slate-400">
                    <span className="text-teal-600 dark:text-teal-500">{r.user?.username}</span> {r.body}
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white mb-3">Live feed (Socket.IO)</h2>
          <div className="h-48 overflow-y-auto rounded-lg bg-slate-100 border border-slate-200 p-3 text-sm space-y-2 dark:bg-charcoal-900 dark:border-white/10">
            {live.map((m) => (
              <div key={m._id}>
                <span className="text-teal-700 dark:text-teal-400">{m.user?.username}</span>{' '}
                <span className="text-slate-700 dark:text-slate-300">{m.body}</span>
              </div>
            ))}
            {!live.length && <p className="text-slate-500">No live messages yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
