import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import SeriesCard from '../components/SeriesCard';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from 'sonner';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [activeTab, setActiveTab] = useState('watchlist');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [watchHistoryPaused, setWatchHistoryPaused] = useState(user?.watchHistoryPaused || false);
  const [msg, setMsg] = useState('');
  const [bookmarks, setBookmarks] = useState([]);
  const [watchHistory, setWatchHistory] = useState([]);
  const [continueWatching, setContinueWatching] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [avatarHash, setAvatarHash] = useState(Date.now());

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  const [confirmAction, setConfirmAction] = useState(null);

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
    const fetchData = async () => {
      try {
        const [bookmarksRes, continueRes] = await Promise.all([
          api.get('/bookmarks'),
          api.get('/watch-history/continue'),
        ]);
        setBookmarks(bookmarksRes.data.items || []);
        setContinueWatching(continueRes.data.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'history' && watchHistory.length === 0) {
      fetchWatchHistory();
    }
  }, [activeTab]);

  const fetchWatchHistory = async () => {
    setHistoryLoading(true);
    try {
      const { data } = await api.get('/watch-history');
      setWatchHistory(data.items || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load watch history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    const { data } = await api.patch('/users/profile', { username });
    setUser(data.user);
    setMsg('Profile updated successfully');
    setTimeout(() => setMsg(''), 3000);
  };

  const saveEmail = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put('/users/email', { email });
      setUser(data.user);
      toast.success('Email updated successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update email');
    }
  };

  const toggleHistoryPause = async () => {
    try {
      const newValue = !watchHistoryPaused;
      const { data } = await api.put('/users/settings', { watchHistoryPaused: newValue });
      setUser(data.user);
      setWatchHistoryPaused(newValue);
      toast.success(newValue ? 'Watch history paused' : 'Watch history resumed');
    } catch (err) {
      toast.error('Failed to update setting');
    }
  };

  const clearHistory = async () => {
    setConfirmAction({
      title: 'Clear Watch History',
      description: 'Are you sure you want to clear your watch history? This will remove all progress data from your profile view.',
      confirmLabel: 'Clear from View',
      cancelLabel: 'Cancel',
      onConfirm: async () => {
        try {
          await api.post('/watch-history/clear');
          setWatchHistory([]);
          setContinueWatching([]);
          toast.success('History cleared successfully');
        } catch (err) {
          toast.error('Failed to clear history');
        } finally {
          setConfirmAction(null);
        }
      }
    });
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

  const changePassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      await api.post('/users/change-password', {
        currentPassword,
        newPassword,
      });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) return null;

  const tabs = [
    { id: 'watchlist', label: 'My Watchlist', icon: '📚' },
    { id: 'history', label: 'Watch History', icon: '🕒' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
      <div className="grid md:grid-cols-12 gap-10">
        {/* Profile Sidebar */}
        <div className="md:col-span-4 lg:col-span-3 space-y-8 sticky top-8 self-start h-fit">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight">
              My Profile
            </h1>

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
                  <span className="text-white text-xs font-semibold uppercase tracking-wider">
                    Change
                  </span>
                  <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
                </label>
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-900 dark:text-white text-lg">
                  {user.username}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{user.role}</p>
              </div>
            </div>

            {msg && (
              <div className="mb-4 px-4 py-3 bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
                <p className="text-teal-700 dark:text-teal-400 text-sm font-medium">{msg}</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area with Tabs */}
        <div className="md:col-span-8 lg:col-span-9">
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-8 border-b border-slate-200 dark:border-white/10 sticky top-0 z-20 bg-white dark:bg-charcoal-900/80 backdrop-blur supports-[backdrop-filter]:bg-white/80 supports-[backdrop-filter]:dark:bg-charcoal-900/80">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 font-medium text-sm transition-all relative ${
                  activeTab === tab.id
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 dark:bg-white rounded-t-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'watchlist' && (
            <div>
              {/* Continue Watching Section */}
              {continueWatching.length > 0 && (
                <div className="mb-10">
                  <h3 className="font-display text-xl font-bold text-slate-900 dark:text-white mb-4">
                    Continue Watching
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {continueWatching.slice(0, 4).map((item) => (
                      <Link
                        key={item.history._id}
                        to={`/watch/${item.episode?._id}?t=${item.history.progressSeconds}`}
                        className="bg-white dark:bg-charcoal-900/40 p-4 rounded-xl border border-slate-200 dark:border-white/5 hover:shadow-md transition-all group cursor-pointer block"
                      >
                        <div className="flex gap-4">
                          {item.series?.poster && (
                            <div className="w-16 h-24 rounded-lg overflow-hidden shrink-0 bg-slate-100 dark:bg-charcoal-800">
                              <img
                                src={item.series.poster}
                                alt={item.series.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1 truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                              {item.series?.title}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                              S{item.season?.seasonNumber} E{item.episode?.episodeNumber}
                            </p>
                            <div className="w-full bg-slate-200 dark:bg-charcoal-800 rounded-full h-1 overflow-hidden mb-1">
                              <div
                                className="bg-teal-500 h-full transition-all"
                                style={{
                                  width: `${
                                    item.history.durationSeconds > 0
                                      ? (item.history.progressSeconds /
                                          item.history.durationSeconds) *
                                        100
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {Math.round(
                                (item.history.progressSeconds / (item.history.durationSeconds || 1)) * 100
                              )}
                              % complete
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Watchlist Section */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                <div>
                  <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    My Watchlist
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Series and movies you want to watch.
                  </p>
                </div>
                <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-sm font-semibold dark:bg-white/5 dark:border-white/10 dark:text-slate-300 shadow-sm shrink-0">
                  {bookmarks.length} Items
                </span>
              </div>

              {loading ? (
                <div className="min-h-[400px] flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin"></div>
                </div>
              ) : bookmarks.length === 0 ? (
                <div className="min-h-[300px] flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-3xl dark:border-white/10 bg-slate-50/50 dark:bg-black/10">
                  <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-5 dark:bg-white/5 text-slate-500 dark:text-slate-400 shadow-inner">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="28"
                      height="28"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-slate-900 text-lg font-bold mb-2 dark:text-white">
                    Your watchlist is empty
                  </h3>
                  <p className="text-sm text-slate-500 max-w-sm text-center leading-relaxed dark:text-slate-400">
                    You haven't saved any shows yet. Add some series to your watchlist so you don't
                    forget them!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {bookmarks.map((series) => (
                    <div
                      key={series._id}
                      className="relative group animate-in zoom-in-95 duration-300 fade-in"
                    >
                      <SeriesCard series={series} />
                      <button
                        onClick={() => removeBookmark(series._id)}
                        className="absolute top-2 left-2 w-8 h-8 bg-black/50 backdrop-blur-md rounded-full text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-rose-500 shadow-lg transition-all duration-200 z-10 hover:scale-110"
                        title="Remove from watchlist"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M18 6 6 18" />
                          <path d="m6 6 12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
                <div>
                  <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Watch History
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Your recently watched episodes and progress.
                  </p>
                </div>
                <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-sm font-semibold dark:bg-white/5 dark:border-white/10 dark:text-slate-300 shadow-sm shrink-0">
                  {watchHistory.length} Episodes
                </span>
              </div>

              {historyLoading ? (
                <div className="min-h-[400px] flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin"></div>
                </div>
              ) : watchHistory.length === 0 ? (
                <div className="min-h-[300px] flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-3xl dark:border-white/10 bg-slate-50/50 dark:bg-black/10">
                  <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-5 dark:bg-white/5 text-slate-500 dark:text-slate-400 shadow-inner">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="28"
                      height="28"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-slate-900 text-lg font-bold mb-2 dark:text-white">
                    No watch history yet
                  </h3>
                  <p className="text-sm text-slate-500 max-w-sm text-center leading-relaxed dark:text-slate-400">
                    Start watching some episodes to see them here!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {watchHistory.map((item) => (
                    <div
                      key={item._id}
                      className="bg-white dark:bg-charcoal-900/40 p-4 rounded-xl border border-slate-200 dark:border-white/5 hover:shadow-md transition-all group"
                    >
                      <div className="flex gap-4">
                        {item.series?.poster && (
                          <div className="w-20 h-28 rounded-lg overflow-hidden shrink-0 bg-slate-100 dark:bg-charcoal-800">
                            <img
                              src={item.series.poster}
                              alt={item.series.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 dark:text-white mb-1 truncate">
                            {item.series?.title || 'Unknown Series'}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                            S{item.season?.seasonNumber} E{item.episode?.episodeNumber} -{' '}
                            {item.episode?.title}
                          </p>

                          {/* Progress Bar */}
                          <div className="mb-2">
                            <div className="w-full bg-slate-200 dark:bg-charcoal-800 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-teal-500 h-full transition-all"
                                style={{
                                  width: `${
                                    item.durationSeconds > 0
                                      ? (item.progressSeconds / item.durationSeconds) * 100
                                      : 0
                                  }%`,
                                }}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400">
                              {new Date(item.lastWatchedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                            {item.completed ? (
                              <span className="px-2 py-0.5 bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 rounded-full font-medium">
                                ✓ Completed
                              </span>
                            ) : (
                              <span className="text-slate-500 dark:text-slate-400">
                                {Math.round((item.progressSeconds / item.durationSeconds) * 100)}%
                                watched
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <div className="mb-8">
                <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">
                  Settings
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                  Manage your account settings and preferences.
                </p>
              </div>

              <div className="space-y-6">
                {/* Profile Settings */}
                <div className="bg-white dark:bg-charcoal-900/40 p-6 rounded-2xl border border-slate-200 shadow-sm dark:border-white/5">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                    Profile Information
                  </h3>
                  <form onSubmit={save}>
                    <div className="mb-4">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
                        Username
                      </label>
                      <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 outline-none transition-all dark:bg-black/20 dark:border-white/10 dark:text-slate-100 dark:focus:bg-black/40 dark:focus:border-teal-400"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 shadow-md"
                    >
                      Update Profile
                    </button>
                  </form>
                </div>

                {/* Password Change */}
                <div className="bg-white dark:bg-charcoal-900/40 p-6 rounded-2xl border border-slate-200 shadow-sm dark:border-white/5">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                    Change Password
                  </h3>
                  <form onSubmit={changePassword} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 outline-none transition-all dark:bg-black/20 dark:border-white/10 dark:text-slate-100 dark:focus:bg-black/40 dark:focus:border-teal-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 outline-none transition-all dark:bg-black/20 dark:border-white/10 dark:text-slate-100 dark:focus:bg-black/40 dark:focus:border-teal-400"
                        minLength={8}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 outline-none transition-all dark:bg-black/20 dark:border-white/10 dark:text-slate-100 dark:focus:bg-black/40 dark:focus:border-teal-400"
                        minLength={8}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium transition-colors dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {passwordLoading ? 'Changing...' : 'Change Password'}
                    </button>
                  </form>
                </div>

                {/* Account & Preferences */}
                <div className="bg-white dark:bg-charcoal-900/40 p-6 rounded-2xl border border-slate-200 shadow-sm dark:border-white/5">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
                    Account & Preferences
                  </h3>
                  
                  <form onSubmit={saveEmail} className="mb-6">
                    <div className="mb-4">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 block">
                        Email Address
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500 outline-none transition-all dark:bg-black/20 dark:border-white/10 dark:text-slate-100 dark:focus:bg-black/40 dark:focus:border-teal-400"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium transition-colors shadow-md whitespace-nowrap"
                        >
                          Update
                        </button>
                      </div>
                    </div>
                  </form>

                  <div className="border-t border-slate-100 dark:border-white/5 pt-6 space-y-5">
                    <div className="flex items-center justify-between px-1">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">Pause Watch History</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          Stop recording the episodes you watch.
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" checked={watchHistoryPaused} onChange={toggleHistoryPause} />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-500/40 rounded-full peer dark:bg-black/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-teal-500 shadow-inner"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between px-1">
                      <div>
                        <h4 className="font-semibold text-slate-900 dark:text-white">Clear Watch History</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                          Remove all watched episodes from your history.
                        </p>
                      </div>
                      <button onClick={clearHistory} type="button" className="px-4 py-2 rounded-xl bg-rose-50 text-rose-600 font-semibold hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 transition-colors">
                        Clear History
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-white/5 pt-6 mt-6 space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5 px-1">
                      <span className="text-slate-500 dark:text-slate-400">Role</span>
                      <span className="text-slate-900 dark:text-white font-medium capitalize">
                        {user.role}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 px-1">
                      <span className="text-slate-500 dark:text-slate-400">Member Since</span>
                      <span className="text-slate-900 dark:text-white font-medium">
                        {new Date(user.createdAt).toLocaleDateString('en-US', {
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmAction && (
        <ConfirmModal
          isOpen={true}
          title={confirmAction.title}
          description={confirmAction.description}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
          confirmLabel={confirmAction.confirmLabel}
          cancelLabel={confirmAction.cancelLabel}
          isDestructive={true}
        />
      )}
    </div>
  );
}
