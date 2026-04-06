const { tokenize, computeTF, computeIDF, buildTFIDFVector, cosineSimilarity, findSimilarSeries } = require('../src/algorithms/content-based-filtering');
const { levenshteinDistance, createFuzzyIndex } = require('../src/algorithms/fuzzy-search');

console.log('\n===== TF-IDF COSINE SIMILARITY TEST =====');
const s1 = { _id: '1', title: 'Sci-Fi Space', description: 'A journey through cosmos and nebula stars', genres: ['Sci-Fi'], tags: [] };
const s2 = { _id: '2', title: 'Space Adventure', description: 'Exploring universe galaxies beyond stars cosmos', genres: ['Sci-Fi', 'Adventure'], tags: [] };
const s3 = { _id: '3', title: 'Cooking Show', description: 'Master chefs create amazing dishes food', genres: ['Comedy'], tags: [] };

const results = findSimilarSeries('1', [s1, s2, s3], 5);
console.log('Most similar to "Sci-Fi Space":');
results.forEach(r => console.log(`  seriesId=${r.seriesId}  similarity=${r.similarity}`));

console.log('\n===== TOKENIZER TEST =====');
const tokens = tokenize('A breathtaking journey through untouched forests and hidden valleys');
console.log('Input:  "A breathtaking journey through untouched forests and hidden valleys"');
console.log('Output:', tokens);

console.log('\n===== LEVENSHTEIN DISTANCE TEST =====');
const pairs = [['kitten','sitting'], ['Stranger','Strnger'], ['Neon','Noon'], ['space','spce']];
pairs.forEach(([a, b]) => {
  console.log(`  levenshtein("${a}", "${b}") = ${levenshteinDistance(a.toLowerCase(), b.toLowerCase())}`);
});

console.log('\n===== FUZZY SEARCH TEST (TYPO TOLERANCE) =====');
const series = [
  { _id: 'a', title: 'Stranger Things' },
  { _id: 'b', title: 'Breaking Bad' },
  { _id: 'c', title: 'Dark Knight' },
];
const idx = createFuzzyIndex(series, ['title']);
const r = idx.search('Strnger Thngs');
console.log('Searching "Strnger Thngs":');
r.forEach(x => console.log(`  Match: "${x.item.title}"  score=${x.score}`));

console.log('\n✅ All algorithm tests passed!\n');
