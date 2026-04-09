import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import VideoPlayer from '../components/VideoPlayer';
import RatingWidget from '../components/RatingWidget';
import Spinner from '../components/Spinner';
import { toast } from 'sonner';
import ConfirmModal from '../components/ConfirmModal';
import { io } from 'socket.io-client';
import DiscussionDrawer from '../components/DiscussionDrawer';

function CommentVoteButtons({ item, user, onVote }) {
  const uv = item.userVote || 0;
  return (
    <div className="flex items-center gap-4 mt-2">
      <button
        onClick={() => onVote(item._id, 1)}
        disabled={!user}
        className={`flex items-center gap-1.5 text-xs font-bold transition-all ${uv === 1 ? 'text-teal-600 dark:text-teal-400 scale-105' : 'text-slate-500 hover:text-teal-600 dark:hover:text-teal-400'} ${!user && 'opacity-50 cursor-not-allowed'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={uv === 1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>
        <span>{item.likes || 0}</span>
      </button>
      <button
        onClick={() => onVote(item._id, -1)}
        disabled={!user}
        className={`flex items-center gap-1.5 text-xs font-bold transition-all ${uv === -1 ? 'text-rose-600 dark:text-rose-400 scale-105' : 'text-slate-500 hover:text-rose-600 dark:hover:text-rose-400'} ${!user && 'opacity-50 cursor-not-allowed'}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={uv === -1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/></svg>
        <span>{item.dislikes > 0 ? item.dislikes : ''}</span>
      </button>
    </div>
  );
}

function CommentItem({ comment, user, onVote, onSubmitReply, onDelete, onReport, depth = 0, highlightedCommentId }) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReplies, setShowReplies] = useState(false);
  const replies = comment.replies || [];
  
  const canDelete = user && (user._id === comment.userId || user.role === 'admin');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onSubmitReply(comment._id, replyText);
    setReplyText('');
    setIsReplying(false);
    setShowReplies(true);
  };

  const isReply = depth > 0;
  const isHighlighted = highlightedCommentId === comment._id;

  const avatarUrl = comment.user?.avatar ? `/api/assets/avatar/${comment.user._id}` : `https://api.dicebear.com/7.x/initials/svg?seed=${comment.user?.username || 'U'}&backgroundColor=14b8a6&fontFamily=Inter&fontWeight=700`;

  return (
    <div id={`comment-${comment._id}`} className={`relative group/thread ${isReply ? 'mt-3' : 'mb-10'}`}>
      {/* Structural Thread Line - Only for Level 2 (depth 1) and Level 3 (depth 2) */}
      {(depth >= 1 && depth <= 2) && (
        <div className="absolute -left-3 sm:-left-6 top-1 bottom-0 w-[2.5px] bg-slate-200 dark:bg-white/10 rounded-full z-0 pointer-events-none" />
      )}

      <div className="group/comment relative z-10 flex gap-3 sm:gap-4">
        {/* User Avatar */}
        <div className="flex-shrink-0 mt-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-slate-200 border border-slate-300 dark:border-white/10 shrink-0 shadow-sm relative z-20">
             <img src={avatarUrl} alt={comment.user?.username} className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className={`p-3.5 sm:p-4 rounded-2xl ${isReply ? 'bg-slate-50 border border-slate-100 dark:bg-charcoal-900/40 dark:border-white/[0.04]' : 'bg-white border border-slate-200 shadow-sm dark:bg-charcoal-850 dark:border-white/5 border-b-[3px] dark:border-b-white/10'} transition-all duration-300 ${isHighlighted ? 'ring-2 ring-teal-500 shadow-teal-500/20' : ''}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-3">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  {comment.user?.username}
                </p>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity duration-200">
                {canDelete && (
                  <button 
                    onClick={() => onDelete(comment._id)}
                    className="p-1.5 text-rose-400 hover:text-rose-600 dark:text-rose-500/50 dark:hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/10"
                    title="Delete comment"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                  </button>
                )}
                <button
                  onClick={() => onReport(comment._id)}
                  className="px-2 py-1 text-[10px] font-black text-slate-400 hover:text-rose-500 transition-colors uppercase tracking-widest rounded"
                  title="Report inappropriate content"
                >
                  Report
                </button>
              </div>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed break-words">
              {comment.replyToUser && depth >= 2 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-teal-50 dark:bg-teal-900/40 text-[10px] font-black text-teal-700 dark:text-teal-400 mr-2 border border-teal-100 dark:border-teal-500/20 shadow-sm">
                  @{comment.replyToUser.username}
                </span>
              )}
              {comment.body}
            </p>
          </div>

          <div className="flex items-center gap-5 mt-1.5 px-1 pb-1">
            <CommentVoteButtons item={comment} user={user} onVote={onVote} />
            {user && (
              <button 
                onClick={() => setIsReplying(!isReplying)}
                className={`text-[10px] font-black uppercase tracking-widest transition-colors pt-2 ${isReplying ? 'text-rose-500' : 'text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400'}`}
              >
                {isReplying ? 'Cancel' : 'Reply'}
              </button>
            )}
          </div>

          {isReplying && (
            <form onSubmit={handleSubmit} className="mt-3 flex gap-2 animate-fadeUp">
              <input
                autoFocus
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 outline-none dark:bg-charcoal-850 dark:border-white/10 dark:text-white placeholder:text-slate-400"
                placeholder={`Reply to ${comment.user?.username}...`}
              />
              <button type="submit" className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-[11px] font-black uppercase tracking-widest shadow-md hover:bg-teal-500 transition-colors">
                Post
              </button>
            </form>
          )}

          {/* Flat List of Replies Toggle */}
          {!isReply && replies.length > 0 && (
            <button 
              onClick={() => setShowReplies(!showReplies)}
              className="mt-2 text-[10px] font-black text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 uppercase tracking-widest flex items-center gap-2 transition-colors py-1"
            >
              <div className="w-8 h-[1px] bg-slate-300 dark:bg-slate-700" />
              {showReplies ? 'Hide replies' : `View replies (${replies.length})`}
            </button>
          )}
        </div>
      </div>

      {/* RECURSIVE REPLIES - Moved outside parent content to ensure true flattening at depth >= 2 */}
      {((!isReply && showReplies) || isReply) && replies.length > 0 && (
        <div className={`mt-4 space-y-4 ${depth <= 1 ? 'ml-6 sm:ml-12' : 'ml-0'}`}>
          {replies.map((r) => (
            <CommentItem 
              key={r._id} 
              comment={r} 
              user={user} 
              onVote={onVote} 
              onSubmitReply={onSubmitReply}
              onDelete={onDelete}
              onReport={onReport}
              depth={depth + 1}
              highlightedCommentId={highlightedCommentId}
            />
          ))}
        </div>
      )}
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
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportRequest, setReportRequest] = useState(null); // { id, type: 'comment' | 'chat' }
  const [isReporting, setIsReporting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchParams] = useSearchParams();
  const highlightedCommentId = searchParams.get('commentId');
  const startTime = parseFloat(searchParams.get('t') || 0);

  const [isDrawerOpen, setIsDrawerOpen] = useState(!!highlightedCommentId);
  const [activeDrawerTab, setActiveDrawerTab] = useState('comments');

  useEffect(() => {
    if (comments.length > 0 && highlightedCommentId) {
      setTimeout(() => {
        const el = document.getElementById(`comment-${highlightedCommentId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500); // Wait for rendering out the recursive comments
    }
  }, [comments, highlightedCommentId]);

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
  const submitComment = async (parentId = null, body = null) => {
    const text = body || comment;
    if (!text.trim()) return;
    try {
      const { data: cData } = await api.post(`/episodes/${episodeId}/comments`, { 
        body: text,
        parentId 
      });
      if (!body) setComment('');
      
      const updateReplies = (list) => {
        let replyToUser = null;
        const findAndAddReply = (items) => {
          return items.map(item => {
            if (item._id === parentId) {
              replyToUser = { username: item.user?.username };
              return { 
                ...item, 
                replies: [...(item.replies || []), { ...cData.comment, replyToUser, replies: [] }] 
              };
            }
            if (item.replies && item.replies.length > 0) {
              return { ...item, replies: findAndAddReply(item.replies) };
            }
            return item;
          });
        };

        if (!parentId) return [{ ...cData.comment, replies: [] }, ...list];
        return findAndAddReply(list);
      };

      if (cData.comment) {
        if (!parentId) {
          setComments((prev) => [{ ...cData.comment, replies: [] }, ...prev]);
        } else {
          setComments((prev) => updateReplies(prev));
        }
      } else {
        const { data: c } = await api.get(`/episodes/${episodeId}/comments`);
        setComments(c.comments || []);
      }
    } catch {
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

  const handleDeleteComment = (commentId) => {
    setItemToDelete(commentId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    
    const commentId = itemToDelete;

    // Recursive optimistic filter
    const filterRecurse = (list) => {
      return list.filter(c => c._id !== commentId).map(c => {
        if (c.replies) {
          return { ...c, replies: filterRecurse(c.replies) };
        }
        return c;
      });
    };

    setComments(prev => filterRecurse(prev));

    try {
      await api.delete(`/episodes/${episodeId}/comments/${commentId}`);
      toast.success("Comment deleted");
    } catch {
      const { data: cData } = await api.get(`/episodes/${episodeId}/comments`);
      setComments(cData.comments || []);
      toast.error("Failed to delete comment");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setItemToDelete(null);
    }
  };

  const handleReportComment = (commentId) => {
    if (!user) return toast.error("Please log in to report content.");
    setReportRequest({ id: commentId, type: 'comment' });
    setShowReportModal(true);
  };

  const handleReportChatMessage = (msgId) => {
    if (!user) return toast.error("Please log in to report content.");
    setReportRequest({ id: msgId, type: 'chat' });
    setShowReportModal(true);
  };

  const confirmReport = async () => {
    if (!reportRequest) return;
    setIsReporting(true);
    try {
      const { id, type } = reportRequest;
      const endpoint = type === 'comment' 
        ? `/episodes/${episodeId}/comments/${id}/report`
        : `/chat/${id}/report`;
      
      await api.post(endpoint);
      toast.success("Flagged for review. Thank you for keeping ClickWatch safe!", {
        description: "An administrator will check this out soon."
      });
    } catch {
      toast.error("Failed to report. Please try again.");
    } finally {
      setIsReporting(false);
      setShowReportModal(false);
      setReportRequest(null);
    }
  };

  return (
    <div className="max-w-[1500px] mx-auto px-4 py-3 sm:py-8 h-[calc(100dvh-64px)] sm:h-auto overflow-hidden sm:overflow-visible flex flex-col">
      {/* Breadcrumbs */}
      <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        <Link to="/" className="hover:text-teal-700 dark:hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <Link to={`/series/${series?._id}`} className="hover:text-teal-700 dark:hover:text-white">{series?.title}</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-800 dark:text-slate-200">S{season?.number}E{episode.number}</span>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-[1fr_380px] gap-8">
        {/* Main Column */}
        <div className="min-w-0">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-6">
            {episode.title}
          </h1>
      
      <VideoPlayer
        episode={episode}
        token={token}
        startTime={startTime}
        autoNextEnabled
        onPrev={prev?.episode ? () => navigate(`/watch/${prev.episode._id}`) : undefined}
        onNext={next?.episode ? () => navigate(`/watch/${next.episode._id}`) : undefined}
        onEnded={() => {
          if (next?.episode) navigate(`/watch/${next.episode._id}`);
        }}
      />

          <div className="mt-6 border-b border-slate-200 dark:border-white/10 pb-6 mb-2">
            {/* Optimized Action Bar - No horizontal scroll on mobile */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-6">
              {user && (
                <div className="w-full sm:w-auto shrink-0">
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
                </div>
              )}

              <div className="flex items-center gap-4 w-full sm:w-auto">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 rounded-full p-1 shadow-inner shrink-0">
                  <button
                    onClick={() => handleVote(1)}
                    aria-label="Like"
                    title={!user ? "Log in to like" : "Like"}
                    className={`group flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-200 active:scale-95 whitespace-nowrap ${
                      userVote === 1 
                        ? 'bg-teal-600 text-white shadow-md ring-1 ring-teal-500' 
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-teal-600 dark:hover:text-teal-400'
                    } ${!user && 'opacity-70 cursor-not-allowed'}`}
                    disabled={!user}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={userVote === 1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${userVote !== 1 && 'group-hover:-translate-y-0.5 transition-transform'}`}><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg>
                    <span className="text-sm font-bold">{likes > 0 ? (likes >= 1000 ? (likes/1000).toFixed(1) + 'K' : likes) : 'Like'}</span>
                  </button>
                  <div className="w-px h-5 bg-slate-300 dark:bg-white/10" />
                  <button
                    onClick={() => handleVote(-1)}
                    aria-label="Dislike"
                    title={!user ? "Log in to dislike" : "Dislike"}
                    className={`group flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-200 active:scale-95 whitespace-nowrap ${
                      userVote === -1 
                        ? 'bg-rose-600 text-white shadow-md ring-1 ring-rose-500' 
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-rose-600 dark:hover:text-rose-400'
                    } ${!user && 'opacity-70 cursor-not-allowed'}`}
                    disabled={!user}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill={userVote === -1 ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${userVote !== -1 && 'group-hover:translate-y-0.5 transition-transform'}`}><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79-1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/></svg>
                    <span className="text-sm font-bold">{dislikes > 0 ? (dislikes >= 1000 ? (dislikes/1000).toFixed(1) + 'K' : dislikes) : 'Dislike'}</span>
                  </button>
                </div>

                <button
                  onClick={() => { setActiveDrawerTab('comments'); setIsDrawerOpen(true); }}
                  className="flex items-center gap-2.5 px-6 py-2.5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-full hover:bg-slate-50 dark:hover:bg-white/10 transition-all shadow-sm active:scale-95 shrink-0 whitespace-nowrap"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
                  Comments ({comments.length})
                </button>
              </div>
            </div>
          </div>

          {/* Persistent Live Chat (Mobile Only) - Dynamic height to fill screen */}
          <div className="flex-1 min-h-0 lg:hidden mt-4 bg-white dark:bg-charcoal-900/60 rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden flex flex-col shadow-sm mb-4">
            <div className="px-5 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/5">
               <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-pulse" />
                  <h2 className="font-black uppercase tracking-widest text-[9px] text-slate-500 dark:text-slate-400">Live Chat</h2>
               </div>
               <span className="text-[9px] font-bold text-teal-600 dark:text-teal-400 border border-teal-500/20 px-2 py-0.5 rounded-full uppercase">Active</span>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col-reverse gap-4 bg-slate-50/30 dark:bg-transparent">
               <div className="space-y-4">
                  {live.map((m, i) => (
                    <div key={`${m._id}-${i}`} className="animate-fadeIn group/live relative flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center text-teal-700 dark:text-teal-400 font-bold text-[10px] shrink-0">
                        {m.user?.username?.[0] || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-800 dark:text-slate-300 text-[11px] mr-2">{m.user?.username}</span>
                        <span className="text-xs text-slate-600 dark:text-slate-400 break-words leading-relaxed">{m.body}</span>
                      </div>
                    </div>
                  ))}
                  {!live.length && <p className="text-slate-400 italic text-center text-xs py-10 uppercase tracking-widest opacity-50 font-bold">Waiting for messages...</p>}
               </div>
            </div>

            {user ? (
              <form onSubmit={submitLiveChat} className="p-3 border-t border-slate-100 dark:border-white/5 bg-white dark:bg-charcoal-850 flex gap-2">
                <input
                  value={liveMsg}
                  onChange={(e) => setLiveMsg(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-white/10 dark:bg-charcoal-900 dark:text-slate-100"
                  placeholder="Chat live..."
                />
                <button type="submit" className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md transition-colors shrink-0">
                  Send
                </button>
              </form>
            ) : (
              <div className="p-3 text-center text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5">
                Log in to chat
              </div>
            )}
          </div>

        </div>

        {/* Sidebar Column (Hides when comments hub is open for wide mode) */}
        {!isDrawerOpen && (
          <div className="hidden lg:flex flex-col gap-4 animate-fadeIn">
            <div className="rounded-2xl border border-slate-200 bg-white dark:bg-charcoal-900/60 dark:border-white/10 overflow-hidden flex flex-col h-[600px] shadow-sm sticky top-24">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/5">
                 <h2 className="font-black uppercase tracking-widest text-[11px] text-slate-500 dark:text-slate-400">Live Feed</h2>
                 <div className="flex items-center gap-1.5 px-2 py-0.5 bg-teal-100 dark:bg-teal-900/40 text-[9px] font-bold text-teal-700 dark:text-teal-400 rounded-lg">
                    <span className="w-1 h-1 bg-teal-500 rounded-full animate-pulse" />
                    Live
                 </div>
              </div>
              
              <div className="flex-1 p-5 overflow-y-auto custom-scrollbar flex flex-col-reverse gap-4">
                 <div className="space-y-4">
                    {live.map((m, i) => (
                      <div key={`${m._id}-${i}`} className="animate-fadeIn group/live relative flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-teal-900/20 flex-shrink-0 flex items-center justify-center text-[10px] font-bold">
                          {m.user?.username?.[0] || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-slate-800 dark:text-slate-300 text-xs mr-2">{m.user?.username}</span>
                          <span className="text-xs text-slate-600 dark:text-slate-400 break-words">{m.body}</span>
                        </div>
                        {user && m._id && (
                          <button onClick={() => handleReportChatMessage(m._id)} className="opacity-0 group-hover/live:opacity-100 text-[9px] text-slate-400 hover:text-rose-500 transition-all uppercase font-bold self-start mt-0.5">🚩</button>
                        )}
                      </div>
                    ))}
                    {!live.length && <p className="text-slate-400 italic text-center text-xs py-10">Waiting for live messages...</p>}
                 </div>
              </div>

              {user ? (
                <form onSubmit={submitLiveChat} className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex gap-2">
                  <input
                    value={liveMsg}
                    onChange={(e) => setLiveMsg(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-white/10 dark:bg-charcoal-850 dark:text-slate-100"
                    placeholder="Chat live..."
                  />
                  <button type="submit" className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md transition-colors shrink-0">
                    Send
                  </button>
                </form>
              ) : (
                <div className="p-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-white/5 border-t border-slate-100 dark:border-white/5">
                  Log in to chat
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <DiscussionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeTab={activeDrawerTab}
        onTabChange={setActiveDrawerTab}
        title="Episode Discussion"
        tabs={[
          {
            id: 'comments',
            label: 'Comments',
            content: (
              <div className="p-6">
                {user && (
                  <form onSubmit={(e) => { e.preventDefault(); submitComment(); }} className="mb-8 flex gap-3">
                    <input
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="flex-1 px-5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:ring-2 focus:ring-teal-500/20 outline-none dark:bg-charcoal-900/60 dark:border-white/10 dark:text-slate-100"
                      placeholder="Share your thoughts..."
                    />
                    <button type="submit" className="px-5 py-3 rounded-2xl bg-teal-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-teal-500/20 hover:bg-teal-500 transition-all">
                      Post
                    </button>
                  </form>
                )}
                <div className="space-y-4">
                  {comments.map((c) => (
                    <CommentItem 
                      key={c._id} 
                      comment={c} 
                      user={user} 
                      onVote={handleCommentVote} 
                      onSubmitReply={submitComment} 
                      onDelete={handleDeleteComment}
                      onReport={handleReportComment}
                      highlightedCommentId={highlightedCommentId}
                    />
                  ))}
                  {!comments.length && (
                    <div className="py-10 text-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-3xl">
                      <p className="text-slate-400 dark:text-slate-600 text-sm italic">Be the first to join the discussion.</p>
                    </div>
                  )}
                </div>
              </div>
            )
          }
        ]}
      />
      <ConfirmModal
        isOpen={showReportModal}
        title="Report Content"
        description={`Are you sure you want to flag this ${reportRequest?.type === 'comment' ? 'comment' : 'message'} as inappropriate? This helps keep the community safe.`}
        confirmLabel="Confirm Report"
        isDestructive={true}
        isLoading={isReporting}
        onConfirm={confirmReport}
        onCancel={() => setShowReportModal(false)}
      />
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Comment"
        description="Are you sure you want to delete this comment? This action cannot be undone."
        confirmLabel="Delete"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
