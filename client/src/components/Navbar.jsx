import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';

const link = ({ isActive }) =>
  `relative px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
    isActive
      ? 'text-teal-700 bg-teal-100 shadow-[inset_0_0_0_1px_rgba(13,148,136,0.2)] dark:text-ice-300 dark:bg-teal-500/15 dark:shadow-[inset_0_0_0_1px_rgba(45,212,191,0.25)]'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.06]'
  }`;

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/85 backdrop-blur-xl shadow-sm dark:border-white/[0.07] dark:bg-charcoal-950/80 dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[4.25rem] flex items-center justify-between gap-4">
        <Link
          to="/"
          className="font-display font-bold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white flex items-center gap-3 group shrink-0"
        >
          <span className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-teal-400 via-teal-600 to-ice-600 shadow-md dark:shadow-glow group-hover:shadow-lg dark:group-hover:shadow-[0_0_24px_-4px_rgba(45,212,191,0.5)] transition-shadow duration-300" />
          StreamVault
        </Link>
        <nav className="hidden md:flex items-center gap-0.5 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/80 dark:bg-black/20 dark:border-white/[0.06]">
          <NavLink to="/" className={link} end>
            Home
          </NavLink>
          <NavLink to="/browse" className={link}>
            Browse
          </NavLink>
          <NavLink to="/search" className={link}>
            Search
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={link}>
              Admin
            </NavLink>
          )}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {user ? (
            <>
              <Link
                to="/profile"
                className="text-sm text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors hidden sm:block max-w-[120px] truncate font-medium"
              >
                {user.username}
              </Link>
              <button
                type="button"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="text-sm px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-800 dark:border-white/10 dark:hover:bg-white/[0.06] dark:text-slate-200 transition-colors"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white px-2 transition-colors"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="text-sm px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-semibold shadow-md dark:shadow-glow transition-all dark:hover:shadow-[0_0_28px_-6px_rgba(20,184,166,0.55)]"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
