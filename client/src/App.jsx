import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Browse from './pages/Browse';
import SearchPage from './pages/SearchPage';
import Watch from './pages/Watch';
import SeriesDetail from './pages/SeriesDetail';
import Profile from './pages/Profile';
import AdminLayout from './admin/AdminLayout';
import AdminDashboard from './admin/AdminDashboard';
import AdminUsers from './admin/AdminUsers';
import AdminMedia from './admin/AdminMedia';
import AdminSeriesIndex from './admin/AdminSeriesIndex';
import AdminSeriesNew from './admin/AdminSeriesNew';
import AdminSeriesDrafts from './admin/AdminSeriesDrafts';
import AdminSeasonNew from './admin/AdminSeasonNew';
import AdminEpisodeNew from './admin/AdminEpisodeNew';
import AdminGuide from './admin/AdminGuide';
import Spinner from './components/Spinner';

function PrivateRoute({ children, admin }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-charcoal-950">
        <Spinner label="Loading session…" />
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/series/:id" element={<SeriesDetail />} />
        <Route path="/watch/:episodeId" element={<Watch />} />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <PrivateRoute admin>
              <AdminLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="media" element={<AdminMedia />} />
          <Route path="series" element={<AdminSeriesIndex />} />
          <Route path="series/drafts" element={<AdminSeriesDrafts />} />
          <Route path="series/new" element={<AdminSeriesNew />} />
          <Route path="guide" element={<AdminGuide />} />
          <Route path="seasons" element={<AdminSeasonNew />} />
          <Route path="episodes" element={<AdminEpisodeNew />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
