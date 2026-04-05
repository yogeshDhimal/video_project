import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import VideoPlayer from '../components/VideoPlayer';
import RatingWidget from '../components/RatingWidget';
import Spinner from '../components/Spinner';
import { io } from 'socket.io-client';

function CommentVoteButtons({ item, user, onVote }) {
  const uv = item.userVote || 0;
  return (
    <div className="flex items-center gap-3 mt-2">
      <button
        onClick={() => onVote(item._id, 1)}
        disabled={!user}
        className={`flex items-center gap-1 text-xs font-medium transition-colors ${uv === 1 ? 'text-teal-600 dark:text-teal-400' : 'text-slate-500 hover:text-teal-600 dark:hover:text-teal-400'} ${!user && 'opacity-70 cursor-not-allowed'}`}
        title={!user ? "Log in to like" : "Like"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={uv === 1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>
        {item.likes || 0}
      </button>
      <button
        onClick={() => onVote(item._id, -1)}
        disabled={!user}
        className={`flex items-center gap-1 text-xs font-medium transition-colors ${uv === -1 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 hover:text-rose-600 dark:hover:text-rose-400'} ${!user && 'opacity-70 cursor-not-allowed'}`}
        title={!user ? "Log in to dislike" : "Dislike"}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={uv === -1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/></svg>
        {item.dislikes > 0 ? item.dislikes : ''}
      </button>
    </div>
  );
}

export default function Watch() {
  const { episodeId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = localStorage.getItem('sv_token');
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [next, setNext] = useState(null);
  const [prev, setPrev] = useState(null);
  const [live, setLive] = useState([]);
  const [comment, setComment] = useState('');
  const [liveMsg, setLiveMsg] = useState('');
  const [comments, setComments] = useState([]);
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [userVote, setUserVote] = useState(0);
  const [myRating, setMyRating] = useState(0);
  const socketRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    setData(null);
    (async () => {
      try {
        const { data: d } = await api.get(`/episodes/${episodeId}`);
        const { data: n } = await api.get(`/episodes/${episodeId}/next`);
        const { data: p } = await api.get(`/episodes/${episodeId}/prev`);
        const { data: c } = await api.get(`/episodes/${episodeId}/comments`);
        
        let v = 0;
        if (token) {
          try {
            const { data: voteData } = await api.get(`/episodes/${episodeId}/likes/me`);
            v = voteData.userVote;
          } catch (e) {
            // ignore if not found or unauthorized
          }
        }

        if (!cancelled) {
          setData(d);
          setNext(n.next);
          setPrev(p.prev);
          setComments(c.comments || []);
          setLikes(d.episode?.likes || 0);
          setDislikes(d.episode?.dislikes || 0);
          setUserVote(v);
          
          if (token) {
            try {
              const { data: rData } = await api.get(`/episodes/${episodeId}/my-rating`);
              setMyRating(rData.rating || 0);
            } catch (e) {
              setMyRating(0);
            }
          }
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

  // Fixed: use user?._id in dep array instead of user object to prevent socket churn (issue 3.2)
  useEffect(() => {
    if (!user?._id || !episodeId) return undefined;
    const socket = io({
      path: '/socket.io',
      auth: { token },
    });
    socketRef.current = socket;
    socket.emit('join_episode', episodeId);
    socket.on('live_comment', (msg) => {
      setLive((prev) => [...prev.slice(-20), msg]);
    });
    return () => {
      socket.emit('leave_episode', episodeId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [episodeId, user?._id, token]);

  const submitLiveChat = (e) => {
    e.preventDefault();
    if (!liveMsg.trim() || !socketRef.current || !user) return;
    socketRef.current.emit('live_comment', { episodeId, body: liveMsg }, (res) => {
      if (res && res.error) console.error(res.error);
    });
    setLiveMsg('');
  };

  if (loadError) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <p className="text-slate-700 dark:text-slate-300 font-medium mb-2">Episode unavailable</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">It may have been removed or you don't have access.</p>
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

  // Fixed: optimistic comment append instead of full refetch (issue 3.3)
  const submitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      const { data: cData } = await api.post(`/episodes/${episodeId}/comments`, { body: comment });
      setComment('');
      // Optimistically prepend new comment
      if (cData.comment) {
        setComments((prev) => [{ ...cData.comment, user: { username: user.username }, replies: [] }, ...prev]);
      } else {
        // Fallback: refetch if server doesn't return the comment
        const { data: c } = await api.get(`/episodes/${episodeId}/comments`);
        setComments(c.comments || []);
      }
    } catch {
      // Fallback on error
      const { data: c } = await api.get(`/episodes/${episodeId}/comments`);
      setComments(c.comments || []);
    }
  };

  const handleVote = async (value) => {
    if (!user) return;

    // Optimistic UI update
    const prevVote = userVote;
    const prevLikes = likes;
    const prevDislikes = dislikes;

    let newLikes = likes;
    let newDislikes = dislikes;
    let newVote = value;

    if (prevVote === value) {
      // Toggle off
      newVote = 0;
      if (value === 1) newLikes = Math.max(0, newLikes - 1);
      if (value === -1) newDislikes = Math.max(0, newDislikes - 1);
    } else {
      // Switch vote or new vote
      if (prevVote === 1) newLikes = Math.max(0, newLikes - 1);
      if (prevVote === -1) newDislikes = Math.max(0, newDislikes - 1);
      if (value === 1) newLikes += 1;
      if (value === -1) newDislikes += 1;
    }

    setLikes(newLikes);
    setDislikes(newDislikes);
    setUserVote(newVote);

    try {
      await api.post(`/episodes/${episodeId}/likes`, { value });
    } catch {
      // Revert if API fails
      setLikes(prevLikes);
      setDislikes(prevDislikes);
      setUserVote(prevVote);
    }
  };

  const updateVoteLocally = (item, value) => {
    let newLikes = item.likes || 0;
    let newDislikes = item.dislikes || 0;
    let newVote = value;
    const prevVote = item.userVote || 0;

    if (prevVote === value) {
      newVote = 0;
      if (value === 1) newLikes = Math.max(0, newLikes - 1);
      if (value === -1) newDislikes = Math.max(0, newDislikes - 1);
    } else {
      if (prevVote === 1) newLikes = Math.max(0, newLikes - 1);
      if (prevVote === -1) newDislikes = Math.max(0, newDislikes - 1);
      if (value === 1) newLikes += 1;
      if (value === -1) newDislikes += 1;
    }
    return { ...item, likes: newLikes, dislikes: newDislikes, userVote: newVote };
  };

  const handleCommentVote = async (commentId, value) => {
    if (!user) return;

    setComments((prev) => 
      prev.map((c) => {
        if (c._id === commentId) {
          return updateVoteLocally(c, value);
        } else if (c.replies) {
          return {
            ...c,
            replies: c.replies.map((r) => (r._id === commentId ? updateVoteLocally(r, value) : r)),
          };
        }
        return c;
      })
    );

    try {
      await api.post(`/episodes/${episodeId}/comments/${commentId}/vote`, { value });
    } catch {
      const { data: cData } = await api.get(`/episodes/${episodeId}/comments`);
      setComments(cData.comments || []);
    }
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
      <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-6">
        {episode.title}
      </h1>
      
      {!token || !user ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6 text-amber-900 text-sm dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
          Log in to stream protected video URLs. JWT is required for range streaming.
        </div>
      ) : (
        <VideoPlayer
          episode={episode}
          token={token}
          autoNextEnabled
          onPrev={prev?.episode ? () => navigate(`/watch/${prev.episode._id}`) : undefined}
          onNext={next?.episode ? () => navigate(`/watch/${next.episode._id}`) : undefined}
          onEnded={() => {
            if (next?.episode) navigate(`/watch/${next.episode._id}`);
          }}
        />
      )}

      <div className="mt-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6 mb-2">
        <p className="text-slate-600 dark:text-slate-400 flex-1 text-lg">{episode.description}</p>
        
        {/* Like & Dislike Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {user && (
            <RatingWidget
              episodeId={episodeId}
              initialRating={myRating}
              onRatingUpdate={(avg, total) => {
                setData((prev) => ({
                  ...prev,
                  episode: { ...prev.episode, ratingAvg: avg, totalRatings: total },
                }));
              }}
            />
          )}

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 rounded-full p-1 shadow-inner shrink-0">
            <button
              onClick={() => handleVote(1)}
              aria-label="Like"
              title={!user ? "Log in to like" : "Like"}
              className={`group flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-200 active:scale-95 ${
                userVote === 1 
                  ? 'bg-teal-600 text-white shadow-md ring-1 ring-teal-500' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-teal-600 dark:hover:text-teal-400'
              } ${!user && 'opacity-70 cursor-not-allowed'}`}
              disabled={!user}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={userVote === 1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${userVote !== 1 && 'group-hover:-translate-y-0.5 transition-transform'}`}><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>
              <span className="text-sm">{likes > 0 ? likes : 'Like'}</span>
            </button>
            
            <div className="w-px h-5 bg-slate-300 dark:bg-white/10" />
            
            <button
              onClick={() => handleVote(-1)}
              aria-label="Dislike"
              title={!user ? "Log in to dislike" : "Dislike"}
              className={`group flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-200 active:scale-95 ${
                userVote === -1 
                  ? 'bg-rose-600 text-white shadow-md ring-1 ring-rose-500' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-rose-600 dark:hover:text-rose-400'
              } ${!user && 'opacity-70 cursor-not-allowed'}`}
              disabled={!user}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={userVote === -1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${userVote !== -1 && 'group-hover:translate-y-0.5 transition-transform'}`}><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/></svg>
              <span className="text-sm">{dislikes > 0 ? dislikes : 'Dislike'}</span>
            </button>
          </div>
        </div>
      </div>

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
                <CommentVoteButtons item={c} user={user} onVote={handleCommentVote} />
                
                {(c.replies || []).map((r) => (
                  <div key={r._id} className="ml-4 mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                    <p className="text-xs text-teal-600 dark:text-teal-500">{r.user?.username}</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{r.body}</p>
                    <CommentVoteButtons item={r} user={user} onVote={handleCommentVote} />
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col h-full">
          <h2 className="font-semibold text-slate-900 dark:text-white mb-3">Live feed (Socket.IO)</h2>
          <div className="flex-1 min-h-[12rem] max-h-64 overflow-y-auto rounded-xl bg-slate-100 border border-slate-200 p-4 text-sm flex flex-col-reverse dark:bg-charcoal-900 dark:border-white/10 mb-4 shadow-inner">
            <div className="space-y-3">
              {live.map((m, i) => (
                <div key={`${m._id}-${i}`} className="animate-fadeIn">
                  <span className="font-semibold text-teal-700 dark:text-teal-400 mr-2">{m.user?.username}</span>
                  <span className="text-slate-800 dark:text-slate-200 break-words">{m.body}</span>
                </div>
              ))}
              {!live.length && <p className="text-slate-500 italic">No live messages yet. Be the first!</p>}
            </div>
          </div>
          {user ? (
            <form onSubmit={submitLiveChat} className="flex gap-2 shrink-0">
              <input
                value={liveMsg}
                onChange={(e) => setLiveMsg(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-white/10 dark:bg-charcoal-850 dark:text-slate-100 dark:focus:ring-teal-400/30"
                placeholder="Say something to the room…"
              />
              <button type="submit" className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 transition-colors text-white text-sm font-semibold rounded-xl shadow-md">
                Send
              </button>
            </form>
          ) : (
            <div className="text-center text-sm text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-white/5 py-2 rounded-lg">
              Log in to chat live
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
