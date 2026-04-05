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
    <div className={`flex items-center gap-0.5 ${className}`}>
      {stars.map((type, i) => (
        <span
          key={i}
          className={`${sc} ${
            type === 'empty' 
              ? 'text-slate-300 dark:text-slate-700' 
              : 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]'
          }`}
        >
          {type === 'full' ? '★' : type === 'half' ? '☆' : '★'}
          {/* Note: Simple characters for now, can use SVG for perfect half-stars if needed */}
        </span>
      ))}
      {rating > 0 && (
        <span className="ml-1.5 font-bold text-slate-700 dark:text-slate-300 tabular-nums">
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}
