import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col relative bg-slate-50 text-slate-900 dark:bg-charcoal-950 dark:text-slate-100 transition-colors duration-200">
      {/* Light mode background */}
      <div
        className="fixed inset-0 -z-10 dark:hidden pointer-events-none bg-gradient-to-b from-white via-slate-50 to-cyan-50/40"
        aria-hidden
      />
      <div
        className="fixed inset-0 -z-10 dark:hidden opacity-[0.45] pointer-events-none bg-[length:24px_24px] bg-[linear-gradient(rgba(15,118,110,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(15,118,110,0.06)_1px,transparent_1px)]"
        aria-hidden
      />
      {/* Dark mode background */}
      <div
        className="hidden dark:block fixed inset-0 -z-10 pointer-events-none"
        aria-hidden
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 50% -30%, rgba(20, 184, 166, 0.14), transparent 50%),
            radial-gradient(ellipse 70% 50% at 100% 20%, rgba(34, 211, 238, 0.08), transparent 45%),
            radial-gradient(ellipse 50% 40% at 0% 60%, rgba(20, 184, 166, 0.05), transparent 40%),
            linear-gradient(180deg, #0c0f14 0%, #12161c 40%, #0c0f14 100%)
          `,
        }}
      />
      <div className="hidden dark:block fixed inset-0 -z-10 opacity-[0.03] pointer-events-none bg-[length:24px_24px] bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)]" aria-hidden />
      <Navbar />
      <main className="flex-1 relative">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
