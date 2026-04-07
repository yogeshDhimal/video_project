import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import { Panel } from './adminUi';
import { ChartWidget } from './components/ChartWidget';
import { io } from 'socket.io-client';

const shortcuts = [
  { to: '/admin/analytics', title: 'Analytics', desc: 'User growth & trends', accent: 'from-blue-500/20 to-blue-600/5' },
  { to: '/admin/moderation', title: 'Moderation', desc: 'Flagged comments queue', accent: 'from-rose-500/20 to-rose-600/5' },
  { to: '/admin/users', title: 'Manage users', desc: 'Roles, bans, account access', accent: 'from-violet-500/20 to-violet-600/5' },
  { to: '/admin/users', title: 'Manage users', desc: 'Roles, bans, account access', accent: 'from-violet-500/20 to-violet-600/5' },
  { to: '/admin/series/new', title: 'New series', desc: 'Wizard: basics, then details & publish', accent: 'from-cyan-500/20 to-cyan-600/5' },
  { to: '/admin/series/drafts', title: 'Drafts', desc: 'Unpublished series — continue or publish', accent: 'from-amber-500/20 to-amber-600/5' },
  { to: '/admin/seasons', title: 'New season', desc: 'Add a season to existing IP', accent: 'from-orange-500/20 to-orange-600/5' },
  { to: '/admin/episodes', title: 'New episode', desc: 'Attach video file to a season', accent: 'from-rose-500/20 to-rose-600/5' },
  { to: '/admin/series', title: 'Series library', desc: 'Browse published and draft entries', accent: 'from-slate-500/15 to-slate-600/5' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [dash, setDash] = useState(null);
  const [growth, setGrowth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liveViewers, setLiveViewers] = useState(0);

  useEffect(() => {
    // 1. Fetch static dashboard stats
    const fetchStats = async () => {
      try {
        const [dashRes, growthRes] = await Promise.all([
          api.get('/admin/dashboard'),
          api.get('/admin/analytics/growth'),
        ]);
        setDash(dashRes.data);
        setGrowth(growthRes.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();

    // 2. Real-time viewer tracking
    const socket = io(import.meta.env.VITE_API_URL || '', {
      auth: { token: localStorage.getItem('token') },
    });

    socket.on('connect', () => {
      socket.emit('join_admin_stats');
    });

    socket.on('global_active_viewers', ({ count }) => {
      setLiveViewers(count);
    });

    return () => socket.disconnect();
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
    <div className="space-y-8 animate-in fade-in duration-700">
      <Link
        to="/admin/analytics"
        className="block relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-600 to-teal-500 p-8 shadow-lg shadow-teal-600/20 group transition-all hover:-translate-y-0.5"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome back, {user?.username}</h2>
            <p className="text-teal-50/80 max-w-lg leading-relaxed">
              Check out the latest analytics and moderation flags for ClickWatch.
            </p>
          </div>
          <div className="hidden md:flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur group-hover:bg-white/30 transition-colors">
            <span className="text-xl">➔</span>
          </div>
        </div>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            ['Total users', dash.totalUsers, '👥', 'text-blue-500'],
            ['Series', dash.totalSeries, '📚', 'text-teal-500'],
            ['Episodes', dash.totalEpisodes, '▶', 'text-rose-500'],
            ['Total views', dash.totalViews != null ? Number(dash.totalViews).toLocaleString() : '0', '👁', 'text-amber-500'],
          ].map(([label, val, icon, color]) => (
            <div
              key={label}
              className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-charcoal-850/60"
            >
              <span className={`absolute right-3 top-3 text-xl opacity-20 ${color}`} aria-hidden>
                {icon}
              </span>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
              <p className="mt-2 font-display text-2xl font-extrabold text-slate-900 dark:text-white tabular-nums">{val}</p>
            </div>
          ))}
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/10 to-transparent p-5 shadow-sm dark:from-teal-500/5 backdrop-blur-sm">
          <div className="absolute top-4 right-4 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-teal-600 dark:text-teal-400">Live Pulse</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Concurrent Viewers</p>
          <p className="mt-2 font-display text-4xl font-black text-slate-900 dark:text-white tabular-nums">{liveViewers}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-2">Active watching sessions right now</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 min-h-[300px]">
          <ChartWidget 
            title="User Acquisition (Trend)" 
            data={growth} 
            dataKey="newUsers" 
            type="area"
            color="#14b8a6"
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/60 bg-white p-5 dark:bg-charcoal-850/60 dark:border-white/5 shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Data Freshness</p>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
                🕒
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {dash.lastUpdated ? new Date(dash.lastUpdated).toLocaleTimeString(undefined, { timeStyle: 'short' }) : 'Now'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-500 leading-none">Aggregator runs every 15 mins</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-teal-200/60 bg-gradient-to-br from-teal-50/80 to-white p-5 dark:from-teal-950/30 dark:to-charcoal-900/40 dark:border-teal-900/30">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">Market Sentiment</p>
             <p className="text-sm text-slate-600 dark:text-slate-400">
               <span className="font-medium text-slate-800 dark:text-slate-200">Active users (7 days): </span>
               {dash.activeUsersLast7Days ?? '—'}
             </p>
          </div>
        </div>
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

      <Panel title="Quick actions" subtitle="Jump to the task you need">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shortcuts.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className={`group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br ${s.accent} p-5 transition-all duration-300 hover:border-teal-400/50 hover:shadow-lg hover:-translate-y-0.5 dark:border-white/10 dark:hover:border-teal-500/30`}
            >
              <h3 className="font-display font-semibold text-slate-900 dark:text-white group-hover:text-teal-700 dark:group-hover:text-teal-300">
                {s.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{s.desc}</p>
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
