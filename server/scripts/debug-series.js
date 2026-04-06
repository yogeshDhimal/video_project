require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Series = require('../src/models/Series');

async function checkSeries() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clickwatch';
  await mongoose.connect(uri);

  const series = await Series.find({}).lean();
  console.log(`Found ${series.length} series:`);
  for (const s of series) {
    console.log(`- ${s.title}: Genres = ${s.genres ? s.genres.join(', ') : 'NONE'}`);
  }

  await mongoose.disconnect();
}
checkSeries().catch(console.error);
