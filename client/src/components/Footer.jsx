import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="relative border-t border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-charcoal-900 transition-colors pt-12 pb-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <span className="font-display font-bold text-xl text-slate-900 dark:text-white tracking-tight">
                StreamVault
              </span>
            </Link>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm leading-relaxed mb-6">
              A premium local-first video streaming platform designed with a modern aesthetic, personalized machine-learning algorithms, and an ultra-fast backend.
            </p>
          </div>
          
          <div>
            <h3 className="text-slate-900 dark:text-white font-semibold text-sm tracking-widest uppercase mb-4">Platform</h3>
            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <li><Link to="/browse" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Browse Catalog</Link></li>
              <li><Link to="/search" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Typo-Tolerant Search</Link></li>
              <li><Link to="/" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Trending Now</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-slate-900 dark:text-white font-semibold text-sm tracking-widest uppercase mb-4">Legal & About</h3>
            <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
              <li><span className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer">Privacy Policy</span></li>
              <li><span className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer">Terms of Service</span></li>
              <li><span className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer">Project Info</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-500">
            © {new Date().getFullYear()} StreamVault. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
