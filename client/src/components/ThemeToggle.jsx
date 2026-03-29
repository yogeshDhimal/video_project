import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center w-10 h-10 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/40 ${className}
        border-slate-200 bg-white/90 text-amber-500 hover:bg-slate-50 shadow-sm
        dark:border-white/10 dark:bg-white/[0.06] dark:text-amber-300 dark:hover:bg-white/10 dark:shadow-none`}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <span className="text-lg leading-none" aria-hidden>
          ☀️
        </span>
      ) : (
        <span className="text-lg leading-none" aria-hidden>
          🌙
        </span>
      )}
    </button>
  );
}
