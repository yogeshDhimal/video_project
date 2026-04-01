import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';
import WatchlistDropdown from './WatchlistDropdown';
import NotificationsDropdown from './NotificationsDropdown';

const link = ({ isActive }) =>
  `relative px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
    isActive
      ? 'text-teal-700 bg-teal-100 shadow-[inset_0_0_0_1px_rgba(13,148,136,0.2)] dark:text-ice-300 dark:bg-teal-500/15 dark:shadow-[inset_0_0_0_1px_rgba(45,212,191,0.25)]'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.06]'
  }`;

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/85 backdrop-blur-xl shadow-sm dark:border-white/[0.07] dark:bg-charcoal-950/80 dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[4.25rem] flex items-center justify-between gap-4">
        <Link
          to="/"
          className="font-display font-bold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white flex items-center gap-3 group shrink-0"
        >
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
          <NavLink to="/watch-together" className={link}>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>Watch Together</span>
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
              <WatchlistDropdown />
              <NotificationsDropdown />
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

        {/* Mobile Menu Toggle Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06] transition-colors"
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
          )}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/90 dark:border-white/[0.07] bg-white/95 dark:bg-charcoal-950/95 backdrop-blur-xl absolute top-full left-0 w-full shadow-lg dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)] animate-in slide-in-from-top-2">
          <nav className="flex flex-col p-4 space-y-2">
            <NavLink to="/" className={link} end>
              Home
            </NavLink>
            <NavLink to="/browse" className={link}>
              Browse
            </NavLink>
            <NavLink to="/search" className={link}>
              Search
            </NavLink>
            <NavLink to="/watch-together" className={link}>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>Watch Together</span>
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={link}>
                Admin
              </NavLink>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
