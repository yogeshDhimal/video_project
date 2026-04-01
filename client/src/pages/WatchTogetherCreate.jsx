import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import SectionHeader from '../components/SectionHeader';

export default function WatchTogetherCreate() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [scheduledStartTime, setScheduledStartTime] = useState('');
  const [search, setSearch] = useState('');
  const [seriesResults, setSeriesResults] = useState([]);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [seasons, setSeasons] = useState([]); 
  const [expandedSeason, setExpandedSeason] = useState(null);
  const [episodes, setEpisodes] = useState([]); // { _id, title, seriesTitle }
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!search.trim()) {
        setSeriesResults([]);
        setSelectedSeries(null);
        return;
      }
      try {
        const { data } = await api.get('/search', { params: { q: search } });
        setSeriesResults(data.series || []);
      } catch (e) { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const selectSeries = async (s) => {
    try {
      const res = await api.get(`/series/${s._id}`);
      setSelectedSeries(s);
      setSeasons(res.data.seasons || []);
      setExpandedSeason(null);
    } catch (e) { /* ignore */ }
  };

  const addEpisode = (ep) => {
    if (episodes.length >= 10) return alert('Maximum 10 episodes allowed');
    if (episodes.find(e => e._id === ep._id)) return;
    setEpisodes([...episodes, ep]);
  };

  const removeEpisode = (id) => {
    setEpisodes(episodes.filter(e => e._id !== id));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (episodes.length === 0) return alert('Add at least one episode');
    try {
      setLoading(true);
      const payload = {
        title,
        episodes: episodes.map(e => e._id),
      };
      if (scheduledStartTime) payload.scheduledStartTime = new Date(scheduledStartTime).toISOString();
      const { data } = await api.post('/watch-rooms', payload);
      navigate(`/watch-together/${data.room._id}`);
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating room');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <SectionHeader title="Create Watch Party" subtitle="Queue up to 10 episodes and watch with friends." />
      
      <form onSubmit={submit} className="bg-white dark:bg-charcoal-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 md:p-8 shadow-sm space-y-8">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Room Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-charcoal-850 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            placeholder="E.g. Naruto Final Arc Marathon"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Schedule Start Time (Optional)</label>
          <p className="text-xs text-slate-500 mb-3">Leave blank to start your room immediately.</p>
          <input
            type="datetime-local"
            value={scheduledStartTime}
            onChange={(e) => setScheduledStartTime(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-charcoal-850 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 [color-scheme:light] dark:[color-scheme:dark]"
          />
        </div>

        <div>
           <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Playlist ({episodes.length}/10)</label>
           <div className="relative mb-4">
             <input
               type="text"
               value={search}
               onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-charcoal-850 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50"
               placeholder="Search Series to add episodes..."
             />
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 relative items-start">
             {/* Left side: Series Results */}
             {search && seriesResults.length > 0 && (
               <div className="border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-charcoal-950 p-2 shadow-inner transition-all">
                 <h4 className="text-xs font-bold text-slate-400 uppercase px-2 mb-2 pt-2">Search Results</h4>
                 <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 pr-1">
                   {seriesResults.map(s => (
                     <button type="button" key={s._id} onClick={() => selectSeries(s)} className={`w-full text-left p-2 rounded-lg transition-colors ${selectedSeries?._id === s._id ? 'bg-teal-50 dark:bg-teal-900/30' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                       <p className={`text-sm font-medium truncate ${selectedSeries?._id === s._id ? 'text-teal-700 dark:text-teal-400' : 'text-slate-900 dark:text-slate-200'}`}>{s.title}</p>
                     </button>
                   ))}
                 </div>
               </div>
             )}

             {/* Right side: Seasons & Episodes */}
             {selectedSeries && (
               <div className="border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-charcoal-950 p-2 shadow-inner flex flex-col h-64 md:col-start-2 animate-fadeIn animate-duration-300">
                 <h4 className="text-xs font-bold text-slate-400 uppercase px-2 mb-2 pt-2 truncate">{selectedSeries.title}</h4>
                 <div className="overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-white/5 pr-1">
                    {seasons.map(seasonBlock => (
                      <div key={seasonBlock.season._id}>
                        <button type="button" onClick={() => setExpandedSeason(seasonBlock.season._id === expandedSeason ? null : seasonBlock.season._id)} className="w-full text-left px-2 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <span className="text-sm font-semibold text-slate-800 dark:text-slate-300">Season {seasonBlock.season.number}</span>
                          <span className="text-teal-600 dark:text-teal-500 text-xs font-bold">{expandedSeason === seasonBlock.season._id ? '-' : '+'}</span>
                        </button>
                        {expandedSeason === seasonBlock.season._id && (
                          <div className="bg-slate-50/50 dark:bg-black/20 pb-2 border-y border-slate-100 dark:border-white/5 animate-fadeIn">
                             {seasonBlock.episodes.map(ep => (
                               <div key={ep._id} className="flex items-center justify-between py-1.5 px-3 hover:bg-slate-100 dark:hover:bg-white/5 group">
                                 <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate pr-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">Ep {ep.number}: {ep.title}</span>
                                 <button type="button" onClick={() => addEpisode({...ep, seriesTitle: selectedSeries.title})} className="text-[10px] font-bold uppercase shrink-0 px-2 py-0.5 rounded bg-teal-100 text-teal-700 hover:bg-teal-600 hover:text-white dark:bg-teal-900/40 dark:text-teal-400 dark:hover:bg-teal-500 dark:hover:text-white transition-all transform active:scale-95 shadow-sm">Add</button>
                               </div>
                             ))}
                             {seasonBlock.episodes.length === 0 && <p className="text-xs text-slate-400 italic px-3 py-1">No episodes uploaded yet.</p>}
                          </div>
                        )}
                      </div>
                    ))}
                    {seasons.length === 0 && <p className="text-sm text-slate-500 italic p-4 text-center">No seasons found.</p>}
                 </div>
               </div>
             )}
           </div>

           <ul className="space-y-2">
             {episodes.map((ep, i) => (
               <li key={ep._id} className="flex justify-between items-center p-3 rounded-xl bg-teal-50 border border-teal-100 dark:bg-teal-900/20 dark:border-teal-500/20">
                 <span className="text-sm text-teal-900 dark:text-teal-100 flex items-center gap-3">
                   <div className="w-6 h-6 rounded-full bg-teal-200 dark:bg-teal-800 flex items-center justify-center text-xs font-bold shrink-0">{i+1}</div>
                   {ep.seriesTitle} - {ep.title}
                 </span>
                 <button type="button" onClick={() => removeEpisode(ep._id)} className="text-rose-500 hover:text-rose-700 p-1">✕</button>
               </li>
             ))}
             {episodes.length === 0 && <p className="text-sm text-slate-500 italic p-4 text-center rounded-xl border border-dashed border-slate-300 dark:border-white/10">No episodes added yet.</p>}
           </ul>
        </div>

        <button disabled={loading} type="submit" className="w-full py-4 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50">
          {loading ? 'Creating...' : 'Create Room'}
        </button>
      </form>
    </div>
  );
}
