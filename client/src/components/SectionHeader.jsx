export default function SectionHeader({ title, subtitle, className = '' }) {
  return (
    <div className={`mb-6 ${className}`.trim()}>
      <div className="flex items-center gap-3">
        <span
          className="h-8 w-1 rounded-full bg-gradient-to-b from-teal-500 to-cyan-500 shrink-0 shadow-sm dark:from-teal-400 dark:to-ice-500 dark:shadow-[0_0_12px_rgba(45,212,191,0.4)]"
          aria-hidden
        />
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-sm text-slate-600 dark:text-slate-500 mt-0.5">{subtitle}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
