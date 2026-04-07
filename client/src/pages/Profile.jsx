import { useState, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import SeriesCard from '../components/SeriesCard';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [msg, setMsg] = useState('');
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avatarHash, setAvatarHash] = useState(Date.now());

  const getAvatarSource = () => {
    if (!user?.avatar) return null;
    if (user.avatar.startsWith('http')) return user.avatar;
    return `/api/assets/avatar/${user._id}?t=${avatarHash}`;
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    const fetchBookmarks = async () => {
      try {
        const { data } = await api.get('/bookmarks');
        setBookmarks(data.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBookmarks();
  }, [user]);

  const save = async (e) => {
    e.preventDefault();
    const { data } = await api.patch('/users/profile', { username });
    setUser(data.user);
    setMsg('Profile updated successfully');
    setTimeout(() => setMsg(''), 3000);
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const { data } = await api.post('/users/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser(data.user);
      setAvatarHash(Date.now());
      setMsg('Avatar updated securely');
      setTimeout(() => setMsg(''), 3000);
    } catch {}
  };

  const removeBookmark = async (id) => {
    try {
      await api.delete(`/bookmarks/${id}`);
      setBookmarks((prev) => prev.filter((b) => b._id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      <div className="grid md:grid-cols-12 gap-10">
        
        {/* Profile Settings Sidebar */}
        <div className="md:col-span-4 lg:col-span-3 space-y-8">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">Profile Settings</h1>
            
            <div className="flex flex-col items-center gap-4 mb-8 pt-4 pb-6 border-b border-slate-200 dark:border-white/10">
              <div className="w-28 h-28 rounded-full overflow-hidden border-[3px] border-white shadow-xl bg-slate-100 dark:border-charcoal-800 dark:bg-charcoal-900 group relative">
                {user?.avatar ? (
                  <img src={getAvatarSource()} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-4xl font-semibold">
                    {user?.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <label className="absolute inset-0 bg-black/50 invisible group-hover:visible flex items-center justify-center cursor-pointer transition-all">
                  <span className="text-white text-xs font-semibold uppercase tracking-wider">Change</span>
                  <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
                </label>
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-900 dark:text-white text-lg">{user.username}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{user.role}</p>
              </div>
            </div>
            
            {msg && (
              <div className="mb-4 px-4 py-3 bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
                <p className="text-teal-700 dark:text-teal-400 text-sm font-medium">{msg}</p>
              </div>
            )}
            
            <form onSubmit={save} className="bg-white dark:bg-charcoal-900/40 p-5 rounded-2xl border border-slate-200 shadow-sm dark:border-white/5">
              <div className="mb-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">Username</label>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 outline-none transition-all dark:bg-black/20 dark:border-white/10 dark:text-slate-100 dark:focus:bg-black/40 dark:focus:border-teal-400"
                />
              </div>
              <button type="submit" className="w-full px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 shadow-md">
                Save
              </button>
            </form>
          </div>
        </div>

        {/* My Collection Section */}
        <div className="md:col-span-8 lg:col-span-9">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4 pt-1">
            <div>
              <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">My Watchlist</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Manage all the series and movies you want to watch.</p>
            </div>
            <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-sm font-semibold dark:bg-white/5 dark:border-white/10 dark:text-slate-300 shadow-sm shrink-0">
              {bookmarks.length} Items Saved
            </span>
          </div>

          {loading ? (
            <div className="min-h-[400px] flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin"></div>
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="min-h-[300px] flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-3xl dark:border-white/10 bg-slate-50/50 dark:bg-black/10">
              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-5 dark:bg-white/5 text-slate-500 dark:text-slate-400 shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
              </div>
              <h3 className="text-slate-900 text-lg font-bold mb-2 dark:text-white">Your watchlist is empty</h3>
              <p className="text-sm text-slate-500 max-w-sm text-center leading-relaxed dark:text-slate-400">
                You haven't saved any shows yet. Add some series to your watchlist so you don't forget them!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {bookmarks.map((series) => (
                <div key={series._id} className="relative group animate-in zoom-in-95 duration-300 fade-in">
                  <SeriesCard series={series} />
                  <button 
                    onClick={() => removeBookmark(series._id)}
                    className="absolute top-2 left-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-500 shadow-lg transition-all duration-200 z-10 hover:scale-110"
                    title="Remove from watchlist"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
