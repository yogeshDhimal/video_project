import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-24 h-24 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-8 shadow-inner">
        <span className="text-4xl">🕵️</span>
      </div>
      <h1 className="font-display text-4xl sm:text-5xl font-black text-slate-900 dark:text-white mb-4">
        Page Not Found
      </h1>
      <p className="text-slate-600 dark:text-slate-400 text-lg max-w-md mb-10 leading-relaxed">
        The page you are looking for doesn't exist or has been moved to another location.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          to="/"
          className="px-8 py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold shadow-lg shadow-teal-500/25 transition-all"
        >
          Return Home
        </Link>
        <Link
          to="/browse"
          className="px-8 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-800 font-bold hover:bg-slate-50 transition-all dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10"
        >
          Browse Catalog
        </Link>
      </div>
    </div>
  );
}
