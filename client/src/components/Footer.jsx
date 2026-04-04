import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/80 dark:border-white/[0.06] bg-slate-50 dark:bg-charcoal-900 transition-colors py-10 mt-16">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 flex flex-col items-center text-center">
        <Link to="/" className="inline-flex items-center gap-3 mb-6 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
            <span className="text-white font-black text-xl tracking-tighter">SV</span>
          </div>
          <span className="font-display font-black text-2xl text-slate-900 dark:text-white tracking-tight">
            StreamVault
          </span>
        </Link>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed mb-8">
          StreamVault does not store any files on our server, we only linked to the media which is hosted on 3rd party services.
        </p>
        
        <div className="flex flex-wrap justify-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300 mb-8">
          <Link to="/browse" className="hover:text-teal-500 transition-colors">Catalog</Link>
          <Link to="/search" className="hover:text-teal-500 transition-colors">Search</Link>
          <span className="hover:text-teal-500 transition-colors cursor-pointer">Terms of Service</span>
          <span className="hover:text-teal-500 transition-colors cursor-pointer">Contact</span>
        </div>

        <p className="text-sm text-slate-400 dark:text-slate-600">
          © {new Date().getFullYear()} StreamVault. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
