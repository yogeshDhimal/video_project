import { Link } from 'react-router-dom';

/**
 * A professional dropdown for live search results in the Navbar.
 */
export default function SearchDropdown({ results, loading, query, onResultClick }) {
  if (!query.trim()) return null;

  return (
    <div className="absolute top-full right-0 mt-3 w-[22rem] sm:w-[26rem] bg-white border border-slate-300 shadow-2xl rounded-2xl overflow-hidden dark:bg-charcoal-900 dark:border-white/10 dark:shadow-glow z-[60] origin-top-right animate-fadeUp">
      <div className="p-3 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest px-2">Top Matches</p>
      </div>

      <div className="max-h-[28rem] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="py-2 px-3 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-12 h-16 rounded-lg bg-slate-200 dark:bg-white/5 flex-shrink-0" />
                <div className="flex-1 py-1 space-y-3">
                  <div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length > 0 ? (

          <div className="py-1">
            {results.map((s) => (
              <Link
                key={s._id}
                to={`/series/${s._id}`}
                onClick={onResultClick}
                className="group flex gap-3 px-3 py-2.5 hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-all border-b border-slate-100 last:border-0 dark:border-white/5"
              >
                <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-200 dark:bg-white/5">
                  <img
                    src={`/api/assets/poster/${s._id}`}
                    alt=""
                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    onError={(e) => (e.target.style.display = 'none')}
                  />
                </div>
                <div className="flex-1 min-w-0 py-1">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 decoration-teal-500/20 underline-offset-4">
                    {s.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 font-medium">
                    {s.releaseYear} • {s.genres?.[0] || 'Series'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500 dark:text-slate-400">
            <p className="text-sm font-bold">No series matches found</p>
            <p className="text-[11px] mt-1 font-medium">Check spelling or try a broader term</p>
          </div>
        )}
      </div>

      <Link
        to={`/search?q=${encodeURIComponent(query)}`}
        onClick={onResultClick}
        className="block p-4 text-center text-xs font-black text-teal-600 bg-teal-50 hover:bg-teal-100 dark:text-teal-400 dark:bg-teal-500/5 dark:hover:bg-teal-500/10 border-t border-slate-200 dark:border-white/5 transition-all tracking-widest"
      >
        VIEW ALL RESULTS
      </Link>
    </div>
  );
}

