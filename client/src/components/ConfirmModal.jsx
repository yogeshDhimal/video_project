import React from 'react';

/**
 * A reusable confirmation dialog with a modern, high-density design.
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {string} title - The heading of the modal
 * @param {string} description - The body text
 * @param {string} confirmLabel - Label for the action button
 * @param {string} cancelLabel - Label for the cancel button
 * @param {function} onConfirm - Callback for action
 * @param {function} onCancel - Callback for closing/cancelling
 * @param {boolean} isDestructive - If true, uses a rose/red theme for the action
 * @param {boolean} isLoading - Shows a spinner on the confirm button
 */
export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = false,
  isLoading = false
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-sm bg-white dark:bg-charcoal-850 rounded-3xl shadow-2xl border border-slate-200/60 dark:border-white/5 overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-6 sm:p-8">
          <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-2">
            {title}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            {description}
          </p>
        </div>

        <div className="bg-slate-50/50 dark:bg-white/5 p-4 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/10 rounded-xl transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 ${
              isDestructive 
                ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20' 
                : 'bg-teal-600 hover:bg-teal-500 shadow-teal-500/20'
            }`}
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
