import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import PinEntryModal from '../components/PinEntryModal';
import ConfirmModal from '../components/ConfirmModal';
import { toast } from 'sonner';

function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) return 'live now';
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      return `${hours}h ${mins}m ${secs}s`;
    };
    setTimeLeft(calc());
    const int = setInterval(() => setTimeLeft(calc()), 1000);
    return () => clearInterval(int);
  }, [targetDate]);

  return <span className={`font-mono font-medium ${timeLeft === 'live now' ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`}>{timeLeft}</span>;
}

export default function WatchTogetherHub() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('live'); // live, upcoming, me
  const [rooms, setRooms] = useState({ active: [], scheduled: [] });
  const [myRooms, setMyRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  // PIN modal state
  const [pinModal, setPinModal] = useState({ isOpen: false, roomId: null });
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, roomId: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const fetchRooms = async () => {
      setLoading(true);
      try {
        if (tab === 'me' && user) {
          const { data } = await api.get('/watch-rooms/me');
          setMyRooms(data.rooms);
        } else {
          const { data } = await api.get('/watch-rooms');
          setRooms({ active: data.active, scheduled: data.scheduled });
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    fetchRooms();
  }, [tab, user]);

  const promptDeleteRoom = (id) => {
    setDeleteModal({ isOpen: true, roomId: id });
  };

  const confirmDeleteRoom = async () => {
    const id = deleteModal.roomId;
    if (!id) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/watch-rooms/${id}`);
      setMyRooms(myRooms.filter(r => r._id !== id));
      toast.success('Room deleted successfully');
      setDeleteModal({ isOpen: false, roomId: null });
    } catch (e) {
      toast.error('Error deleting room');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleJoinRoom = (room) => {
    if (room.visibility === 'private') {
      // Check if user is the host — hosts bypass PIN
      const isHost = user && (room.hostId?._id === user._id || room.hostId === user._id);
      if (isHost) {
        navigate(`/watch-together/${room._id}`);
        return;
      }
      if (!user) {
        toast.error('Please log in to join private rooms.');
        return;
      }
      setPinError('');
      setPinModal({ isOpen: true, roomId: room._id });
    } else {
      navigate(`/watch-together/${room._id}`);
    }
  };

  const handlePinSubmit = async (pin) => {
    setPinLoading(true);
    setPinError('');
    try {
      const { data } = await api.post(`/watch-rooms/${pinModal.roomId}/join`, { pin });
      if (data.authorized) {
        // Store auth in sessionStorage so page refresh doesn't re-prompt
        sessionStorage.setItem(`wr_auth_${pinModal.roomId}`, 'true');
        setPinModal({ isOpen: false, roomId: null });
        navigate(`/watch-together/${pinModal.roomId}`);
      }
    } catch (err) {
      setPinError(err.response?.data?.message || 'Incorrect PIN');
    } finally {
      setPinLoading(false);
    }
  };

  return (
    <div className="w-full px-8 sm:px-12 md:px-16 lg:px-20 py-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
             <span className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-600 flex items-center justify-center">📺</span>
             Watch Together
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2 max-w-2xl">
            Join live watch parties hosted by the community, or create your own scheduled screening.
          </p>
        </div>
        {user && (
           <Link to="/watch-together/new" className="shrink-0 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-teal-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
             + Create Room
           </Link>
        )}
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-white/10 mb-8 overflow-x-auto">
        {['live', 'upcoming', 'me'].map(t => {
          if (t === 'me' && !user) return null;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-3 font-semibold text-sm border-b-2 transition-colors capitalize whitespace-nowrap ${
                tab === t 
                  ? 'border-teal-600 text-teal-700 dark:text-white dark:border-teal-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {t === 'live' ? 'Live Now' : t === 'upcoming' ? 'Scheduled' : 'My Rooms'}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Spinner label="Loading rooms..." /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tab === 'live' && rooms.active.length === 0 && <p className="text-slate-500 col-span-full">No active watch parties. Why not create one?</p>}
          {tab === 'upcoming' && rooms.scheduled.length === 0 && <p className="text-slate-500 col-span-full">No upcoming watch parties scheduled.</p>}
          {tab === 'me' && myRooms.length === 0 && <p className="text-slate-500 col-span-full">You haven't created any watch rooms yet.</p>}

          {(tab === 'live' ? rooms.active : tab === 'upcoming' ? rooms.scheduled : myRooms).map(room => (
            <div key={room._id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col group dark:bg-charcoal-900/50 dark:border-white/5 transition-all hover:border-teal-500/30 hover:shadow-md">
              <div className="p-5 flex-1 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center gap-2">
                     <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        room.status === 'active' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 
                        room.status === 'scheduled' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-600'
                     }`}>
                       {room.status}
                     </span>
                     {room.visibility === 'private' && (
                       <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300 flex items-center gap-1">
                         <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                         Private
                       </span>
                     )}
                     {room.status === 'scheduled' && <CountdownTimer targetDate={room.scheduledStartTime} />}
                   </div>
                   {tab === 'me' && (
                     <button onClick={() => promptDeleteRoom(room._id)} className="text-rose-500 hover:text-rose-700 text-xs font-semibold">
                       Delete
                     </button>
                   )}
                </div>
                <h3 className="font-semibold text-lg text-slate-900 dark:text-white leading-tight mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  {room.title}
                </h3>
                <p className="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
                   <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden text-center leading-5 shrink-0 align-middle">👤</span>
                   Hosted by <span className="font-semibold text-slate-700 dark:text-slate-300">{room.hostId?.username || 'Unknown'}</span>
                </p>
                
                <div className="bg-slate-50 dark:bg-black/20 rounded-xl p-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Playlist ({room.episodes.length})</p>
                  <ul className="text-sm space-y-1">
                    {room.episodes.slice(0, 3).map((ep, i) => (
                      <li key={ep._id} className="truncate text-slate-700 dark:text-slate-300">
                        <span className="text-slate-400 dark:text-slate-500 mr-2">{i+1}.</span> 
                        {ep.seasonId?.seriesId?.title || 'Unknown Series'} - {ep.title}
                      </li>
                    ))}
                    {room.episodes.length > 3 && <li className="text-slate-400 italic text-xs mt-1">+{room.episodes.length - 3} more</li>}
                  </ul>
                </div>
              </div>
              <button
                onClick={() => handleJoinRoom(room)}
                className="block w-full px-5 py-4 text-center text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 dark:bg-teal-900/20 dark:text-teal-400 dark:hover:bg-teal-900/40 transition-colors"
              >
                {room.visibility === 'private'
                  ? '🔒 Enter PIN to Join'
                  : room.status === 'active' ? 'Join Party' : 'Enter Waiting Room'
                }
              </button>
            </div>
          ))}
        </div>
      )}

      <PinEntryModal
        isOpen={pinModal.isOpen}
        onSubmit={handlePinSubmit}
        onCancel={() => setPinModal({ isOpen: false, roomId: null })}
        isLoading={pinLoading}
        error={pinError}
      />

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Watch Room"
        description="Are you sure you want to delete this watch room? This action cannot be undone."
        confirmLabel="Delete Room"
        isDestructive={true}
        isLoading={deleteLoading}
        onConfirm={confirmDeleteRoom}
        onCancel={() => setDeleteModal({ isOpen: false, roomId: null })}
      />
    </div>
  );
}
