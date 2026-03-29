/** Shared admin form styles */
export const inputClass =
  'w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:bg-charcoal-900 dark:border-white/10 dark:text-slate-100';

export function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}

export function Flash({ msg }) {
  if (!msg?.text) return null;
  const ok = msg.type === 'ok';
  return (
    <div
      className={`mb-6 px-4 py-3 rounded-xl text-sm border ${
        ok
          ? 'bg-teal-50 text-teal-900 border-teal-200 dark:bg-teal-900/20 dark:text-teal-200 dark:border-teal-800'
          : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-200 dark:border-red-800'
      }`}
    >
      {msg.text}
    </div>
  );
}

export function Panel({ title, subtitle, children, className = '' }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-charcoal-850/50 dark:shadow-none ${className}`}
    >
      {title && (
        <div className="mb-6 pb-4 border-b border-slate-100 dark:border-white/5">
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  );
}
