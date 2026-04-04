import { Link } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

/**
 * Centered auth layout: top bar (brand + theme) + vertically & horizontally centered children.
 */
export default function AuthPageShell({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-charcoal-950 dark:text-slate-100 transition-colors duration-200">
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16 pt-2 sm:pb-20 w-full max-w-md mx-auto sm:px-6">
        {children}
      </div>
    </div>
  );
}
