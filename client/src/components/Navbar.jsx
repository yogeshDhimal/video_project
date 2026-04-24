import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/client';
import ThemeToggle from './ThemeToggle';
import WatchlistDropdown from './WatchlistDropdown';
import NotificationsDropdown from './NotificationsDropdown';
import SearchDropdown from './SearchDropdown';

const link = ({ isActive }) =>
  `relative px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
    isActive
      ? 'text-teal-700 bg-teal-100 shadow-[inset_0_0_0_1px_rgba(13,148,136,0.2)] dark:text-ice-300 dark:bg-teal-500/15 dark:shadow-[inset_0_0_0_1px_rgba(45,212,191,0.25)]'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.06]'
  }`;

export default function Navbar() {
  const { user, logout, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userRef = useRef(null);


  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const searchRef = useRef(null);


  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const isSpeechSupported = !!SpeechRecognition;

  const toggleListening = useCallback(() => {
    if (!isSpeechSupported) return;
    if (isListening) {
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
      setIsListening(false);
    };
    recognition.start();
  }, [isSpeechSupported, isListening, SpeechRecognition]);


  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }


    setSearchLoading(true);

    const delayDebounceFn = setTimeout(async () => {
      try {
        const { data } = await api.get('/search', { params: { q: searchQuery } });
        setSearchResults(data.series?.slice(0, 5) || []);
      } catch (err) {
        console.error('Navbar search failed', err);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(delayDebounceFn);
    };
  }, [searchQuery]);



  useEffect(() => {
    function handleClickOutside(event) {
      if (userRef.current && !userRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setIsSearchOpen(false);
    setSearchQuery('');
  }, [location.pathname]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsSearchOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/85 backdrop-blur-xl shadow-sm dark:border-white/[0.07] dark:bg-charcoal-950/80 dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.5)] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[4.25rem] flex items-center justify-between gap-4">
        <div className="flex items-center gap-8 flex-1">
          <Link
            to="/"
            className="font-display font-bold text-lg sm:text-xl tracking-tight text-slate-900 dark:text-white flex items-center gap-3 group shrink-0"
          >
            ClickWatch
          </Link>

          {!isSearchOpen && (
            <nav className="hidden md:flex items-center gap-0.5 p-1 rounded-2xl bg-slate-100/80 border border-slate-200/80 dark:bg-black/20 dark:border-white/[0.06]">
              <NavLink to="/" className={link} end>Home</NavLink>
              <NavLink to="/browse" className={link}>Browse</NavLink>
              <NavLink to="/search" className={link}>Search</NavLink>
              <NavLink to="/watch-together" className={link}>
                <span className="flex items-center gap-1.5">Watch Together</span>
              </NavLink>
              {isAdmin && (
                <NavLink to="/admin" className={link}>
                  <span className="flex items-center gap-1.5">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Admin
                  </span>
                </NavLink>
              )}
            </nav>
          )}

          {/* Integrated Navbar Search */}
          {location.pathname !== '/search' && (
            <div className={`relative flex-1 max-w-md transition-all duration-300 ${isSearchOpen ? 'translate-x-0 opacity-100' : 'hidden md:block'}`} ref={searchRef}>
            <form onSubmit={handleSearchSubmit} className="relative group">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchOpen(true)}
                placeholder={isListening ? 'Listening...' : 'Quick search...'}
                className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-slate-100/50 border border-slate-300/50 focus:bg-white focus:border-teal-500/50 focus:ring-4 focus:ring-teal-500/10 dark:bg-white/5 dark:border-transparent dark:text-white dark:placeholder:text-slate-500 transition-all outline-none text-sm shadow-sm dark:shadow-none"
              />
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-teal-500 transition-colors">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
              
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {isSpeechSupported && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`p-1.5 rounded-lg transition-all ${isListening ? 'bg-rose-500 text-white animate-pulse shadow-glow' : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 dark:text-slate-500'}`}
                  >
                     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
                  </button>
                )}
              </div>
            </form>
            
            {isSearchOpen && (
              <SearchDropdown 
                results={searchResults} 
                loading={searchLoading} 
                query={searchQuery} 
                onResultClick={() => setIsSearchOpen(false)} 
              />
            )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <ThemeToggle />
          
          {loading ? (
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-white/5 animate-pulse border border-slate-300/30 dark:border-white/5" />
          ) : user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <WatchlistDropdown />
              <NotificationsDropdown />
              <div className="relative" ref={userRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all active:scale-90 flex-shrink-0 ${
                    userDropdownOpen 
                      ? 'border-teal-500 shadow-[0_0_20px_-5px_rgba(20,184,166,0.55)]' 
                      : 'border-transparent hover:border-teal-500/50 shadow-md'
                  }`}
                >
                  <img
                    src={user.avatar ? `/api/assets/avatar/${user._id}` : `https://api.dicebear.com/7.x/initials/svg?seed=${user.username}&backgroundColor=14b8a6&fontFamily=Inter&fontWeight=700`}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                </button>
                
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-3 w-52 bg-white border border-slate-200 shadow-2xl rounded-2xl dark:bg-charcoal-900 dark:border-white/10 dark:shadow-glow z-50 origin-top-right animate-fadeUp py-2">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5 mb-1.5">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">Account</p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.username}</p>
                    </div>
                    
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-900/10 transition-all font-bold group"
                      >
                        <svg className="group-hover:rotate-12 transition-transform" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        Admin Console
                      </Link>
                    )}

                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:text-teal-600 hover:bg-teal-50 dark:text-slate-300 dark:hover:text-teal-400 dark:hover:bg-teal-900/10 transition-all font-medium"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      My Profile
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        navigate('/');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/15 transition-all border-t border-slate-100 dark:border-white/5 mt-1.5 pt-3"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 group animate-in fade-in slide-in-from-right-4 duration-500">
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
            </div>
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
              <span className="flex items-center gap-1.5">Watch Together</span>
            </NavLink>
            {isAdmin && (
              <NavLink to="/admin" className={link}>
                Admin
              </NavLink>
            )}
            {user && (
              <>
                <div className="h-px bg-slate-200/50 dark:bg-white/5 my-1" />
                <NavLink to="/profile" className={link}>
                  My Profile
                </NavLink>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    navigate('/');
                  }}
                  className="flex items-center px-3.5 py-4 rounded-xl text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/15 transition-all text-left"
                >
                  Log out
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

