/**
 * Pure Javascript mathematical implementation of the Pearson Correlation Coefficient.
 * Used for User-to-User Collaborative Filtering.
 */

function calculatePearsonCorrelation(ratingsA, ratingsB) {
  const sharedItems = [];
  for (const item in ratingsA) {
    if (ratingsB[item] !== undefined) {
      sharedItems.push(item);
    }
  }

  // If no overlapping items, we cannot establish a mathematical relationship
  if (sharedItems.length === 0) return 0;

  // Calculate the mean rating for each user (to determine if they are a harsh or generous rater)
  let sumA = 0;
  let sumB = 0;
  const keysA = Object.keys(ratingsA);
  const keysB = Object.keys(ratingsB);
  
  for (const item of keysA) sumA += ratingsA[item];
  for (const item of keysB) sumB += ratingsB[item];
  
  const meanA = sumA / keysA.length;
  const meanB = sumB / keysB.length;

  // Calculate Pearson numerator and denominators
  let covariance = 0;
  let stdDevSquareA = 0;
  let stdDevSquareB = 0;

  for (const item of sharedItems) {
    const diffA = ratingsA[item] - meanA;
    const diffB = ratingsB[item] - meanB;
    
    covariance += diffA * diffB;
    stdDevSquareA += diffA * diffA;
    stdDevSquareB += diffB * diffB;
  }

  const denominator = Math.sqrt(stdDevSquareA) * Math.sqrt(stdDevSquareB);
  
  // Prevent division by zero if ratings are perfectly uniform
  if (denominator === 0) return 0;

  // Result bounds between -1.0 (perfectly opposite) and 1.0 (perfectly matched)
  return covariance / denominator;
}

/**
 * Predicts the score a user will give to an unseen episode using
 * the weighted average of deviations from similar users.
 */
function predictRating(targetRatings, targetEpisodeId, similarUsersData) {
  const targetItemKeys = Object.keys(targetRatings);
  
  // Determine baseline mean rating for our target user. 
  // If they've never rated anything, assume a neutral baseline of 3 (on 1-5 scale).
  let meanTarget = 3; 
  if (targetItemKeys.length > 0) {
    let sumTarget = 0;
    for (const key of targetItemKeys) sumTarget += targetRatings[key];
    meanTarget = sumTarget / targetItemKeys.length;
  }

  let weightedDeviationSum = 0;
  let absoluteSimilaritySum = 0;

  for (const user of similarUsersData) {
    // We only use data from users who actually watched/rated the target episode
    if (user.ratings[targetEpisodeId] === undefined) continue;
    
    // Pearson algorithm heavily relies on users who have positive correlation
    if (user.similarity <= 0) continue;

    const otherItemKeys = Object.keys(user.ratings);
    let sumOther = 0;
    for (const key of otherItemKeys) sumOther += user.ratings[key];
    const meanOther = sumOther / otherItemKeys.length;

    const otherDeviation = user.ratings[targetEpisodeId] - meanOther;

    weightedDeviationSum += user.similarity * otherDeviation;
    absoluteSimilaritySum += Math.abs(user.similarity);
  }

  // If no similar users have rated this, we return 0 so it naturally sorts lower
  if (absoluteSimilaritySum === 0) return 0;

  // Final predicted rating
  return meanTarget + (weightedDeviationSum / absoluteSimilaritySum);
}

module.exports = {
  calculatePearsonCorrelation,
  predictRating
};
