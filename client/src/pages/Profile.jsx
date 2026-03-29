import { useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [msg, setMsg] = useState('');

  const save = async (e) => {
    e.preventDefault();
    const { data } = await api.patch('/users/profile', { username });
    setUser(data.user);
    setMsg('Saved');
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    const { data } = await api.post('/users/avatar', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setUser(data.user);
    setMsg('Avatar updated');
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white mb-8">Profile</h1>
      {msg && <p className="text-teal-600 dark:text-teal-400 text-sm mb-4">{msg}</p>}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-20 h-20 rounded-full overflow-hidden border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-charcoal-850">
          {user?.avatar ? (
            <img src={`/api/assets/avatar/${user._id}`} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-500 text-2xl">
              {user?.username?.[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <label className="cursor-pointer text-sm text-teal-700 dark:text-teal-400 hover:underline font-medium">
          Upload avatar
          <input type="file" accept="image/*" className="hidden" onChange={uploadAvatar} />
        </label>
      </div>
      <form onSubmit={save} className="space-y-4">
        <div>
          <label className="text-sm text-slate-600 dark:text-slate-400">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full mt-1 px-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 dark:bg-charcoal-850 dark:border-white/10 dark:text-slate-100"
          />
        </div>
        <button type="submit" className="px-6 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-medium">
          Save
        </button>
      </form>
    </div>
  );
}
