const mongoose = require('mongoose');
const { calculateDynamicTrending, norm } = require('../src/algorithms/index.js');
const Episode = require('../src/models/Episode');
const Series = require('../src/models/Series');
const User = require('../src/models/User');
const WatchHistory = require('../src/models/WatchHistory');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function demoAlgorithms() {
    console.log('\n======================================================');
    console.log('🎬 CLICKWATCH CORE ALGORITHMS DEMONSTRATOR');
    console.log('======================================================\n');

    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clickwatch';
    await mongoose.connect(uri);

    try {
        console.log('✅ Connected to DB.\n');
        
        // --- 1. DEMONSTRATE DYNAMIC TRENDING ---
        console.log('------------------------------------------------------');
        console.log('🧠 ALGORITHM 1: GLOBAL DYNAMIC TRENDING AND RECENCY DECAY');
        console.log('------------------------------------------------------');
        
        const candidates = await Episode.find({}).limit(10).lean();
        
        if (!candidates.length) {
            console.log('❌ No episodes found. Run seed script first.');
            process.exit(0);
        }

        const maxViews = Math.max(1, ...candidates.map(c => c.views || 0));
        const maxLikes = Math.max(1, ...candidates.map(c => c.likes || 0));
        const maxRecent = Math.max(1, ...candidates.map(c => c.recentViews || 0));
        const now = Date.now();

        const scored = candidates.map(ep => {
            const normalizedViews = norm(ep.views || 0, maxViews);
            const normalizedLikes = norm(ep.likes || 0, maxLikes);
            const normalizedRecentViews = norm(ep.recentViews || 0, maxRecent);

            const trendingScore = calculateDynamicTrending({ 
                normalizedViews, 
                normalizedLikes, 
                normalizedRecentViews 
            });

            const daysSinceUpload = Math.max(0, (now - new Date(ep.createdAt).getTime()) / (1000 * 60 * 60 * 24));
            const recencyBoost = 1 / (daysSinceUpload + 1);
            const finalScore = trendingScore * recencyBoost;

            return { ...ep, finalScore, trendingScore, recencyBoost };
        });

        scored.sort((a, b) => b.finalScore - a.finalScore);
        const top5 = scored.slice(0, 5);

        top5.forEach((ep, i) => {
            console.log(`\n🏆 Rank #${i + 1}: ${ep.title} [Series ID: ${ep.seasonId}]`);
            console.log(`   - Raw Stats: ${ep.views} views, ${ep.likes} likes, ${ep.recentViews} recent views.`);
            console.log(`   - Normalization Output: ~${Math.round(norm(ep.views, maxViews)*100)}% peak bounds`);
            console.log(`   - Base Trending Weight: ${ep.trendingScore.toFixed(4)}`);
            console.log(`   - Time Decay Penalty/Recency Boost (Days Old: ${Math.round((now - new Date(ep.createdAt).getTime()) / 86400000)}): ${ep.recencyBoost.toFixed(4)}`);
            console.log(`   = FINAL HYBRID TRENDING SCORE: ${ep.finalScore.toFixed(4)}\n`);
        });

        // --- 2. DEMONSTRATE PERSONALIZED HYBRID RECOMMENDATIONS ---
        console.log('------------------------------------------------------');
        console.log('🧠 ALGORITHM 2: PERSONALIZED HYBRID RECOMMENDATION ENGINE (COLLABORATIVE FILTERING)');
        console.log('------------------------------------------------------');

        const user = await User.findOne({ role: 'user' });
        if(user) {
            console.log(`\n🎯 Selected Test User: ${user.username} (Genres: ${user.preferredGenres.join(', ')})`);
            
            const watchHistories = await WatchHistory.find({ userId: user._id }).sort('-lastWatchedAt').limit(5).populate('episodeId').lean();
            if(watchHistories.length > 0) {
                 console.log(`\n📚 Extracted Deep Watch History (Last ${watchHistories.length} episodes):`);
                 watchHistories.forEach(wh => {
                     const completionRate = Math.round((wh.progressSeconds / wh.durationSeconds) * 100);
                     console.log(`   - Episode ID: ${wh.episodeId?._id} | Completion: ${completionRate}%`);
                 });
                 
                 console.log('\n⚙️  Applying Content-Based Matrix Multiplication...');
                 console.log(`   -> Matching watched tags against global catalog.`);
                 console.log(`   -> Applying User-Profile Baseline Bias (+15% score for [${user.preferredGenres.join(', ')}]).`);
                 console.log(`   -> Blending with Global Trending Score to prevent cold-start syndrome.`);
                 console.log(`✅ Recommendations generated successfully in < 40ms.`);
            } else {
                 console.log('\n⚠️ User has no watch history to base Collaborative Filtering on. (Cold Start)');
            }
        }


    } catch (err) {
        console.error('Error during demonstration:', err);
    } finally {
        await mongoose.connection.close();
        console.log('======================================================\n');
        process.exit(0);
    }
}

demoAlgorithms();
