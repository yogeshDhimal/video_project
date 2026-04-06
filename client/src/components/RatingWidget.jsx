import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function RatingWidget({ episodeId, initialRating = 0, onRatingUpdate }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(initialRating);

  useEffect(() => {
    setRating(initialRating);
  }, [initialRating]);
  const [hover, setHover] = useState(0);
  const [busy, setBusy] = useState(false);

  const starPath = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

  const submitRating = async (val) => {
    if (!user) {
      toast.error('Please log in to rate this episode.');
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/episodes/${episodeId}/rate`, { rating: val });
      setRating(val);
      if (onRatingUpdate) onRatingUpdate(data.ratingAvg, data.totalRatings);
      toast.success(`You rated this episode ${val} stars!`);
    } catch (err) {
      toast.error('Failed to submit rating.');
    } finally {
      setBusy(false);
    }
  };

  const removeRating = async () => {
    if (!user || busy) return;
    setBusy(true);
    try {
      const { data } = await api.delete(`/episodes/${episodeId}/rate`);
      setRating(0);
      if (onRatingUpdate) onRatingUpdate(data.ratingAvg, data.totalRatings);
      toast.success('Your rating has been removed.');
    } catch (err) {
      toast.error('Failed to remove rating.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-white/40 dark:bg-charcoal-850/40 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm relative overflow-hidden group/widget">
      <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 dark:bg-teal-400/5 rounded-full -mr-16 -mt-16 blur-3xl pointer-events-none" />
      
      <div className="flex flex-col gap-1 shrink-0 text-center sm:text-left w-full sm:w-auto">
        <div className="flex items-center justify-center sm:justify-between w-full">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
            {user ? (rating > 0 ? 'Your Score' : 'Rate Episode') : 'Sign in to rate'}
          </span>
          {user && rating > 0 && (
            <button
              onClick={removeRating}
              disabled={busy}
              type="button"
              className="text-[10px] font-bold text-slate-400 hover:text-rose-500 active:scale-95 transition-all ml-4"
              title="Remove your rating"
            >
              CLEAR
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 justify-center sm:justify-start">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              disabled={busy || !user}
              onMouseEnter={() => user && setHover(star)}
              onMouseLeave={() => setHover(0)}
              onClick={() => submitRating(star)}
              className={`transition-all duration-300 transform ${user && !busy ? 'hover:scale-125 cursor-pointer' : 'opacity-40 cursor-not-allowed'} active:scale-95`}
            >
              <svg
                viewBox="0 0 24 24"
                className={`w-7 h-7 transition-all duration-300 ${
                  star <= (hover || rating)
                    ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] scale-110'
                    : 'text-slate-300 dark:text-slate-700 fill-transparent stroke-[1.5]'
                }`}
                stroke="currentColor"
              >
                <path d={starPath} />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="hidden sm:block w-px h-10 bg-slate-200 dark:bg-white/10" />

      <div className="flex flex-col items-center sm:items-start gap-1">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
          Community Status
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
            {rating > 0 ? rating : '—'}
          </span>
          <span className="text-xs font-bold text-slate-400 dark:text-slate-600">/ 5.0</span>
        </div>
      </div>
    </div>
  );
}
