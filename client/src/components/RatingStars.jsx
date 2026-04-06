import { useMemo } from 'react';

/**
 * A beautiful, reusable Star Rating display component.
 * Supports half-stars (visual only) and different sizes.
 */
export default function RatingStars({ rating = 0, max = 5, size = 'sm', className = '' }) {
  const stars = useMemo(() => {
    const s = [];
    const full = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    
    for (let i = 1; i <= max; i++) {
       if (i <= full) s.push('full');
       else if (i === full + 1 && hasHalf) s.push('half');
       else s.push('empty');
    }
    return s;
  }, [rating, max]);

  const sizeClasses = {
    xs: 'w-3 h-3 text-[10px]',
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-base',
    lg: 'w-6 h-6 text-xl',
  };

  const sc = sizeClasses[size] || sizeClasses.sm;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {stars.map((type, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`${sc} ${
            type === 'empty' 
              ? 'text-slate-300 dark:text-slate-700 stroke-slate-400 dark:stroke-slate-600' 
              : 'text-amber-400 fill-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]'
          }`}
        >
          {type === 'full' ? (
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          ) : type === 'half' ? (
            <>
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="url(#halfGrad)" />
              <defs>
                <linearGradient id="halfGrad">
                  <stop offset="50%" stopColor="currentColor" />
                  <stop offset="50%" stopColor="transparent" stopOpacity="0" />
                </linearGradient>
              </defs>
            </>
          ) : (
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          )}
        </svg>
      ))}
      {(rating > 0 || rating === 0) && (
        <span className="ml-1.5 font-bold text-slate-800 dark:text-slate-200 tabular-nums">
          {Number(rating).toFixed(1)}
        </span>
      )}
    </div>
  );
}
