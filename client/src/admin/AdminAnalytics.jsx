import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, ComposedChart, Area } from 'recharts';
import api from '../api/client';
import Spinner from '../components/Spinner';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function AdminAnalytics() {
  const [growthData, setGrowthData] = useState([]);
  const [popularityData, setPopularityData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [genres, setGenres] = useState([]);
  const [watchTime, setWatchTime] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [growth, popularity, summ, genr, wt] = await Promise.all([
          api.get('/admin/analytics/growth'),
          api.get('/admin/analytics/popularity'),
          api.get('/admin/analytics/summary'),
          api.get('/admin/analytics/genres'),
          api.get('/admin/analytics/watchtime'),
        ]);
        setGrowthData(growth.data);
        setPopularityData(popularity.data);
        setSummary(summ.data);
        setGenres(genr.data);
        setWatchTime(wt.data);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="py-20 flex justify-center"><Spinner label="Crunching numbers..." /></div>;

  const resolved = summary?.totalReportsResolved || 0;
  const pending = summary?.pendingReports || 0;
  const totalReports = resolved + pending;
  const resolutionRate = totalReports === 0 ? 100 : ((resolved / totalReports) * 100).toFixed(1);

  const StatsCard = ({ title, value, unit, icon, accent }) => (
    <div className={`p-6 rounded-3xl bg-white dark:bg-charcoal-850 border border-slate-200/60 dark:border-white/5 shadow-sm overflow-hidden relative group`}>
      <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${accent} opacity-[0.03] dark:opacity-[0.07] rounded-bl-[100px] transition-transform group-hover:scale-110`} />
      <div className="flex items-center gap-3 mb-2 text-slate-500 dark:text-slate-400">
        <span className="text-xl">{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-widest">{title}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-display font-black text-slate-900 dark:text-white tabular-nums">{value}</span>
        {unit && <span className="text-xs font-bold text-slate-400 dark:text-slate-500">{unit}</span>}
      </div>
    </div>
  );

  return (
    <div className="space-y-10 pb-10">
      <header>
        <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white">Admin Command Center</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Mission control for your streaming platform.</p>
      </header>

      {/* Pulse Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatsCard title="Total Users" value={summary?.totalUsers || 0} icon="👥" accent="from-teal-500 to-emerald-500" />
        <StatsCard title="Watch Time" value={summary?.totalHours || 0} unit="HRS" icon="⏱️" accent="from-blue-500 to-indigo-500" />
        <StatsCard title="Discussion Volume" value={summary?.totalComments || 0} unit="MSGS" icon="💬" accent="from-purple-500 to-pink-500" />
        <StatsCard title="Moderation Status" value={summary?.pendingReports || 0} icon="🛡️" accent="from-rose-500 to-orange-500" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* User Growth Chart - Left Column Span 2 */}
        <section className="lg:col-span-2 bg-white dark:bg-charcoal-850 p-6 rounded-3xl border border-slate-200/60 dark:border-white/5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">User Growth (Last 30 Days)</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                <XAxis 
                  dataKey="_id" 
                  tick={{ fontSize: 12 }} 
                  tickFormatter={(str) => new Date(str).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  labelFormatter={(str) => new Date(str).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                />
                <Line 
                  type="monotone" 
                  dataKey="newUsers" 
                  stroke="#14b8a6" 
                  strokeWidth={3} 
                  dot={{ r: 4, stroke: '#14b8a6', strokeWidth: 2, fill: '#fff' }}
                  activeDot={{ r: 6, stroke: '#14b8a6', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Genre Distribution - Right Column Stats */}
        <section className="bg-white dark:bg-charcoal-850 p-6 rounded-3xl border border-slate-200/60 dark:border-white/5 shadow-sm flex flex-col">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Genre Appetite</h2>
          <div className="flex-1 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genres}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {genres.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={8} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {genres.slice(0, 4).map((g, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-[10px] font-bold text-slate-500 uppercase">{g.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Content Popularity (Views) - Left Col */}
        <section className="bg-white dark:bg-charcoal-850 p-6 rounded-3xl border border-slate-200/60 dark:border-white/5 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Trend Leaderboard (Based on Clicks)</h2>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={popularityData} layout="vertical" margin={{ left: 40, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.05} />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="title" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(20, 184, 166, 0.05)' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', background: 'rgba(255,255,255,0.95)' }}
                  itemSorter={() => 0}
                />
                <Area dataKey="totalViews" fill="#14b8a6" fillOpacity={0.05} stroke="none" activeDot={false} tooltipType="none" />
                <Bar 
                   dataKey="totalViews" 
                   radius={[0, 12, 12, 0]} 
                   barSize={16}
                   label={{ position: 'right', fill: '#94a3b8', fontSize: 10, fontWeight: 800, offset: 8 }}
                >
                  {popularityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.8} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Watch Time Engagement - Middle Col */}
        <section className="bg-white dark:bg-charcoal-850 p-6 rounded-3xl border border-slate-200/60 dark:border-white/5 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Engagement Depth (Based on Hours)</h2>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={watchTime} margin={{ top: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.05} />
                <XAxis dataKey="title" hide />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' }}
                  itemSorter={() => 0}
                />
                <Area dataKey="hours" fill="#6366f1" fillOpacity={0.05} stroke="none" activeDot={false} tooltipType="none" />
                <Bar 
                   dataKey="hours" 
                   radius={[12, 12, 0, 0]} 
                   barSize={20}
                   label={{ position: 'top', fill: '#6366f1', fontSize: 10, fontWeight: 800, offset: 8 }}
                >
                  {watchTime.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} fillOpacity={0.8} />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-4 text-[10px] text-slate-400 italic">Actual time spent by users watching this content.</p>
        </section>

        {/* Moderation Pulse - Small Widget */}
        <section className="relative overflow-hidden group bg-slate-900 dark:bg-charcoal-900 rounded-3xl p-6 text-white flex flex-col justify-between shadow-xl border border-white/5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-700" />
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-400">Moderation Pulse</span>
            <h2 className="text-2xl font-display font-black mt-2 leading-tight">Safety & Support Health</h2>
          </div>
          <div className="space-y-4 relative z-10">
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-xl">
              <div className="flex justify-between items-center mb-1">
                 <p className="text-[10px] uppercase font-black tracking-tighter opacity-70">Resolution Rate</p>
                 {resolutionRate >= 95 && <span className="text-[10px] font-black py-0.5 px-2 bg-teal-500/20 text-teal-400 rounded-full">PEAK</span>}
              </div>
              <p className="text-3xl font-display font-black text-teal-400">{resolutionRate}%</p>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
              Excellent! Your moderation team has cleared <span className="text-white font-bold">{summary?.totalReportsResolved || 0} reports</span> in total.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
