const { calculatePearsonCorrelation, predictRating } = require('./src/algorithms/collaborative-filtering/pearson');

const matrix = {
  'userB': { 'ep1': 5, 'ep2': 5 },
  'userA': { 'ep1': 5, 'ep2': 5, 'ep3': 5 },
};

const similarity = calculatePearsonCorrelation(matrix['userB'], matrix['userA']);
console.log('Similarity (B against A):', similarity);

const similarUsersData = [
  { userId: 'userA', similarity, ratings: matrix['userA'] }
];

const pred = predictRating(matrix['userB'], 'ep3', similarUsersData);
console.log('Prediction for User B on ep3:', pred);
