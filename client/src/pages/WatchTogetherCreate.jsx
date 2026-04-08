import { useState, useEffect, useRef } from 'react';
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
  const [showSeriesList, setShowSeriesList] = useState(false);
  const [seasons, setSeasons] = useState([]); 
  const [expandedSeason, setExpandedSeason] = useState(null);
  const [episodes, setEpisodes] = useState([]); // { _id, title, seriesTitle }
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState('public');
  const [pin, setPin] = useState(['', '', '', '']);
  const pinRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!search.trim()) {
        if (showSeriesList) {
          try {
            const { data } = await api.get('/series', { params: { limit: 50, sort: 'popular' } });
            setSeriesResults(data.items || []);
          } catch(e) {}
        } else {
          setSeriesResults([]);
        }
        return;
      }
      try {
        const { data } = await api.get('/search', { params: { q: search } });
        setSeriesResults(data.series || []);
        setShowSeriesList(true);
      } catch (e) { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, showSeriesList]);

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

  const handlePinChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    if (value && index < 3) pinRefs[index + 1].current?.focus();
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (episodes.length === 0) return alert('Add at least one episode');
    
    const pinStr = pin.join('');
    if (visibility === 'private' && pinStr.length !== 4) {
      return alert('Please enter a 4-digit PIN for your private room');
    }

    try {
      setLoading(true);
      const payload = {
        title,
        episodes: episodes.map(e => e._id),
        visibility,
      };
      if (scheduledStartTime) payload.scheduledStartTime = new Date(scheduledStartTime).toISOString();
      if (visibility === 'private') payload.pin = pinStr;
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

        {/* Room Privacy */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Room Privacy</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setVisibility('public')}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                visibility === 'public'
                  ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-500'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-white/10 dark:text-slate-400 dark:hover:border-white/20'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              Public
            </button>
            <button
              type="button"
              onClick={() => { setVisibility('private'); setTimeout(() => pinRefs[0].current?.focus(), 100); }}
              className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl border-2 font-semibold text-sm transition-all ${
                visibility === 'private'
                  ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-500'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-white/10 dark:text-slate-400 dark:hover:border-white/20'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Private
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {visibility === 'public' 
              ? 'Anyone browsing can see and join your room freely.' 
              : 'Only people with the 4-digit PIN can enter.'}
          </p>

          {/* PIN Input */}
          {visibility === 'private' && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 animate-fadeIn">
              <label className="block text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-3">Set Room PIN</label>
              <div className="flex justify-center gap-3">
                {pin.map((digit, i) => (
                  <input
                    key={i}
                    ref={pinRefs[i]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(i, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(i, e)}
                    className={`w-14 h-16 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-all 
                      ${digit 
                        ? 'border-amber-500 bg-white text-amber-700 dark:bg-charcoal-850 dark:text-amber-400' 
                        : 'border-slate-200 bg-white text-slate-900 dark:bg-charcoal-850 dark:border-white/10 dark:text-white'
                      }
                      focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20
                    `}
                  />
                ))}
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400/80 mt-2 text-center">Share this PIN with your friends so they can join.</p>
            </div>
          )}
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
               onClick={() => setShowSeriesList(true)}
               onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-charcoal-850 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50"
               placeholder="Search Series to add episodes..."
             />
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 relative items-start">
             {/* Left side: Series Results */}
             {showSeriesList && seriesResults.length > 0 && (
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
          {loading ? 'Creating...' : visibility === 'private' ? '🔒 Create Private Room' : 'Create Room'}
        </button>
      </form>
    </div>
  );
}
