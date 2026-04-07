import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/80 dark:border-white/[0.06] bg-slate-50 dark:bg-charcoal-900 transition-colors py-10 mt-16">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex flex-col items-center text-center">
        <Link to="/" className="mb-6 group">
          <span className="font-display font-black text-3xl text-slate-900 dark:text-white tracking-tight hover:text-teal-600 dark:hover:text-teal-400 transition-colors">
            ClickWatch
          </span>
        </Link>
        {/* Logo and Navigation links continue here */}

        
        <div className="flex flex-wrap justify-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300 mb-8">
          <Link to="/browse" className="hover:text-teal-500 transition-colors">Catalog</Link>
          <Link to="/search" className="hover:text-teal-500 transition-colors">Search</Link>
          <span className="hover:text-teal-500 transition-colors cursor-pointer">Terms of Service</span>
          <span className="hover:text-teal-500 transition-colors cursor-pointer">Contact</span>
        </div>

        <p className="text-sm text-slate-400 dark:text-slate-600">
          © {new Date().getFullYear()} ClickWatch. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
