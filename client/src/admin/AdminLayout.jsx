import { NavLink, Outlet, useLocation } from 'react-router-dom';

const navGroups = [
  {
    label: 'Overview',
    items: [{ to: '/admin', end: true, label: 'Dashboard', icon: '◆' }],
  },
  {
    label: 'Audience',
    items: [{ to: '/admin/users', end: false, label: 'Users', icon: '◎' }],
  },
  {
    label: 'Library',
    items: [
      { to: '/admin/series', end: true, label: 'Manage series', icon: '☰' },
      { to: '/admin/series/drafts', end: false, label: 'Drafts', icon: '✎' },
      { to: '/admin/series/new', end: false, label: 'New series', icon: '＋' },
      { to: '/admin/seasons', end: false, label: 'New season', icon: '▤' },
      { to: '/admin/episodes', end: false, label: 'New episode', icon: '▶' },
    ],
  },
  {
    label: 'Help',
    items: [{ to: '/admin/guide', end: false, label: 'Admin guide', icon: '?' }],
  },
];

function NavItem({ to, end, label, icon }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
          isActive
            ? 'bg-teal-600 text-white shadow-md shadow-teal-600/25 dark:shadow-teal-900/40'
            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white'
        }`
      }
    >
      <span className="w-5 text-center opacity-80 text-[0.85rem]" aria-hidden>
        {icon}
      </span>
      {label}
    </NavLink>
  );
}

export default function AdminLayout() {
  const { pathname } = useLocation();

  const title =
    pathname === '/admin' || pathname === '/admin/'
      ? 'Dashboard'
      : pathname.includes('/guide')
        ? 'Admin guide'
        : pathname.includes('/users')
          ? 'Users'
          : pathname.endsWith('/series/new')
            ? 'New series'
            : pathname.endsWith('/series/drafts')
              ? 'Drafts'
              : pathname.includes('/series')
                ? 'Manage Series'
                : pathname.includes('/seasons')
                  ? 'New season'
                  : pathname.includes('/episodes')
                    ? 'New episode'
                    : 'Admin';

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col lg:flex-row">
      {/* Mobile top nav */}
      <div className="lg:hidden border-b border-slate-200 dark:border-white/10 bg-white/90 dark:bg-charcoal-900/80 backdrop-blur px-2 py-2 overflow-x-auto flex gap-1 shrink-0">
        {navGroups.flatMap((g) => g.items).map((item) => (
          <NavLink
            key={item.to + (item.end ? '-e' : '')}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium ${
                isActive
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>

      {/* Desktop sidebar — Sticky implementation */}
      <aside className="hidden lg:flex w-72 shrink-0 flex-col border-r border-slate-200/90 bg-gradient-to-b from-slate-50 to-white dark:from-charcoal-950 dark:to-charcoal-900 dark:border-white/10 sticky top-[4.25rem] h-[calc(100vh-4.25rem)] overflow-y-auto custom-scrollbar">
        <div className="p-6 border-b border-slate-100 dark:border-white/5">
        </div>
        <nav className="flex-1 p-4 space-y-6">

          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavItem key={item.to + String(item.end)} {...item} />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100 dark:border-white/5 text-xs text-slate-500 dark:text-slate-500">
          ClickWatch control panel
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="shrink-0 px-4 sm:px-8 py-6 border-b border-slate-200/80 dark:border-white/5 bg-white/50 dark:bg-charcoal-950/30 backdrop-blur">
          <p className="text-xs font-medium text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-1">Admin</p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{title}</h2>
        </header>
        <div className="flex-1 px-4 sm:px-8 py-8 max-w-5xl w-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
