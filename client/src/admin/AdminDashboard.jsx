import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import Spinner from '../components/Spinner';
import { Panel } from './adminUi';

const shortcuts = [
  { to: '/admin/guide', title: 'Admin guide', desc: 'Step-by-step: uploads → series → seasons → episodes', accent: 'from-sky-500/20 to-sky-600/5' },
  { to: '/admin/users', title: 'Manage users', desc: 'Roles, bans, account access', accent: 'from-violet-500/20 to-violet-600/5' },
  { to: '/admin/media', title: 'Media uploads', desc: 'Videos, posters, subtitles', accent: 'from-teal-500/20 to-teal-600/5' },
  { to: '/admin/series/new', title: 'New series', desc: 'Wizard: basics, then details & publish', accent: 'from-cyan-500/20 to-cyan-600/5' },
  { to: '/admin/series/drafts', title: 'Drafts', desc: 'Unpublished series — continue or publish', accent: 'from-amber-500/20 to-amber-600/5' },
  { to: '/admin/seasons', title: 'New season', desc: 'Add a season to existing IP', accent: 'from-orange-500/20 to-orange-600/5' },
  { to: '/admin/episodes', title: 'New episode', desc: 'Attach video file to a season', accent: 'from-rose-500/20 to-rose-600/5' },
  { to: '/admin/series', title: 'Series library', desc: 'Browse published and draft entries', accent: 'from-slate-500/15 to-slate-600/5' },
];

export default function AdminDashboard() {
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/dashboard')
      .then((r) => setDash(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Spinner label="Loading dashboard…" />
      </div>
    );
  }

  if (!dash) {
    return (
      <div className="py-16 text-center text-slate-600 dark:text-slate-400">
        Could not load dashboard. Check your connection and try again.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ['Total users', dash.totalUsers, '👥'],
          ['Series', dash.totalSeries, '📚'],
          ['Episodes', dash.totalEpisodes, '▶'],
          ['Total views', dash.totalViews != null ? Number(dash.totalViews).toLocaleString() : '0', '👁'],
        ].map(([label, val, icon]) => (
            <div
              key={label}
              className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-charcoal-850/60"
            >
              <span className="absolute right-3 top-3 text-2xl opacity-30 grayscale" aria-hidden>
                {icon}
              </span>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
              <p className="mt-2 font-display text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{val}</p>
            </div>
          ))}
      </div>

      {(dash.draftSeries ?? 0) > 0 && (
        <Link
          to="/admin/series/drafts"
          className="block rounded-2xl border border-amber-200/80 bg-amber-50/90 px-5 py-4 text-sm text-amber-950 hover:bg-amber-100/90 transition-colors dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100 dark:hover:bg-amber-950/50"
        >
          <span className="font-semibold">{dash.draftSeries} draft series</span>
          <span className="text-amber-800/90 dark:text-amber-200/90"> — continue editing or publish from the Drafts page →</span>
        </Link>
      )}

      <div className="rounded-2xl border border-teal-200/60 bg-gradient-to-br from-teal-50/80 to-white p-5 dark:from-teal-950/30 dark:to-charcoal-900/40 dark:border-teal-900/30">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          <span className="font-medium text-slate-800 dark:text-slate-200">Active users (7 days): </span>
          {dash.activeUsersLast7Days ?? '—'}
        </p>
      </div>

      <Panel title="Quick actions" subtitle="Jump to the task you need">
        <div className="grid sm:grid-cols-2 gap-4">
          {shortcuts.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className={`group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br ${s.accent} p-5 transition-all duration-300 hover:border-teal-400/50 hover:shadow-lg hover:-translate-y-0.5 dark:border-white/10 dark:hover:border-teal-500/30`}
            >
              <h3 className="font-display font-semibold text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-300">
                {s.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{s.desc}</p>
              <span className="absolute bottom-4 right-4 text-teal-600/40 group-hover:text-teal-500 text-xl transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}
