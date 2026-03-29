import { Link } from 'react-router-dom';

export default function EmptyState({
  title,
  description,
  icon = '📺',
  actionLabel,
  actionTo,
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-6 py-12 sm:py-14 text-center relative overflow-hidden dark:border-white/10 dark:bg-charcoal-850/40">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(20,184,166,0.08)_0%,_transparent_65%)] dark:bg-[radial-gradient(ellipse_at_center,_rgba(20,184,166,0.06)_0%,_transparent_65%)] pointer-events-none" />
      <div className="relative">
        <span className="text-4xl sm:text-5xl block mb-4 drop-shadow-lg" aria-hidden>
          {icon}
        </span>
        <h3 className="font-display text-lg font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-md mx-auto leading-relaxed">{description}</p>
        {actionLabel && actionTo ? (
          <Link
            to={actionTo}
            className="inline-flex mt-6 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium shadow-md dark:shadow-glow transition-transform hover:scale-[1.02]"
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
