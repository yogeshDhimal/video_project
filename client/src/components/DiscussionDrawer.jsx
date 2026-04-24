import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function DiscussionDrawer({ 
  isOpen, 
  onClose, 
  title = "Discussion",
  tabs = [],
  activeTab: externalActiveTab,
  onTabChange
}) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id);
  const mounted = useRef(false);

  useEffect(() => {
    if (externalActiveTab) setActiveTab(externalActiveTab);
  }, [externalActiveTab]);

  useEffect(() => {
    mounted.current = true;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen && !mounted.current) return null;

  return createPortal(
    <div 
      className={`fixed inset-0 z-[100] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div 
        className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full sm:w-[800px] max-w-full bg-white dark:bg-charcoal-950 shadow-[0_-20px_80px_-15px_rgba(0,0,0,0.3)] dark:shadow-[0_-20px_80px_-15px_rgba(0,0,0,0.6)] rounded-t-[2.5rem] transition-transform duration-500 ease-out flex flex-col z-[101] ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ height: '90vh' }}
      >
        {/* Drag Handle for mobile feel */}
        <div className="w-16 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full mx-auto mt-4 mb-1 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5">
          <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
            {title}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Tabs Navigation (if multiple) */}
        {tabs.length > 1 && (
          <div className="flex px-6 border-b border-slate-100 dark:border-white/5">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  onTabChange?.(tab.id);
                }}
                className={`flex-1 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${
                  activeTab === tab.id 
                    ? 'border-teal-600 text-teal-700 dark:border-teal-400 dark:text-white' 
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {tabs.find(t => t.id === activeTab)?.content || tabs[0]?.content}
        </div>
      </div>
    </div>,
    document.body
  );
}
