import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

/**
 * Centered auth layout: top bar (brand + theme) + vertically & horizontally centered children.
 */
export default function AuthPageShell({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-charcoal-950 dark:text-slate-100 transition-colors duration-200">
      <header className="shrink-0 flex items-center justify-between w-full max-w-md mx-auto px-4 py-4 sm:px-6">
        <Link
          to="/"
          className="font-display font-bold text-lg tracking-tight text-slate-800 dark:text-white flex items-center gap-2.5"
        >
          <span className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-ice-500 shadow-md dark:shadow-glow shrink-0" />
          StreamVault
        </Link>
        <ThemeToggle />
      </header>
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16 pt-2 sm:pb-20 w-full max-w-md mx-auto sm:px-6">
        {children}
      </div>
    </div>
  );
}
