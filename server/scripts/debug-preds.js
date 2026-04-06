require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const { buildRatingMatrix, getCollaborativeRecommendations } = require('../src/algorithms/collaborative-filtering');
const Episode = require('../src/models/Episode');
const Series = require('../src/models/Series');

async function checkPredictions() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clickwatch';
  await mongoose.connect(uri);

  const matrix = await buildRatingMatrix();
  const userIds = Object.keys(matrix);
  console.log(`Loaded matrix with ${userIds.length} users.`);

  if (userIds.length >= 2) {
    const candidates = await Episode.find({}).lean();
    const candidateIds = candidates.map(c => c._id);
    console.log(`Found ${candidateIds.length} candidate episodes.`);

    for (const uid of userIds) {
      console.log(`\n--- Recommendations for User ${uid} ---`);
      console.log(`Their existing ratings:`, matrix[uid]);
      const recs = await getCollaborativeRecommendations(uid, candidateIds, 20);
      for (const rec of recs) {
        const ep = candidates.find(c => c._id.toString() === rec.episodeId.toString());
        const series = await Series.findById(ep.seriesId).lean().catch(()=>null);
        console.log(`  Predicted Score: ${rec.predictedRating.toFixed(2)} | Episode ID: ${rec.episodeId} | Series: ${series ? series.title : 'Unknown'}`);
      }
    }
  } else {
    console.log("Not enough users to form predictions");
  }

  await mongoose.disconnect();
}

checkPredictions().catch(console.error);
