import { Link } from 'react-router-dom';
import RatingStars from './RatingStars';

export default function SeriesCard({ series, episodeId, mathProof, pearsonPredicted }) {
  const to = episodeId ? `/watch/${episodeId}` : `/series/${series._id}`;
  return (
    <Link
      to={to}
      className="group block rounded-2xl overflow-hidden bg-white border border-slate-200/90 shadow-sm dark:bg-charcoal-850/50 dark:border-white/[0.07] card-hover backdrop-blur-sm dark:shadow-none relative"
    >
      <div className="aspect-[2/3] relative bg-gradient-to-b from-slate-100 to-slate-200 dark:from-charcoal-800 dark:to-charcoal-950">
        <img
          src={`/api/assets/poster/${series._id}`}
          alt=""
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-95 group-hover:opacity-100 transition-opacity" />
        
        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-teal-300 text-xs font-bold">
          ▶
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3 pt-8">
          <h3 className="font-display font-semibold text-white text-sm line-clamp-2 leading-snug group-hover:text-teal-50 transition-colors">
            {series.title}
          </h3>
          <p className="text-[11px] text-teal-300/90 dark:text-teal-400/80 mt-1 font-medium">{series.releaseYear}</p>
          
          <div className="mt-2 flex items-center justify-between">
            {series.status === 'completed' ? (
              <RatingStars rating={series.ratingAvg || 0} size="xs" />
            ) : (
              <span className="text-[9px] font-bold uppercase tracking-wider text-teal-300/50">Rating: N/A</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
