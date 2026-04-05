const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Episode = require('../models/Episode');
const Rating = require('../models/Rating');
const Series = require('../models/Series');
const { updateRatings } = require('../helpers/content');

async function seedRatings() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/clickwatch';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for rating seed...');

    const users = await User.find().select('_id');
    const episodes = await Episode.find().select('_id title');

    if (users.length === 0 || episodes.length === 0) {
      console.log('No users or episodes found. Seed users and content first.');
      process.exit(1);
    }

    console.log(`Seeding ratings for ${users.length} users and ${episodes.length} episodes...`);

    // Standard ratings: 100 random ratings
    const ratingDocs = [];
    const seen = new Set();

    for (let i = 0; i < 200; i++) {
        const u = users[Math.floor(Math.random() * users.length)]._id;
        const e = episodes[Math.floor(Math.random() * episodes.length)]._id;
        const key = `${u}-${e}`;
        
        if (seen.has(key)) continue;
        seen.add(key);

        ratingDocs.push({
            userId: u,
            episodeId: e,
            rating: Math.floor(Math.random() * 3) + 3, // Random 3-5 range for "good" data
        });
    }

    await Rating.deleteMany({});
    await Rating.insertMany(ratingDocs);
    console.log(`Inserted ${ratingDocs.length} random ratings.`);

    // Recalculate all averages
    console.log('Recalculating averages...');
    for (const ep of episodes) {
        await updateRatings(ep._id);
    }

    console.log('Rating seed complete!');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
}

seedRatings();
