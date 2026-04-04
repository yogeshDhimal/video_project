#!/usr/bin/env node
/**
 * StreamVault Master Seed Script (Expanded for Project Defense)
 * ──────────────────────────────
 * Creates 15 series across varied genres, each with 1 season and 2-3 episodes.
 * Generates robust User-to-User similarity sets to mathematically demonstrate:
 * - Pearson Correlation Rating Predictions
 * - Matrix Factorization (SVD) Latent Feature Generation
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const User = require('../src/models/User');
const Series = require('../src/models/Series');
const Season = require('../src/models/Season');
const Episode = require('../src/models/Episode');
const Like = require('../src/models/Like');
const Comment = require('../src/models/Comment');
const WatchHistory = require('../src/models/WatchHistory');
const Notification = require('../src/models/Notification');
const Bookmark = require('../src/models/Bookmark');

const { VIDEOS, THUMBNAILS } = require('../src/config/paths');

// ───────────────────── Helpers ─────────────────────
function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) { console.log(`  ✓ Already exists: ${path.basename(dest)}`); return resolve(); }
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    console.log(`  ↓ Downloading ${path.basename(dest)}...`);
    const request = (u) => {
      proto.get(u, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          return request(res.headers.location);
        }
        if (res.statusCode !== 200) { file.close(); if (fs.existsSync(dest)) fs.unlinkSync(dest); return reject(new Error(`HTTP ${res.statusCode}`)); }
        res.pipe(file);
        file.on('finish', () => { file.close(resolve); });
      }).on('error', (e) => { file.close(); if (fs.existsSync(dest)) fs.unlinkSync(dest); reject(e); });
    };
    request(url);
  });
}

async function ensureVideo(name, url, videosDir) {
  const dest = path.join(videosDir, name);
  if (fs.existsSync(dest)) { return; }
  const existing = fs.readdirSync(videosDir).filter(f => f.endsWith('.mp4') && fs.statSync(path.join(videosDir, f)).size > 100000);
  if (existing.length > 0) {
    fs.copyFileSync(path.join(videosDir, existing[0]), dest);
  } else {
    console.log(`  ❌ No local fallback video found.`);
  }
}

function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }

const VIDEOS_LIST = [
  { name: 'nature_forest.mp4' }, { name: 'city_timelapse.mp4' },
  { name: 'ocean_waves.mp4' }, { name: 'space_nebula.mp4' },
  { name: 'cooking_food.mp4' }, { name: 'workout_gym.mp4' },
];

function posterUrl(seed) { return `https://picsum.photos/seed/${seed}/400/600`; }
function thumbUrl(seed)  { return `https://picsum.photos/seed/${seed}/1280/720`; }

// ───────────────── 15 Series Definitions ──────────────────
const SERIES_DEFS = [
  {
    title: 'Whispers of the Wild', genres: ['Nature', 'Documentary'], releaseYear: 2024, status: 'completed', posterSeed: 'wild-poster',
    seedStats: { views: 5200, likes: 380, recentViews: 900, comments: 45, daysOld: 3 }, eps: ['Ancient Canopy', 'River Secrets']
  },
  {
    title: 'Neon Horizons', genres: ['Sci-Fi', 'Drama'], releaseYear: 2025, status: 'ongoing', posterSeed: 'neon-poster',
    seedStats: { views: 3100, likes: 210, recentViews: 700, comments: 30, daysOld: 7 }, eps: ['Arrival', 'The Grid']
  },
  {
    title: 'Tides of Change', genres: ['Adventure', 'Nature'], releaseYear: 2024, status: 'completed', posterSeed: 'tides-poster',
    seedStats: { views: 800, likes: 150, recentViews: 200, comments: 80, daysOld: 14 }, eps: ['Deep Blue', 'Storm']
  },
  {
    title: 'Beyond the Stars', genres: ['Sci-Fi', 'Adventure'], releaseYear: 2025, status: 'ongoing', posterSeed: 'stars-poster',
    seedStats: { views: 1500, likes: 130, recentViews: 1400, comments: 20, daysOld: 1 }, eps: ['Launch', 'Drift']
  },
  {
    title: 'The Flavor Lab', genres: ['Comedy', 'Drama'], releaseYear: 2024, status: 'completed', posterSeed: 'flavor-poster',
    seedStats: { views: 8000, likes: 500, recentViews: 100, comments: 60, daysOld: 45 }, eps: ['First Course', 'Pressure']
  },
  {
    title: 'Ironclad', genres: ['Action', 'Documentary'], releaseYear: 2025, status: 'ongoing', posterSeed: 'iron-poster',
    seedStats: { views: 2200, likes: 170, recentViews: 400, comments: 25, daysOld: 10 }, eps: ['The Grind', 'Break Point']
  },
  {
    title: 'Cybernetica', genres: ['Sci-Fi', 'Action'], releaseYear: 2025, status: 'ongoing', posterSeed: 'cyber-poster',
    seedStats: { views: 9000, likes: 800, recentViews: 2000, comments: 100, daysOld: 5 }, eps: ['SysAdmin', 'Root Access']
  },
  {
    title: 'Shadows in the Mist', genres: ['Horror', 'Drama'], releaseYear: 2023, status: 'completed', posterSeed: 'horror-poster',
    seedStats: { views: 6000, likes: 200, recentViews: 50, comments: 40, daysOld: 120 }, eps: ['The House', 'The Attic']
  },
  {
    title: 'Midnight Tokyo', genres: ['Anime', 'Action'], releaseYear: 2026, status: 'ongoing', posterSeed: 'tokyo-poster',
    seedStats: { views: 12000, likes: 1500, recentViews: 5000, comments: 300, daysOld: 2 }, eps: ['Awakening', 'Shinobi']
  },
  {
    title: 'Stellar Drift', genres: ['Sci-Fi', 'Action'], releaseYear: 2024, status: 'completed', posterSeed: 'drift-poster',
    seedStats: { views: 4000, likes: 200, recentViews: 200, comments: 20, daysOld: 60 }, eps: ['Warp', 'Black hole']
  },
  {
    title: 'Into the Volcano', genres: ['Nature', 'Documentary'], releaseYear: 2024, status: 'completed', posterSeed: 'volcano-poster',
    seedStats: { views: 1000, likes: 50, recentViews: 10, comments: 5, daysOld: 200 }, eps: ['Heat', 'Eruption']
  },
  {
    title: 'The Laughing Track', genres: ['Comedy', 'Romance'], releaseYear: 2025, status: 'ongoing', posterSeed: 'laugh-poster',
    seedStats: { views: 7000, likes: 450, recentViews: 1500, comments: 90, daysOld: 15 }, eps: ['Pilot', 'The Date']
  },
  {
    title: 'Quantum Paradox', genres: ['Sci-Fi', 'Mystery'], releaseYear: 2025, status: 'completed', posterSeed: 'quantum-poster',
    seedStats: { views: 5500, likes: 380, recentViews: 800, comments: 55, daysOld: 25 }, eps: ['Schrodinger', 'Entanglement']
  },
  {
    title: 'Ocean Edge', genres: ['Adventure', 'Nature'], releaseYear: 2023, status: 'completed', posterSeed: 'ocean-poster',
    seedStats: { views: 3000, likes: 110, recentViews: 40, comments: 10, daysOld: 300 }, eps: ['Sharks', 'Whales']
  },
  {
    title: 'City of Gold', genres: ['Action', 'Adventure'], releaseYear: 2026, status: 'ongoing', posterSeed: 'gold-poster',
    seedStats: { views: 15000, likes: 2000, recentViews: 6000, comments: 400, daysOld: 1 }, eps: ['The Heist', 'Escape']
  }
];

// ───────────────── Main Seed Function ──────────────────
async function seed() {
  console.log('\n🌱 StreamVault Master Seeder\n' + '─'.repeat(40));

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/streamvault';
  await mongoose.connect(uri);
  console.log('✓ Connected to MongoDB');

  [VIDEOS, THUMBNAILS].forEach(d => fs.mkdirSync(d, { recursive: true }));

  console.log('📹 Ensuring video files...');
  for (const v of VIDEOS_LIST) await ensureVideo(v.name, null, VIDEOS);

  console.log('\n🧹 Clearing old collections...');
  await Series.deleteMany({}); await Season.deleteMany({}); await Episode.deleteMany({});
  await WatchHistory.deleteMany({}); await Like.deleteMany({}); await Comment.deleteMany({}); await Notification.deleteMany({});
  await User.deleteMany({ role: { $ne: 'admin' } });

  // Create Users: We need a complex web to form Pearson & SVD Latent Features
  console.log('\n👤 Setting up 4 Demo Users for CF Matrix...');
  const createUsr = async (e, p, u, g) => {
    let usr = await User.findOne({ email: e });
    if (!usr) usr = await User.create({ email: e, password: p, username: u, role: 'user', isVerified: true, preferredGenres: g });
    return usr;
  };
  const admin = await User.findOne({ role: 'admin' }) || await User.create({ email: 'admin@streamvault.dev', password: 'Admin1234!', username: 'Admin', role: 'admin', isVerified: true, preferredGenres: ['Sci-Fi'] });
  
  // Cluster A: Sci-Fi & Action fans
  const u1 = await createUsr('scifi_nerd@streamvault.dev', 'Viewer1234!', 'SciFiNerd', ['Sci-Fi', 'Action']);
  const u2 = await createUsr('action_hero@streamvault.dev', 'Viewer1234!', 'ActionHero', ['Action', 'Adventure']);
  
  // Cluster B: Nature & Documentary fans
  const u3 = await createUsr('nature_lover@streamvault.dev', 'Viewer1234!', 'NatureLover', ['Nature', 'Documentary']);
  const u4 = await createUsr('casual_watcher@streamvault.dev', 'Viewer1234!', 'CasualWatcher', ['Comedy', 'Drama', 'Documentary']);

  console.log('\n📺 Creating ' + SERIES_DEFS.length + ' series & episodes...');
  const allEpisodes = []; 

  for (let sIdx = 0; sIdx < SERIES_DEFS.length; sIdx++) {
    const def = SERIES_DEFS[sIdx];
    const posterFile = `poster_${def.posterSeed}.jpg`;
    await download(posterUrl(def.posterSeed), path.join(THUMBNAILS, posterFile));

    const series = await Series.create({
      title: def.title, description: 'Academic project placeholder text.', genres: def.genres,
      releaseYear: def.releaseYear, status: def.status, catalogStatus: 'published',
      posterPath: posterFile, createdBy: admin._id, totalViews: def.seedStats.views,
      totalLikes: def.seedStats.likes, createdAt: daysAgo(def.seedStats.daysOld),
    });

    const season = await Season.create({ seriesId: series._id, number: 1, title: 'Season 1' });

    for (let i = 0; i < def.eps.length; i++) {
        const videoIdx = sIdx % 6;
        const videoFile = VIDEOS_LIST[videoIdx].name;
        const thumbFile = `thumb_${def.posterSeed}_ep${i}.jpg`;
        await download(thumbUrl(def.posterSeed + i), path.join(THUMBNAILS, thumbFile));

        const ep = await Episode.create({
            seasonId: season._id, number: i + 1, title: def.eps[i],
            description: `Episode ${i + 1} dummy.`, durationSeconds: 200, thumbnailPath: thumbFile,
            qualities: [{ key: '720p', fileName: videoFile, mimeType: 'video/mp4', sizeBytes: 0 }],
            views: def.seedStats.views, likes: def.seedStats.likes, recentViews: def.seedStats.recentViews,
            engagementScore: def.seedStats.comments, trendingScore: def.seedStats.recentViews,
            createdAt: daysAgo(def.seedStats.daysOld),
        });
        allEpisodes.push({ ...ep.toObject(), seriesDef: def });
    }
  }

  // Seed Matrix Matrix overlaps for Pearson algorithms
  console.log('\n👍 Seeding overlapping history for CF... Matrix building...');
  for (const ep of allEpisodes) {
     const duration = 200;

     // User 1 (SciFiNerd): Likes Sci-Fi & Action
     if (ep.seriesDef.genres.includes('Sci-Fi') || ep.seriesDef.genres.includes('Action')) {
         await WatchHistory.create({ userId: u1._id, episodeId: ep._id, progressSeconds: duration, durationSeconds: duration, completed: true, lastWatchedAt: new Date() });
         if(Math.random() > 0.3) await Like.create({ userId: u1._id, episodeId: ep._id, value: 1 });
     }
     
     // User 2 (ActionHero): Overlaps with User 1 but also likes Adventure
     if (ep.seriesDef.genres.includes('Action') || ep.seriesDef.genres.includes('Adventure')) {
         await WatchHistory.create({ userId: u2._id, episodeId: ep._id, progressSeconds: duration, durationSeconds: duration, completed: true, lastWatchedAt: new Date() });
         if(Math.random() > 0.4) await Like.create({ userId: u2._id, episodeId: ep._id, value: 1 });
     }

     // User 3 (NatureLover): Likes Nature & Doc
     if (ep.seriesDef.genres.includes('Nature') || ep.seriesDef.genres.includes('Documentary')) {
         await WatchHistory.create({ userId: u3._id, episodeId: ep._id, progressSeconds: duration, durationSeconds: duration, completed: true, lastWatchedAt: new Date() });
         if(Math.random() > 0.2) await Like.create({ userId: u3._id, episodeId: ep._id, value: 1 });
     }

     // User 4 (CasualWatcher): Huge overlap with Nature but also Comedy
     if (ep.seriesDef.genres.includes('Comedy') || ep.seriesDef.genres.includes('Documentary')) {
         await WatchHistory.create({ userId: u4._id, episodeId: ep._id, progressSeconds: duration, durationSeconds: duration, completed: true, lastWatchedAt: new Date() });
         if(Math.random() > 0.3) await Like.create({ userId: u4._id, episodeId: ep._id, value: 1 });
     }
  }

  console.log('\n' + '─'.repeat(40));
  console.log('🎉 Defense Database Setup Complete!\n');
  console.log('Test SVD Algorithm By Logging In As:');
  console.log('  scifi_nerd@streamvault.dev / Viewer1234!');
  console.log('  -> Should heavily recommend Action/Sci-Fi via U-V Latent Vectors.');
  
  await mongoose.disconnect();
}

seed().catch((err) => { console.error('❌ failed:', err); process.exit(1); });
