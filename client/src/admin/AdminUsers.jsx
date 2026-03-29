import { useEffect, useState } from 'react';
import api from '../api/client';
import Spinner from '../components/Spinner';
import { Panel } from './adminUi';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/users')
      .then((r) => setUsers(r.data.items || []))
      .finally(() => setLoading(false));
  }, []);

  const ban = async (id, banned) => {
    await api.patch(`/admin/users/${id}/ban`, { banned, reason: 'Moderation' });
    const u = await api.get('/admin/users');
    setUsers(u.data.items || []);
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Spinner label="Loading users…" />
      </div>
    );
  }

  return (
    <Panel title="User directory" subtitle="Moderate accounts and access">
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-charcoal-900/80 text-slate-600 dark:text-slate-400">
            <tr>
              <th className="p-4 font-semibold">Email</th>
              <th className="p-4 font-semibold">Role</th>
              <th className="p-4 font-semibold">Status</th>
              <th className="p-4 font-semibold w-28">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u._id}
                className="border-t border-slate-100 dark:border-white/5 hover:bg-slate-50/80 dark:hover:bg-white/[0.02]"
              >
                <td className="p-4 text-slate-800 dark:text-slate-200 font-medium">{u.email}</td>
                <td className="p-4">
                  <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 dark:bg-white/10">
                    {u.role}
                  </span>
                </td>
                <td className="p-4">
                  {u.banned ? (
                    <span className="text-red-600 dark:text-red-400 text-xs font-medium">Banned</span>
                  ) : (
                    <span className="text-teal-600 dark:text-teal-400 text-xs font-medium">Active</span>
                  )}
                </td>
                <td className="p-4">
                  <button
                    type="button"
                    onClick={() => ban(u._id, !u.banned)}
                    className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
                  >
                    {u.banned ? 'Unban' : 'Ban'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
