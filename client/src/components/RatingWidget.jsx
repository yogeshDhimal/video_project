import { useState } from 'react';
import { toast } from 'sonner';
import api from '../api/client';

export default function RatingWidget({ episodeId, initialRating = 0, onRatingUpdate }) {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);
  const [busy, setBusy] = useState(false);

  const submitRating = async (val) => {
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

  return (
    <div className="flex flex-col items-center sm:items-start gap-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">
        {rating > 0 ? 'Your Rating' : 'Rate this episode'}
      </span>
      <div className="flex items-center gap-1.5 group">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={busy}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => submitRating(star)}
            className={`transition-all duration-200 transform ${!busy && 'hover:scale-125'} active:scale-95`}
          >
            <span
              className={`text-2xl ${
                star <= (hover || rating)
                  ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                  : 'text-slate-200 dark:text-slate-800'
              }`}
            >
              ★
            </span>
          </button>
        ))}
        {rating > 0 && !hover && (
          <span className="ml-2 text-sm font-bold text-amber-600 dark:text-amber-400">
            {rating}/5
          </span>
        )}
      </div>
    </div>
  );
}
