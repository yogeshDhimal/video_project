import React, { Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages
import Home from './pages/Home';
import Browse from './pages/Browse';
import SearchPage from './pages/SearchPage';
import Watch from './pages/Watch';
import SeriesDetail from './pages/SeriesDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import WatchTogetherHub from './pages/WatchTogetherHub';
import WatchTogetherCreate from './pages/WatchTogetherCreate';
import WatchRoomPage from './pages/WatchRoomPage';
import NotFound from './pages/NotFound';

// Lazy load admin components to reduce initial bundle size
const AdminLayout = React.lazy(() => import('./admin/AdminLayout'));
const AdminDashboard = React.lazy(() => import('./admin/AdminDashboard'));
const AdminSeriesIndex = React.lazy(() => import('./admin/AdminSeriesIndex'));
const AdminSeriesNew = React.lazy(() => import('./admin/AdminSeriesNew'));
const AdminSeasonNew = React.lazy(() => import('./admin/AdminSeasonNew'));
const AdminEpisodeNew = React.lazy(() => import('./admin/AdminEpisodeNew'));
const AdminMedia = React.lazy(() => import('./admin/AdminMedia'));
const AdminUsers = React.lazy(() => import('./admin/AdminUsers'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;
  return children;
}

function AppContent() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-charcoal-950 transition-colors duration-300">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-charcoal-950"><div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div></div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/watch/:episodeId" element={<Watch />} />
            <Route path="/series/:id" element={<SeriesDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            
            {/* Watch Together Routes */}
            <Route path="/watch-together" element={<WatchTogetherHub />} />
            <Route path="/watch-together/new" element={<PrivateRoute><WatchTogetherCreate /></PrivateRoute>} />
            <Route path="/watch-together/:id" element={<WatchRoomPage />} />

            {/* Admin Routes (Lazy Loaded) */}
            <Route path="/admin" element={<PrivateRoute adminOnly><AdminLayout /></PrivateRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="series" element={<AdminSeriesIndex />} />
              <Route path="series/:id" element={<AdminSeriesNew />} />
              <Route path="season/:id" element={<AdminSeasonNew />} />
              <Route path="episode/:id" element={<AdminEpisodeNew />} />
              <Route path="uploads" element={<AdminMedia />} />
              <Route path="users" element={<AdminUsers />} />
            </Route>

            {/* 404 Route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <AppContent />
    </>
  );
}
