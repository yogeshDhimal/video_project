export function CardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white/80 border border-slate-200/80 animate-pulse dark:bg-charcoal-850/40 dark:border-white/[0.06]">
      <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 dark:from-white/5 dark:to-white/[0.02]" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-slate-200 dark:bg-white/10 rounded-lg w-3/4" />
        <div className="h-3 bg-slate-100 dark:bg-white/5 rounded-lg w-1/2" />
      </div>
    </div>
  );
}

export function RowSkeleton({ n = 6 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: n }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
