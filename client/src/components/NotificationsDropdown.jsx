import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function NotificationsDropdown() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const hasUnread = notifications.some((n) => !n.read);
  const ref = useRef(null);

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get('/notifications');
        setNotifications(data.items || []);
      } catch (err) { 
        // silently fail on polling
      }
    };
    
    // Initial fetch
    fetchNotifications();
    
    // Polling every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRead = async (id, link) => {
    setOpen(false);
    
    // Optimistic UI updates
    const prev = [...notifications];
    setNotifications((prevNotes) => 
      prevNotes.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
    
    try {
      await api.post(`/notifications/${id}/read`);
    } catch {
      setNotifications(prev);
    }
    
    if (link) navigate(link);
  };

  const markAllRead = async () => {
    const prev = [...notifications];
    setNotifications((prevNotes) => prevNotes.map((n) => ({ ...n, read: true })));
    try {
      await api.post(`/notifications/read-all`);
    } catch {
      setNotifications(prev);
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.06] transition-colors"
        aria-label="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill={hasUnread ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={hasUnread ? "text-teal-600 dark:text-teal-400" : ""}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_0_2px_#ffffff] dark:shadow-[0_0_0_2px_#09090b] animate-pulse"></span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden z-50 dark:bg-charcoal-900 dark:border-white/10 dark:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/5 shrink-0 bg-slate-50/50 dark:bg-black/20">
            <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
            {hasUnread && (
              <button 
                onClick={markAllRead}
                className="text-xs text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300 font-medium px-2 py-1 rounded-md hover:bg-teal-50 dark:hover:bg-teal-900/40 transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-black/20">
                <p className="text-sm text-slate-500 dark:text-slate-400">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {notifications.map((n) => (
                  <div 
                    key={n._id} 
                    onClick={() => handleRead(n._id, n.link)}
                    className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors flex gap-3 ${!n.read ? 'bg-teal-50/50 dark:bg-teal-500/10' : ''}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {!n.read ? (
                         <div className="w-2.5 h-2.5 mt-1 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.6)]"></div>
                      ) : (
                         <div className="w-2 h-2 mt-1.5 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm ${!n.read ? 'text-slate-900 font-semibold dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                        {n.title || 'System Alert'}
                      </p>
                      <p className={`text-sm mt-1 line-clamp-2 ${!n.read ? 'text-slate-600 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                        {n.message}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium tracking-wider uppercase">
                        {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
