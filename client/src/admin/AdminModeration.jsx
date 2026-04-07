import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../api/client';
import Spinner from '../components/Spinner';
import ConfirmModal from '../components/ConfirmModal';

const getAvatarUrl = (user) => {
  if (!user || !user.avatar) return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.username || 'User'}`;
  if (user.avatar.startsWith('http')) return user.avatar;
  return `/api/assets/avatar/${user._id}`;
};

export default function AdminModeration() {
  const [comments, setComments] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('comments'); // 'comments' or 'chat'

  // Modal State
  const [modal, setModal] = useState({ 
    isOpen: false, 
    type: null, // 'delete' | 'ban'
    id: null, 
    targetType: null, // 'comment' | 'chat'
    userId: null,
    username: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    try {
      const { data } = await api.get('/admin/moderation/flags');
      setComments(data.comments || []);
      setChatMessages(data.chatMessages || []);
    } catch (err) {
      toast.error('Failed to fetch flags');
    } finally {
      setLoading(false);
    }
  };

  const clearFlag = async (id, type) => {
    try {
      const endpoint = type === 'comment' 
        ? `/admin/moderation/comments/${id}/clear-flags`
        : `/admin/moderation/chat/${id}/clear-flags`;
      
      await api.post(endpoint);
      
      if (type === 'comment') {
        setComments(prev => prev.filter(f => f._id !== id));
      } else {
        setChatMessages(prev => prev.filter(f => f._id !== id));
      }
      toast.success('Flags cleared. Content approved.');
    } catch (err) {
      toast.error('Failed to clear flags');
    }
  };

  const openDeleteModal = (id, type) => {
    setModal({
      isOpen: true,
      type: 'delete',
      id,
      targetType: type,
      username: ''
    });
  };

  const openBanModal = (userId, username) => {
    setModal({
      isOpen: true,
      type: 'ban',
      userId,
      username
    });
  };

  const handleConfirmAction = async () => {
    setIsProcessing(true);
    try {
      if (modal.type === 'delete') {
        const { id, targetType } = modal;
        const endpoint = targetType === 'comment'
          ? `/admin/moderation/comments/${id}`
          : `/admin/moderation/chat/${id}`;
          
        await api.delete(endpoint);
        
        if (targetType === 'comment') {
          setComments(prev => prev.filter(f => f._id !== id));
        } else {
          setChatMessages(prev => prev.filter(f => f._id !== id));
        }
        toast.success(`${targetType === 'comment' ? 'Comment' : 'Message'} deleted.`);
      } else if (modal.type === 'ban') {
        await api.patch(`/admin/users/${modal.userId}/ban`);
        toast.success(`User ${modal.username} has been banned.`);
        // Note: We don't necessarily remove other flags from this user unless we refresh
      }
    } catch (err) {
      toast.error(`Action failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setIsProcessing(false);
      setModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  if (loading) return <div className="py-20 flex justify-center"><Spinner label="Fetching flags..." /></div>;

  const currentList = activeTab === 'comments' ? comments : chatMessages;

  return (
    <div className="space-y-10 pb-10">
      <header className="text-center">
        <h1 className="text-3xl font-display font-bold text-slate-900 dark:text-white">Moderation Queue</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Manage reported comments and chat messages across the platform.</p>
      </header>

      {/* Tabs */}
      <div className="flex justify-center gap-2 bg-slate-100 dark:bg-white/5 p-1 rounded-2xl max-w-sm mx-auto shadow-inner">
        <button
          onClick={() => setActiveTab('comments')}
          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'comments' 
              ? 'bg-white dark:bg-charcoal-800 text-teal-600 dark:text-teal-400 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Comments ({comments.length})
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'chat' 
              ? 'bg-white dark:bg-charcoal-800 text-teal-600 dark:text-teal-400 shadow-sm' 
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          Live Chat ({chatMessages.length})
        </button>
      </div>

      {currentList.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-charcoal-850 rounded-3xl border border-dashed border-slate-300 dark:border-white/10 shadow-sm">
          <div className="text-4xl mb-4">✨</div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            No flagged {activeTab === 'comments' ? 'comments' : 'chat messages'} found.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {currentList.map((f) => (
            <div key={f._id} className="bg-white dark:bg-charcoal-850 p-6 rounded-3xl border border-slate-200/60 dark:border-white/5 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-3">
                      <img 
                        src={getAvatarUrl(f.userId)} 
                        alt="User" 
                        className="w-12 h-12 rounded-full border-2 border-slate-100 dark:border-white/10 object-cover" 
                      />
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {f.userId?.username || 'Unknown User'}
                          {f.userId?.role === 'admin' && <span className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full uppercase">Admin</span>}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {f.episodeId 
                            ? (
                              <Link 
                                to={`/watch/${f.episodeId._id}${activeTab === 'comments' ? `?commentId=${f._id}` : ''}`}
                                className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                              >
                                <span className="font-bold text-slate-700 dark:text-slate-300">
                                  {f.episodeId.seasonId?.seriesId?.title || 'Series'}
                                </span>
                                {' › '} Season {f.episodeId.seasonId?.number || '?'} › "{f.episodeId.title}"
                              </Link>
                            )
                            : f.watchRoomId 
                              ? (
                                <Link to={`/watch-together/${f.watchRoomId._id}`} className="hover:text-teal-600 transition-colors">
                                  In Watch Room <span className="font-bold text-teal-600 dark:text-teal-400">"{f.watchRoomId.title}"</span>
                                </Link>
                              )
                              : 'Location unknown'
                          }
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                         onClick={() => clearFlag(f._id, activeTab === 'comments' ? 'comment' : 'chat')}
                         className="p-2.5 bg-teal-50 text-teal-600 hover:bg-teal-600 hover:text-white dark:bg-teal-500/10 dark:text-teal-400 dark:hover:bg-teal-500 dark:hover:text-white rounded-xl transition-all"
                         title="Approve & Clear Flag"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                      
                      <button 
                         onClick={() => openDeleteModal(f._id, activeTab === 'comments' ? 'comment' : 'chat')}
                         className="p-2.5 bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-600 dark:hover:text-white rounded-xl transition-all"
                         title="Delete Content"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                      </button>

                      <button 
                         onClick={() => openBanModal(f.userId?._id, f.userId?.username)}
                         className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm text-[10px] font-black uppercase tracking-widest rounded-xl hover:opacity-80 transition-all"
                         title="Ban User"
                      >
                         Ban User
                      </button>
                    </div>
                  </header>
                  
                  <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-2xl relative">
                    <div className="absolute top-0 left-6 -translate-y-1/2 w-4 h-4 bg-slate-50 dark:bg-charcoal-850/20 rotate-45 border-l border-t border-slate-200/60 dark:border-white/5" />
                    <p className="text-slate-700 dark:text-slate-200 leading-relaxed font-body">
                      {activeTab === 'comments' ? f.body : f.body || f.message}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={modal.isOpen}
        title={modal.type === 'delete' ? `Delete ${modal.targetType === 'comment' ? 'Comment' : 'Message'}` : 'Ban User'}
        description={
          modal.type === 'delete' 
            ? `Are you sure you want to delete this ${modal.targetType}? This action cannot be undone.`
            : `Are you sure you want to permanently ban ${modal.username}? They will no longer be able to interact with the platform.`
        }
        confirmLabel={modal.type === 'delete' ? 'Delete' : 'Confirm Ban'}
        cancelLabel="Discard"
        isDestructive={true}
        isLoading={isProcessing}
        onConfirm={handleConfirmAction}
        onCancel={() => setModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
