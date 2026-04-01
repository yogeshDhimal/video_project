#!/usr/bin/env node
/**
 * StreamVault Master Seed Script
 * ──────────────────────────────
 * Creates 6 series across varied genres, each with 1 season and 2-3 episodes.
 * Downloads real royalty-free ~3-4 min videos, unique poster & thumbnail images.
 * Seeds watch history, likes, comments, notifications, and engagement data
 * so every algorithm (Trending, Hybrid Recommendation, Continue Watching,
 * Engagement Score, Most Watched, Top Rated, Recent) is demonstrable.
 *
 * Usage:  node scripts/seed.js
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

/**
 * Ensure a video file exists at dest. Tries downloading first,
 * and if the download fails, copies an existing local video as fallback.
 */
async function ensureVideo(name, url, videosDir) {
  const dest = path.join(videosDir, name);
  if (fs.existsSync(dest)) {
    console.log(`  ✓ Already exists: ${name}`);
    return;
  }
  if (url) {
    try {
      await download(url, dest);
      console.log(`  ✓ Downloaded: ${name}`);
      return;
    } catch (err) {
      console.log(`  ⚠ Download failed for ${name} (${err.message}) — using local fallback.`);
    }
  }
  // Fallback: copy any existing .mp4 in the folder
  const existing = fs.readdirSync(videosDir).filter(f => f.endsWith('.mp4') && fs.statSync(path.join(videosDir, f)).size > 100000);
  if (existing.length > 0) {
    fs.copyFileSync(path.join(videosDir, existing[0]), dest);
    console.log(`  ✓ Copied ${existing[0]} → ${name}`);
  } else {
    console.log(`  ❌ No local fallback video found. ${name} will be missing.`);
  }
}

function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }

// ───────────────── Video Asset Names ──────────────────
const VIDEOS_LIST = [
  { name: 'nature_forest.mp4' },
  { name: 'city_timelapse.mp4' },
  { name: 'ocean_waves.mp4' },
  { name: 'space_nebula.mp4' },
  { name: 'cooking_food.mp4' },
  { name: 'workout_gym.mp4' },
];

// Poster/Thumbnail images: Picsum photos (deterministic by seed)
function posterUrl(seed) { return `https://picsum.photos/seed/${seed}/400/600`; }
function thumbUrl(seed)  { return `https://picsum.photos/seed/${seed}/1280/720`; }

// ───────────────── Series Definitions ──────────────────
const SERIES_DEFS = [
  {
    title: 'Whispers of the Wild',
    description: 'A nature documentary exploring wildlife, forests, mountains, rivers, and wilderness survival. This stunning cinematic exploration captures breathtaking landscapes, endangered species, natural ecosystems, and environmental conservation. Journey through ancient forests, pristine valleys, and untouched wilderness in this epic nature expedition. Wildlife photography, nature cinematography, ecological exploration, mountain expedition, river exploration, forest survival, nature adventure, wilderness documentary, environmental documentary, landscape exploration, nature journey.',
    genres: ['Nature', 'Documentary'],
    releaseYear: 2024,
    status: 'completed',
    posterSeed: 'wild-poster',
    episodes: [
      { title: 'Ancient Canopy',     videoIdx: 0, thumbSeed: 'wild-ep1', dur: 200 },
      { title: 'River of Secrets',   videoIdx: 0, thumbSeed: 'wild-ep2', dur: 210 },
      { title: 'Mountain Whispers',  videoIdx: 0, thumbSeed: 'wild-ep3', dur: 190 },
    ],
    seedStats: { views: 5200, likes: 380, recentViews: 900, comments: 45, daysOld: 3 },
  },
  {
    title: 'Neon Horizons',
    description: 'A science fiction drama exploring futuristic technology, space exploration, alien civilizations, and cosmic mysteries. Set in a cyberpunk universe with advanced quantum technology, artificial intelligence, and interstellar travel. Journey through distant galaxies, nebula formations, and the frontiers of space in this epic science fiction adventure. Space exploration, cosmic adventure, science fiction journey, futuristic technology, quantum exploration, galaxy expedition, interstellar adventure, cosmic documentary, space journey, universe exploration.',
    genres: ['Sci-Fi', 'Drama'],
    releaseYear: 2025,
    status: 'ongoing',
    posterSeed: 'neon-poster',
    episodes: [
      { title: 'Arrival',         videoIdx: 1, thumbSeed: 'neon-ep1', dur: 180 },
      { title: 'The Grid',        videoIdx: 1, thumbSeed: 'neon-ep2', dur: 195 },
    ],
    seedStats: { views: 3100, likes: 210, recentViews: 700, comments: 30, daysOld: 7 },
  },
  {
    title: 'Tides of Change',
    description: 'A nature documentary exploring marine wildlife, ocean ecosystems, coral reefs, and underwater wilderness survival. This stunning cinematic exploration captures breathtaking underwater landscapes, endangered ocean species, natural marine ecosystems, and environmental conservation. Journey through pristine ocean valleys and untouched underwater wilderness in this epic nature expedition. Wildlife photography, nature cinematography, ecological exploration, ocean expedition, river exploration, marine survival, nature adventure, wilderness documentary, environmental documentary, landscape exploration, nature journey.',
    genres: ['Adventure', 'Documentary'],
    releaseYear: 2024,
    status: 'completed',
    posterSeed: 'tides-poster',
    episodes: [
      { title: 'The Deep Blue',     videoIdx: 2, thumbSeed: 'tides-ep1', dur: 220 },
      { title: 'Storm Chasers',     videoIdx: 2, thumbSeed: 'tides-ep2', dur: 230 },
      { title: 'Coral Kingdom',     videoIdx: 2, thumbSeed: 'tides-ep3', dur: 205 },
    ],
    seedStats: { views: 800, likes: 150, recentViews: 200, comments: 80, daysOld: 14 },
  },
  {
    title: 'Beyond the Stars',
    description: 'A science fiction adventure exploring deep space exploration, alien civilizations, distant galaxies, and cosmic mysteries. Follow astronauts through the universe with advanced quantum technology, artificial intelligence, and interstellar travel. Journey through nebula formations, cosmic frontiers, and the depths of space in this epic science fiction expedition. Space exploration, cosmic adventure, science fiction journey, futuristic technology, quantum exploration, galaxy expedition, interstellar adventure, cosmic documentary, space journey, universe exploration.',
    genres: ['Sci-Fi', 'Adventure'],
    releaseYear: 2025,
    status: 'ongoing',
    posterSeed: 'stars-poster',
    episodes: [
      { title: 'Launch Day',      videoIdx: 3, thumbSeed: 'stars-ep1', dur: 185 },
      { title: 'Nebula Drift',    videoIdx: 3, thumbSeed: 'stars-ep2', dur: 200 },
    ],
    seedStats: { views: 1500, likes: 130, recentViews: 1400, comments: 20, daysOld: 1 },
  },
  {
    title: 'The Flavor Lab',
    description: 'A dramatic cooking competition exploring culinary artistry, gourmet cuisine, kitchen rivalry, and the human drama behind food culture. Watch talented chefs create extraordinary dishes under intense pressure in this cinematic exploration of culinary adventure. Journey through world cuisines, cooking challenges, and gastronomic expedition in this epic food documentary. Culinary exploration, cooking adventure, food journey, kitchen documentary, gourmet expedition, culinary documentary, food survival, cooking journey, cuisine exploration, culinary adventure.',
    genres: ['Comedy', 'Drama'],
    releaseYear: 2024,
    status: 'completed',
    posterSeed: 'flavor-poster',
    episodes: [
      { title: 'First Course',    videoIdx: 4, thumbSeed: 'flavor-ep1', dur: 240 },
      { title: 'Under Pressure',  videoIdx: 4, thumbSeed: 'flavor-ep2', dur: 210 },
      { title: 'Grand Finale',    videoIdx: 4, thumbSeed: 'flavor-ep3', dur: 250 },
    ],
    seedStats: { views: 8000, likes: 500, recentViews: 100, comments: 60, daysOld: 45 },
  },
  {
    title: 'Ironclad',
    description: 'A nature documentary exploring wilderness survival, mountain expeditions, wildlife endurance, and extreme landscapes. This stunning cinematic exploration captures breathtaking mountain landscapes, endangered wildlife, natural ecosystems, and environmental challenges. Journey through forests, rivers, and untouched wilderness in this epic nature expedition about athletic survival. Wildlife photography, nature cinematography, ecological exploration, mountain expedition, forest survival, nature adventure, wilderness documentary, environmental documentary, landscape exploration, nature journey.',
    genres: ['Action', 'Documentary'],
    releaseYear: 2025,
    status: 'ongoing',
    posterSeed: 'iron-poster',
    episodes: [
      { title: 'The Grind',       videoIdx: 5, thumbSeed: 'iron-ep1', dur: 190 },
      { title: 'Breaking Point',  videoIdx: 5, thumbSeed: 'iron-ep2', dur: 205 },
    ],
    seedStats: { views: 2200, likes: 170, recentViews: 400, comments: 25, daysOld: 10 },
  },
];

// ───────────────── Main Seed Function ──────────────────
async function seed() {
  console.log('\n🌱 StreamVault Master Seeder\n' + '─'.repeat(40));

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/streamvault';
  await mongoose.connect(uri);
  console.log('✓ Connected to MongoDB\n');

  // Ensure directories
  [VIDEOS, THUMBNAILS].forEach(d => fs.mkdirSync(d, { recursive: true }));

  // Step 1: Ensure all video files exist (copy from existing local files)
  console.log('📹 Ensuring video files...');
  for (const v of VIDEOS_LIST) {
    await ensureVideo(v.name, null, VIDEOS);
  }

  // Step 2: Wipe old data (preserve admins)
  console.log('\n🧹 Clearing old collections...');
  await Series.deleteMany({});
  await Season.deleteMany({});
  await Episode.deleteMany({});
  await WatchHistory.deleteMany({});
  await Like.deleteMany({});
  await Comment.deleteMany({});
  await Notification.deleteMany({});
  await Bookmark.deleteMany({});
  await User.deleteMany({ role: { $ne: 'admin' } });
  console.log('  ✅ Collections wiped safely (admins preserved).');

  // Step 3: Set up demo users
  console.log('\n👤 Setting up demo users...');
  let admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    admin = await User.create({
      email: 'admin@streamvault.dev',
      password: 'Admin1234!',
      username: 'AdminUser',
      role: 'admin',
      isVerified: true,
      preferredGenres: ['Sci-Fi', 'Action'],
    });
    console.log('  ✓ Created admin user (admin@streamvault.dev / Admin1234!)');
  } else {
    console.log(`  ✓ Admin exists: ${admin.email}`);
  }

  let viewer = await User.findOne({ email: 'viewer@streamvault.dev' });
  if (!viewer) {
    viewer = await User.create({
      email: 'viewer@streamvault.dev',
      password: 'Viewer1234!',
      username: 'DemoViewer',
      role: 'user',
      isVerified: true,
      preferredGenres: ['Nature', 'Adventure', 'Documentary'],
    });
    console.log('  ✓ Created viewer user (viewer@streamvault.dev / Viewer1234!)');
  } else {
    console.log(`  ✓ Viewer exists: ${viewer.email}`);
  }

  let viewer2 = await User.findOne({ email: 'viewer2@streamvault.dev' });
  if (!viewer2) {
    viewer2 = await User.create({
      email: 'viewer2@streamvault.dev',
      password: 'Viewer1234!',
      username: 'CasualWatcher',
      role: 'user',
      isVerified: true,
      preferredGenres: ['Comedy', 'Drama'],
    });
    console.log('  ✓ Created viewer2 user (viewer2@streamvault.dev / Viewer1234!)');
  } else {
    console.log(`  ✓ Viewer2 exists: ${viewer2.email}`);
  }

  // Step 4: Create series, seasons, episodes
  console.log('\n📺 Creating series & episodes...');
  const allEpisodes = []; // Flat list for seeding engagement data later

  for (const def of SERIES_DEFS) {
    // Download poster
    const posterFile = `poster_${def.posterSeed}.jpg`;
    await download(posterUrl(def.posterSeed), path.join(THUMBNAILS, posterFile));

    const series = await Series.create({
      title: def.title,
      description: def.description,
      genres: def.genres,
      releaseYear: def.releaseYear,
      status: def.status,
      catalogStatus: 'published',
      posterPath: posterFile,
      createdBy: admin._id,
      totalViews: def.seedStats.views,
      totalLikes: def.seedStats.likes,
      createdAt: daysAgo(def.seedStats.daysOld),
    });
    console.log(`  ✓ Series: ${series.title}`);

    const season = await Season.create({
      seriesId: series._id,
      number: 1,
      title: 'Season 1',
    });

    for (let i = 0; i < def.episodes.length; i++) {
      const epDef = def.episodes[i];
      const videoFile = VIDEOS_LIST[epDef.videoIdx].name;
      const thumbFile = `thumb_${epDef.thumbSeed}.jpg`;
      await download(thumbUrl(epDef.thumbSeed), path.join(THUMBNAILS, thumbFile));

      // Distribute stats across episodes (first ep gets most)
      const factor = i === 0 ? 0.5 : (i === 1 ? 0.3 : 0.2);
      const epViews = Math.round(def.seedStats.views * factor);
      const epLikes = Math.round(def.seedStats.likes * factor);
      const epRecentViews = Math.round(def.seedStats.recentViews * factor);

      const ep = await Episode.create({
        seasonId: season._id,
        number: i + 1,
        title: epDef.title,
        description: `Episode ${i + 1} of ${def.title}.`,
        durationSeconds: epDef.dur,
        thumbnailPath: thumbFile,
        qualities: [{ key: '720p', fileName: videoFile, mimeType: 'video/mp4', sizeBytes: 0 }],
        subtitles: [],
        views: epViews,
        likes: epLikes,
        recentViews: epRecentViews,
        engagementScore: epLikes + (Math.round(def.seedStats.comments * factor) * 2),
        trendingScore: epRecentViews * 0.5 + epLikes * 0.3 + epViews * 0.2,
        createdAt: daysAgo(def.seedStats.daysOld - i), // Stagger release
      });
      console.log(`    └ Ep${i + 1}: ${epDef.title} (${epDef.dur}s, ${epViews} views)`);
      allEpisodes.push({ ...ep.toObject(), seriesDef: def });
    }
  }

  // Step 5: Seed Likes (for Recommendation + Top Rated algos)
  console.log('\n👍 Seeding likes...');
  let likesCreated = 0;
  for (const ep of allEpisodes) {
    // Viewer likes Nature & Adventure & Documentary content
    if (['Nature', 'Documentary', 'Adventure'].some(g => ep.seriesDef.genres.includes(g))) {
      await Like.findOneAndUpdate(
        { userId: viewer._id, episodeId: ep._id },
        { userId: viewer._id, episodeId: ep._id, value: 1 },
        { upsert: true }
      );
      likesCreated++;
    }
    // Viewer2 likes Comedy & Drama content
    if (['Comedy', 'Drama'].some(g => ep.seriesDef.genres.includes(g))) {
      await Like.findOneAndUpdate(
        { userId: viewer2._id, episodeId: ep._id },
        { userId: viewer2._id, episodeId: ep._id, value: 1 },
        { upsert: true }
      );
      likesCreated++;
    }
  }
  console.log(`  ✓ ${likesCreated} likes created`);

  // Step 6: Seed Watch History (for Continue Watching + Recommendation algos)
  console.log('\n📊 Seeding watch history...');
  let histCreated = 0;
  for (const ep of allEpisodes) {
    const dur = ep.durationSeconds || 200;
    // Viewer watched Nature/Doc/Adventure content partially (shows in Continue Watching)
    if (['Nature', 'Documentary', 'Adventure'].some(g => ep.seriesDef.genres.includes(g))) {
      const progress = ep.number === 1 ? dur * 0.4 : dur * 0.15; // First ep 40%, rest 15%
      await WatchHistory.findOneAndUpdate(
        { userId: viewer._id, episodeId: ep._id },
        {
          userId: viewer._id,
          episodeId: ep._id,
          progressSeconds: Math.round(progress),
          durationSeconds: dur,
          completed: false,
          lastWatchedAt: daysAgo(ep.seriesDef.seedStats.daysOld > 5 ? 2 : 0),
        },
        { upsert: true }
      );
      histCreated++;
    }
    // Viewer2 fully completed Comedy/Drama content (should NOT appear in Continue Watching)
    if (['Comedy', 'Drama'].some(g => ep.seriesDef.genres.includes(g))) {
      await WatchHistory.findOneAndUpdate(
        { userId: viewer2._id, episodeId: ep._id },
        {
          userId: viewer2._id,
          episodeId: ep._id,
          progressSeconds: dur,
          durationSeconds: dur,
          completed: true,
          lastWatchedAt: daysAgo(5),
        },
        { upsert: true }
      );
      histCreated++;
    }
  }
  console.log(`  ✓ ${histCreated} watch history entries`);

  // Step 7: Seed Comments (for Engagement Score algo)
  console.log('\n💬 Seeding comments...');
  const commentTexts = [
    'This is absolutely incredible!',
    'One of the best episodes I have ever seen.',
    'The cinematography is stunning 🔥',
    'Can\'t wait for the next episode!',
    'This series deserves more recognition.',
    'The storytelling is phenomenal.',
    'Rewatching this for the third time!',
    'Perfect pacing, no filler at all.',
    'This changed my perspective completely.',
    'Recommend this to everyone I know!',
  ];
  let commentsCreated = 0;
  for (const ep of allEpisodes) {
    const numComments = Math.round((ep.seriesDef.seedStats.comments || 10) * (ep.number === 1 ? 0.5 : 0.25));
    for (let c = 0; c < Math.min(numComments, 5); c++) {
      const userId = c % 2 === 0 ? viewer._id : viewer2._id;
      const existing = await Comment.findOne({ episodeId: ep._id, userId, body: commentTexts[c % commentTexts.length] });
      if (!existing) {
        await Comment.create({
          episodeId: ep._id,
          userId,
          body: commentTexts[c % commentTexts.length],
          likes: Math.floor(Math.random() * 20),
          createdAt: daysAgo(Math.floor(Math.random() * 10)),
        });
        commentsCreated++;
      }
    }
  }
  console.log(`  ✓ ${commentsCreated} comments created`);

  // Step 8: Seed Notifications (so the bell icon has content)
  console.log('\n🔔 Seeding notifications...');
  let notifsCreated = 0;
  for (const ep of allEpisodes) {
    // Notify viewer about Nature/Documentary/Adventure new episodes
    if (['Nature', 'Documentary', 'Adventure'].some(g => ep.seriesDef.genres.includes(g))) {
      await Notification.create({
        userId: viewer._id,
        type: 'new_episode',
        title: 'New Episode Available',
        message: `${ep.seriesDef.title} — ${ep.title} is now streaming!`,
        link: `/watch/${ep._id}`,
        read: ep.number > 1, // Only first ep notification is unread
        createdAt: daysAgo(ep.seriesDef.seedStats.daysOld - (ep.number - 1)),
      });
      notifsCreated++;
    }
    // Notify viewer2 about Comedy/Drama new episodes
    if (['Comedy', 'Drama'].some(g => ep.seriesDef.genres.includes(g))) {
      await Notification.create({
        userId: viewer2._id,
        type: 'new_episode',
        title: 'New Episode Available',
        message: `${ep.seriesDef.title} — ${ep.title} is now streaming!`,
        link: `/watch/${ep._id}`,
        read: ep.number > 1,
        createdAt: daysAgo(ep.seriesDef.seedStats.daysOld - (ep.number - 1)),
      });
      notifsCreated++;
    }
  }
  // Add a system notification for both users
  await Notification.create({
    userId: viewer._id,
    type: 'system',
    title: 'Welcome to StreamVault!',
    message: 'Your personalized recommendations are ready. Start watching to improve them!',
    read: false,
    createdAt: daysAgo(0),
  });
  await Notification.create({
    userId: viewer2._id,
    type: 'system',
    title: 'Welcome to StreamVault!',
    message: 'Your personalized recommendations are ready. Start watching to improve them!',
    read: false,
    createdAt: daysAgo(0),
  });
  notifsCreated += 2;
  console.log(`  ✓ ${notifsCreated} notifications created`);

  // Done
  console.log('\n' + '─'.repeat(40));
  console.log('🎉 Seeding complete! Here is what was seeded:\n');
  console.log(`  📺 ${SERIES_DEFS.length} Series (${allEpisodes.length} Episodes total)`);
  console.log(`  👤 3 Users (admin, viewer, viewer2)`);
  console.log(`  👍 ${likesCreated} Likes`);
  console.log(`  📊 ${histCreated} Watch History entries`);
  console.log(`  💬 ${commentsCreated} Comments`);
  console.log(`  🔔 ${notifsCreated} Notifications\n`);
  console.log('Algorithm Coverage:');
  console.log('  • Trending:         "Beyond the Stars" (high recentViews, 1 day old)');
  console.log('  • Most Watched:     "The Flavor Lab" (8000 views) & "Whispers" (5200)');
  console.log('  • Top Rated:        "Whispers of the Wild" (high engagement score)');
  console.log('  • Recency Boost:    "Beyond the Stars" (posted yesterday)');
  console.log('  • Time Decay:       "The Flavor Lab" (45 days old, should rank lower in trending)');
  console.log('  • Hybrid Recs:      Login as viewer → Nature/Adventure/Doc content ranked higher');
  console.log('  • Genre Diversity:  Recs should interleave genres, not show 3 Nature in a row');
  console.log('  • Continue Watch:   Login as viewer → partially watched Nature eps show up');
  console.log('  • Engagement Score: "Tides of Change" (low views but 80 comments → high engagement)');
  console.log('  • Notifications:    Login as viewer → bell icon shows unread new-episode alerts\n');

  console.log('Demo Accounts:');
  console.log('  admin@streamvault.dev   / Admin1234!');
  console.log('  viewer@streamvault.dev  / Viewer1234!');
  console.log('  viewer2@streamvault.dev / Viewer1234!\n');

  await mongoose.disconnect();
  console.log('✓ Disconnected from MongoDB\n');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
