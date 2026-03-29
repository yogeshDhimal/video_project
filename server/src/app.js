require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { apiLimiter } = require('./middleware/rateLimiters');
const { ensureDirs } = require('./config/multer');

ensureDirs();

const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const seriesRoutes = require('./routes/series');
const seasonsRoutes = require('./routes/seasons');
const episodesRoutes = require('./routes/episodes');
const streamRoutes = require('./routes/stream');
const searchRoutes = require('./routes/search');
const recommendationsRoutes = require('./routes/recommendations');
const trendingRoutes = require('./routes/trending');
const commentsRoutes = require('./routes/comments');
const { router: likesRoutes } = require('./routes/likes');
const bookmarksRoutes = require('./routes/bookmarks');
const watchHistoryRoutes = require('./routes/watchHistory');
const notificationsRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');
const adminRoutes = require('./routes/admin');
const shareRoutes = require('./routes/share');
const uploadsRoutes = require('./routes/uploads');
const assetsRoutes = require('./routes/assets');

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use('/api', apiLimiter);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/seasons', seasonsRoutes);
app.use('/api/episodes', episodesRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api', trendingRoutes);
app.use('/api/episodes/:episodeId/comments', commentsRoutes);
app.use('/api/episodes/:episodeId/likes', likesRoutes);
app.use('/api/bookmarks', bookmarksRoutes);
app.use('/api/watch-history', watchHistoryRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/assets', assetsRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

module.exports = app;
