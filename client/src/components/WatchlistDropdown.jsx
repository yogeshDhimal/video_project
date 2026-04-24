import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

export default function WatchlistDropdown() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const ref = useRef(null);


  useEffect(() => {
    let active = true;
    api.get('/bookmarks')
      .then((r) => {
        if (active) setItems(r.data.items || []);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [open]);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 text-sm px-3.5 py-2 rounded-xl border font-medium transition-colors ${
          open 
            ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:border-teal-500/30' 
            : 'border-transparent text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/[0.06] hover:bg-slate-100'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={open ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}>
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
        </svg>
        <span className="hidden sm:inline">Watchlist</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[22rem] max-h-[28rem] overflow-y-auto bg-white border border-slate-200 shadow-2xl rounded-2xl dark:bg-charcoal-900 dark:border-white/10 dark:shadow-glow z-50 origin-top-right animate-fadeUp">
          <div className="p-3">
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                Your Watchlist
              </h3>
              <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 px-2 py-0.5 rounded-full">
                {items.length} Series
              </span>
            </div>
            
            {items.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-charcoal-850 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2 opacity-30"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>
                <p>Your watchlist is empty.</p>
                <p className="text-xs mt-1 opacity-70">Add series to watch later.</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {items.map((series) => (
                  <li key={series._id}>
                    <Link
                      to={`/series/${series._id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group"
                    >
                      <div className="w-12 h-16 shrink-0 overflow-hidden rounded-md bg-slate-200 dark:bg-black/50 border border-slate-200 dark:border-white/10">
                        <img 
                          src={`/api/assets/poster/${series._id}`} 
                          alt="" 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0 pr-2">
                        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                          {series.title}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {series.releaseYear}
                          </span>
                          {(series.genres && series.genres.length > 0) && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600"></span>
                              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                                {series.genres[0]}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
