export default function Spinner({ className = '', label }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      <div
        className="h-10 w-10 rounded-full border-2 border-slate-200 border-t-teal-600 dark:border-white/10 dark:border-t-teal-400 animate-spin"
        role="status"
        aria-label={label || 'Loading'}
      />
      {label && <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>}
    </div>
  );
}
