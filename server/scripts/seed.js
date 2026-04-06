#!/usr/bin/env node
/**
 * ClickWatch Master Seed Script (Consolidated & Enhanced)
 * ──────────────────────────────
 * Creates 8 series with rich descriptions, aggregates ratings, 
 * and generates overlapping user history for recommendation algorithms.
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
const Rating = require('../src/models/Rating');
const WatchHistory = require('../src/models/WatchHistory');
const Notification = require('../src/models/Notification');
const { VIDEOS, THUMBNAILS } = require('../src/config/paths');
const { updateRatings } = require('../src/helpers/content');

// ───────────────────── Helpers ─────────────────────
function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) { return resolve(); }
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
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
  if (fs.existsSync(dest)) return;
  const existing = fs.readdirSync(videosDir).filter(f => f.endsWith('.mp4') && fs.statSync(path.join(videosDir, f)).size > 100000);
  if (existing.length > 0) fs.copyFileSync(path.join(videosDir, existing[0]), dest);
}

function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function posterUrl(seed) { return `https://picsum.photos/seed/${seed}/400/600`; }
function thumbUrl(seed)  { return `https://picsum.photos/seed/${seed}/1280/720`; }

const VIDEOS_LIST = [
  { name: 'nature_forest.mp4' }, { name: 'city_timelapse.mp4' },
  { name: 'ocean_waves.mp4' }, { name: 'space_nebula.mp4' },
  { name: 'cooking_food.mp4' }, { name: 'workout_gym.mp4' },
];

const SERIES_DEFS = [
  {
    title: 'Whispers of the Wild', genres: ['Nature', 'Documentary'], releaseYear: 2024, status: 'completed', posterSeed: 'wild-poster',
    tags: ['wildlife', 'ecosystem', 'rainforest', 'conservation', 'planet', 'earth', 'survival', 'biodiversity', 'cinematography', 'amazon'],
    description: 'An immersive, multi-part journey through Earth\'s most pristine and untouched ecosystems, Whispers of the Wild offers an unprecedented look at the delicate balance of nature. From the dense, emerald Amazonian canopy to the hidden subterranean rivers of the Yucatan, this series captures the raw beauty and complexity of life in the wild. Utilizing state-of-the-art 8K cinematography and expert narration by world-renowned naturalists, each episode explores the unique survival strategies of species on the brink. This isn\'t just a documentary; it\'s a call to witness the silent majesty of our planet before it changes forever, providing a sensory experience that brings the outdoors directly into your living room.',
    seedStats: { views: 5200, likes: 380, recentViews: 900, comments: 45, daysOld: 3 }, eps: ['Ancient Canopy', 'River Secrets']
  },
  {
    title: 'Neon Horizons', genres: ['Sci-Fi', 'Drama'], releaseYear: 2025, status: 'ongoing', posterSeed: 'neon-poster',
    tags: ['cyberpunk', 'AI', 'hacker', 'neural-network', 'megacity', 'dystopia', 'conspiracy', 'digital', 'neon', 'futuristic'],
    description: 'In the year 2099, humanity has migrated to sprawling megacities governed by enigmatic AI overseers and corporate conglomerates. Neon Horizons is a gripping noir drama that follows a group of rogue systems engineers who stumble upon a dangerous anomaly hidden within the city\'s global neural network. As they peel back layers of digital deception, they uncover a conspiracy that threatens to rewrite the very foundations of human identity and digital reality. With a haunting synth-wave soundtrack and a visually stunning cyberpunk aesthetic, the series delves deep into themes of consciousness, privacy, and the cost of technological progress in an age where the line between programmer and programmed has completely blurred.',
    seedStats: { views: 3100, likes: 210, recentViews: 700, comments: 30, daysOld: 7 }, eps: ['Arrival', 'The Grid']
  },
  {
    title: 'Tides of Change', genres: ['Adventure', 'Nature'], releaseYear: 2024, status: 'completed', posterSeed: 'tides-poster',
    tags: ['ocean', 'marine', 'wildlife', 'deep-sea', 'ecosystem', 'conservation', 'planet', 'earth', 'exploration', 'biodiversity'],
    description: 'Explore the immense power and hidden mysteries of our planet\'s vast oceans in this epic adventure series. Tides of Change follows a courageous team of marine biologists and deep-sea explorers as they venture into the \"Midnight Zone,\" where bioluminescent creatures thrive in total darkness. Each episode reveals the stunning biodiversity of the abyss while documenting the urgent, real-world challenges facing our marine environments in an era of rapid climate shift. Through intimate storytelling and breathtaking underwater photography, the series highlights the profound connection between the deep blue and the survival of all terrestrial life, offering both a warning and a message of hope for the future of our seas.',
    seedStats: { views: 800, likes: 150, recentViews: 200, comments: 80, daysOld: 14 }, eps: ['Deep Blue', 'Storm']
  },
  {
    title: 'Beyond the Stars', genres: ['Sci-Fi', 'Adventure'], releaseYear: 2025, status: 'ongoing', posterSeed: 'stars-poster',
    tags: ['space', 'interstellar', 'colonization', 'galaxy', 'exploration', 'survival', 'spaceship', 'futuristic', 'cosmos', 'astronaut'],
    description: 'A cinematic and philosophically charged exploration of the next great frontier: interstellar colonization. As Earth\'s resources dwindle, the crew of the Horizon—the first interstellar colony ship—embarks on a centuries-long voyage toward the Andromeda galaxy. Beyond the Stars focuses on the intense physical and psychological pressures of deep space exploration, where every decision could mean the difference between the survival of the human race and total oblivion. The series combines hard science fiction with a focus on human resilience, exploring how culture, morality, and hope evolve when severed from the home planet and cast into the infinite, cold vacuum of the cosmos.',
    seedStats: { views: 1500, likes: 130, recentViews: 1400, comments: 20, daysOld: 1 }, eps: ['Launch', 'Drift']
  },
  {
    title: 'Cybernetica', genres: ['Sci-Fi', 'Action'], releaseYear: 2025, status: 'ongoing', posterSeed: 'cyber-poster',
    tags: ['cyberpunk', 'hacker', 'AI', 'neural-network', 'augmentation', 'neon', 'megacity', 'dystopia', 'digital', 'warfare'],
    description: 'The line between man and machine is not just blurred—it\'s being erased in this high-octane thriller set in a world dominated by pervasive cybernetic enhancements. Cybernetica centers on a black-market hacker who develops a sentient virus capable of bypassing the world\'s most secure neural firewalls, sparking a global manhunt. A specialized task force, equipped with experimental augmentations themselves, must track the hacker through the dark, neon-soaked underbelly of a vertical metropolis. The series explores the ethical minefields of transhumanism and the terrifying potential of decentralized digital warfare, all delivered through pulse-pounding action sequences and a tight, suspenseful narrative.',
    seedStats: { views: 9000, likes: 800, recentViews: 2000, comments: 100, daysOld: 5 }, eps: ['SysAdmin', 'Root Access']
  },
  {
    title: 'Midnight Tokyo', genres: ['Anime', 'Action'], releaseYear: 2026, status: 'ongoing', posterSeed: 'tokyo-poster',
    tags: ['anime', 'samurai', 'blade', 'spirits', 'guardian', 'folklore', 'tokyo', 'supernatural', 'martial-arts', 'heritage'],
    description: 'A visually breathtaking anime masterpiece that reveals the hidden side of the world\'s most vibrant metropolis. Midnight Tokyo follows the double life of a reserved high school student who inherits a legendary blade forged from celestial iron. By day, they navigate the social pressures and academic rigors of modern Tokyo; by night, they become the city\'s silent guardian against ancient, malevolent spirits that emerge from the shadows of the Shibuya and Shinjuku districts. With fluid, high-budget animation and a story rooted in Japanese folklore and contemporary urban legend, the series is a thrilling exploration of heritage, duty, and the extraordinary power hidden within the ordinary.',
    seedStats: { views: 12000, likes: 1500, recentViews: 5000, comments: 300, daysOld: 2 }, eps: ['Awakening', 'Shinobi']
  },
  {
    title: 'City of Gold', genres: ['Action', 'Adventure'], releaseYear: 2026, status: 'ongoing', posterSeed: 'gold-poster',
    tags: ['treasure', 'exploration', 'amazon', 'ancient', 'civilization', 'rainforest', 'globe-trotting', 'heist', 'survival', 'mystery'],
    description: 'An elite team of expert treasure hunters and historians discovers a cryptic map that purportedly leads to \"Paititi,\" a legendary sunken city rumored to be overflowing with Incan gold and ancient artifacts of unimaginable power. City of Gold is a pulse-pounding race across the globe, taking the team from the high-tech auction houses of Europe to the treacherous, uncharted depths of the Amazonian rainforest. As they face off against rival mercenaries and navigate deadly ancient traps, they discover that the treasure they seek may be tied to a forgotten civilization with the power to change the modern world. It\'s a classic adventure story elevated by modern technical expertise and high-stakes international intrigue.',
    seedStats: { views: 15000, likes: 2000, recentViews: 6000, comments: 400, daysOld: 1 }, eps: ['The Heist', 'Escape']
  },
  {
    title: 'Echoes of the Cosmos', genres: ['Sci-Fi', 'Documentary'], releaseYear: 2026, status: 'ongoing', posterSeed: 'cosmos-poster',
    tags: ['space', 'cosmos', 'galaxy', 'astronaut', 'planet', 'earth', 'interstellar', 'exploration', 'nasa', 'futuristic'],
    description: 'Echoes of the Cosmos is a visually stunning docu-series that blends cutting-edge astrophysics research with narrative storytelling. From the radiotelescopes of the Atacama Desert to the orbital laboratories circling Mars, the series follows a new generation of scientists racing to answer humanity\'s oldest question: are we alone in the cosmos? Each episode pairs real-world space exploration milestones with speculative dramatizations of first contact scenarios, grounded in peer-reviewed science. With breathtaking visual effects and narration that makes quantum physics accessible, this series bridges the gap between documentary rigor and the boundless imagination of science fiction, making the vastness of the universe feel both humbling and thrillingly within reach.',
    seedStats: { views: 4000, likes: 350, recentViews: 1800, comments: 60, daysOld: 4 }, eps: ['Signal', 'First Light']
  }
];

async function seed() {
  console.log('\n🌱 ClickWatch Master Seeder (Consolidated)\n' + '─'.repeat(40));
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clickwatch';
  await mongoose.connect(uri);
  
  [VIDEOS, THUMBNAILS].forEach(d => fs.mkdirSync(d, { recursive: true }));
  for (const v of VIDEOS_LIST) await ensureVideo(v.name, null, VIDEOS);

  await Series.deleteMany({}); await Season.deleteMany({}); await Episode.deleteMany({});
  await WatchHistory.deleteMany({}); await Like.deleteMany({}); await Comment.deleteMany({}); 
  await Rating.deleteMany({}); await Notification.deleteMany({});
  await User.deleteMany({ role: { $ne: 'admin' } });

  const createUsr = async (e, p, u, g) => {
    let usr = await User.findOne({ email: e });
    if (!usr) usr = await User.create({ email: e, password: p, username: u, role: 'user', isVerified: true, preferredGenres: g });
    return usr;
  };
  const admin = await User.findOne({ role: 'admin' }) || await User.create({ email: 'admin@clickwatch.dev', password: 'Admin1234!', username: 'Admin', role: 'admin', isVerified: true, preferredGenres: ['Sci-Fi'] });
  
  const users = [
    await createUsr('scifi_nerd@clickwatch.dev', 'Viewer1234!', 'SciFiNerd', ['Sci-Fi', 'Action']),
    await createUsr('action_hero@clickwatch.dev', 'Viewer1234!', 'ActionHero', ['Action', 'Adventure']),
    await createUsr('nature_lover@clickwatch.dev', 'Viewer1234!', 'NatureLover', ['Nature', 'Documentary']),
    await createUsr('casual_watcher@clickwatch.dev', 'Viewer1234!', 'CasualWatcher', ['Comedy', 'Drama', 'Documentary'])
  ];

  const allEpisodes = []; 
  for (let sIdx = 0; sIdx < SERIES_DEFS.length; sIdx++) {
    const def = SERIES_DEFS[sIdx];
    const posterFile = `poster_${def.posterSeed}.jpg`;
    try { await download(posterUrl(def.posterSeed), path.join(THUMBNAILS, posterFile)); } catch(e) {}

    const series = await Series.create({
      title: def.title, description: def.description, genres: def.genres,
      tags: def.tags || [],
      releaseYear: def.releaseYear, status: def.status, catalogStatus: 'published',
      posterPath: posterFile, createdBy: admin._id, totalViews: def.seedStats.views,
      totalLikes: def.seedStats.likes, createdAt: daysAgo(def.seedStats.daysOld),
    });

    const season = await Season.create({ seriesId: series._id, number: 1, title: 'Season 1' });
    for (let i = 0; i < def.eps.length; i++) {
        const videoIdx = sIdx % 6;
        const videoFile = VIDEOS_LIST[videoIdx].name;
        const thumbFile = `thumb_${def.posterSeed}_ep${i}.jpg`;
        try { await download(thumbUrl(def.posterSeed + i), path.join(THUMBNAILS, thumbFile)); } catch(e){}

        const ep = await Episode.create({
            seasonId: season._id, number: i + 1, title: def.eps[i],
            durationSeconds: 200, thumbnailPath: thumbFile,
            qualities: [{ key: '720p', fileName: videoFile, mimeType: 'video/mp4', sizeBytes: 0 }],
            views: def.seedStats.views, likes: def.seedStats.likes, recentViews: def.seedStats.recentViews,
            engagementScore: def.seedStats.comments, trendingScore: def.seedStats.recentViews,
            createdAt: daysAgo(def.seedStats.daysOld),
        });
        allEpisodes.push({ ...ep.toObject(), seriesDef: def });
    }
  }

  console.log('⭐ Generating random user data for recommendations...');
  for (const ep of allEpisodes) {
     for (const u of users) {
        const interested = u.preferredGenres.some(g => ep.seriesDef.genres.includes(g));
        if (interested || Math.random() > 0.6) {
           await WatchHistory.create({ userId: u._id, episodeId: ep._id, progressSeconds: 200, durationSeconds: 200, completed: true, lastWatchedAt: new Date() });
           const star = Math.floor(Math.random() * (interested ? 3 : 5)) + (interested ? 3 : 1);
           await Rating.create({ userId: u._id, episodeId: ep._id, rating: Math.min(5, star) });
           if(Math.random() > 0.5) await Like.create({ userId: u._id, episodeId: ep._id, value: 1 });
        }
     }
  }

  console.log('🔄 Aggregating ratings...');
  for (const ep of allEpisodes) { await updateRatings(ep._id); }

  // ── TF-IDF Similarity Proof ──
  console.log('\n📊 TF-IDF Cosine Similarity Report');
  console.log('═'.repeat(60));
  const { findSimilarSeries } = require('../src/algorithms/content-based-filtering');
  const allSeries = await Series.find({ catalogStatus: { $ne: 'draft' } }).lean();

  for (const s of allSeries) {
    const similar = findSimilarSeries(s._id, allSeries, 5);
    console.log(`\n🎬 "${s.title}" [${s.genres.join(', ')}]`);
    if (similar.length === 0) {
      console.log('   No similar series found.');
    } else {
      for (const r of similar) {
        const match = allSeries.find(x => x._id.toString() === r.seriesId);
        const pct = (r.similarity * 100).toFixed(1);
        console.log(`   → ${pct}% match with "${match?.title}" [${match?.genres?.join(', ')}]`);
      }
    }
  }
  console.log('\n' + '═'.repeat(60));

  console.log('🎉 Seeding Complete!');
  await mongoose.disconnect();
}
seed().catch((err) => { console.error('❌ failed:', err); process.exit(1); });
