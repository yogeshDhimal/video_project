#!/usr/bin/env node
/**
 * ClickWatch - Pearson Correlation Live Demo Script
 * --------------------------------------------------
 * Run this script during your project defense to prove to the
 * examiner that your Pearson Collaborative Filtering is working.
 * It connects to MongoDB, builds the Rating Matrix, and prints
 * the exact mathematical correlation between users!
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

// Import your exact algorithm files
const { buildRatingMatrix } = require('../src/algorithms/collaborative-filtering');
const { calculatePearsonCorrelation } = require('../src/algorithms/collaborative-filtering/pearson');
const User = require('../src/models/User');
const Episode = require('../src/models/Episode');
const Series = require('../src/models/Series');

async function runDemo() {
  console.log('\n======================================================');
  console.log('🤖 CLICKWATCH: PEARSON CORRELATION (USER-TO-USER) DEMO');
  console.log('======================================================\n');
  
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clickwatch';
  await mongoose.connect(uri);

  console.log('1️⃣  Building the master Rating Matrix from MongoDB...');
  const matrix = await buildRatingMatrix();

  const userIds = Object.keys(matrix);
  if (userIds.length < 2) {
    console.log('❌ Not enough data! You need at least 2 users who have watched/rated things to show a Pearson correlation.');
    process.exit(0);
  }

  // Get real usernames for the demo
  const users = await User.find({ _id: { $in: userIds } }, 'username _id');
  const userMap = {};
  users.forEach(u => { userMap[u._id.toString()] = u.username; });

  console.log(`✅ Loaded ${userIds.length} users with ratings.`);
  console.log('\n2️⃣  Calculating Distance & Overlap Details (Math Proof)...\n');

  // Let's compare the first user against everyone else
  const targetUserId = userIds[0];
  const targetUsername = userMap[targetUserId] || 'Target User';
  const targetRatings = matrix[targetUserId];

  console.log(`🎯 Target User: ${targetUsername}`);
  console.log('------------------------------------------------------');

  for (const otherUserId of userIds) {
    if (otherUserId === targetUserId) continue;
    const otherUsername = userMap[otherUserId] || 'Other User';
    
    // Call your exact Pearson function
    const correlation = calculatePearsonCorrelation(targetRatings, matrix[otherUserId]);
    
    // Find overlaps for explanation
    const otherRatings = matrix[otherUserId];
    let sharedItems = 0;
    for (const ep in targetRatings) {
      if (otherRatings[ep]) sharedItems++;
    }

    let status = '';
    if (correlation >= 0.7) status = '🔥 STRONG MATCH (Will highly recommend their content)';
    else if (correlation > 0.3) status = '👍 MODERATE MATCH';
    else if (correlation > 0) status = '〰️ WEAK MATCH';
    else if (correlation < 0) status = '❌ OPPOSITE TASTE (Will downrank their content)';
    else status = '👻 NO CORRELATION (Not enough shared videos or no overlap)';

    console.log(`👤 Compared with: ${otherUsername}`);
    console.log(`   - Shared Videos: ${sharedItems}`);
    console.log(`   - Pearson Score (r): ${correlation.toFixed(4)}`);
    console.log(`   - Result: ${status}\n`);
  }

  console.log('======================================================');
  console.log('🎓 EXAMINER EXPLANATION:');
  console.log('"As you can see, the algorithm dynamically calculates the');
  console.log('distance between users based on what they have mutually');
  console.log('watched. If two users both rate similar videos highly, their');
  console.log('Pearson Score moves closer to +1.0. When making live');
  console.log('recommendations, the Hybrid Engine gives heavily weighted');
  console.log('priority to videos watched by high-correlation neighbors!"');
  console.log('======================================================\n');

  await mongoose.disconnect();
}

runDemo().catch(console.error);
