/**
 * Custom Fuzzy Search Engine — Levenshtein Edit Distance
 * ══════════════════════════════════════════════════════
 * 100% from scratch — replaces Fuse.js library entirely.
 *
 * Algorithm: Levenshtein Distance (Dynamic Programming)
 * Measures the minimum single-character edits (insertions, deletions, substitutions)
 * required to transform one string into another.
 *
 * Example: levenshtein("kitten", "sitting") = 3
 *   kitten → sitten (substitution)
 *   sitten → sittin (substitution)
 *   sittin → sitting (insertion)
 */

/**
 * Compute the Levenshtein Edit Distance between two strings.
 * Uses a full Dynamic Programming matrix approach.
 *
 * Time Complexity:  O(m × n)
 * Space Complexity: O(m × n)  (could be optimized to O(min(m,n)) but kept for clarity)
 *
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Minimum edit distance
 */
function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;

  // Edge cases
  if (m === 0) return n;
  if (n === 0) return m;

  // Build DP matrix: dp[i][j] = edit distance between a[0..i-1] and b[0..j-1]
  const dp = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = new Array(n + 1);
    dp[i][0] = i; // Deleting all chars from a
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j; // Inserting all chars into empty string
  }

  // Fill the matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // Deletion
        dp[i][j - 1] + 1,      // Insertion
        dp[i - 1][j - 1] + cost // Substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Compute a normalized similarity score from Levenshtein distance.
 * Score is in [0, 1] where 0 = identical, 1 = completely different.
 *
 * @param {string} a
 * @param {string} b
 * @returns {number} Normalized score (lower = more similar)
 */
function normalizedDistance(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 0;
  return levenshteinDistance(a, b) / maxLen;
}

/**
 * Check if query is a substring of target (case-insensitive).
 * This provides exact-match priority before fuzzy matching.
 *
 * @param {string} target
 * @param {string} query
 * @returns {boolean}
 */
function containsSubstring(target, query) {
  return target.toLowerCase().includes(query.toLowerCase());
}

/**
 * Create a fuzzy search index over a collection of items.
 * Drop-in replacement for the old Fuse.js-based createFuzzyIndex.
 *
 * @param {Object[]} items - Array of objects to search
 * @param {string[]} keys - Object keys to search within
 * @param {Object} options - Configuration
 * @param {number} options.threshold - Max normalized distance to consider a match (default: 0.45)
 * @returns {{ search: (query: string) => { item: Object, score: number }[] }}
 */
function createFuzzyIndex(items, keys, options = {}) {
  const threshold = options.threshold || 0.2;

  // Field Weighting: Lower penalty = Higher priority
  const fieldPenalties = {
    title: 0,
    tags: 5,
    genres: 5,
    description: 10,
  };

  return {
    search(query) {
      if (!query || !String(query).trim()) {
        return items
          .map(item => ({ item, score: 0 }))
          .sort((a, b) => (b.item.trendingScore || 0) - (a.item.trendingScore || 0));
      }
      const clean = String(query).trim().toLowerCase();
      const queryWords = clean.split(/\s+/).filter(w => w.length > 0);

      const results = [];

      for (const item of items) {
        let bestFinalTier = Infinity;
        let bestFuzzyScore = Infinity;

        for (const key of keys) {
          const val = item[key];
          if (!val) continue;

          const penalty = fieldPenalties[key] || 0;
          const values = Array.isArray(val) ? val : [val];

          for (const v of values) {
            const str = String(v).toLowerCase();
            const words = str.split(/\s+/).filter(w => w.length > 0);
            let currentBaseTier = -1;
            let currentFuzzyScore = 1;

            // Tier 0: Exact Match
            if (str === clean) {
              currentBaseTier = 0;
              currentFuzzyScore = 0;
            } 
            // Tier 1: Starts With (Prefix)
            else if (str.startsWith(clean)) {
              currentBaseTier = 1;
              currentFuzzyScore = 0;
            }
            // Tier 2: Word-Level Prefix
            else if (words.some(w => w.startsWith(clean))) {
              currentBaseTier = 2;
              currentFuzzyScore = 0;
            }
            // Tier 3: Fuzzy Logic
            else {
              let sumDist = 0;
              for (const qw of queryWords) {
                let minWordDist = 1;
                for (const tw of words) {
                  if (tw === qw) {
                    minWordDist = 0;
                    break;
                  }
                  const dist = normalizedDistance(qw, tw);
                  if (dist < minWordDist) minWordDist = dist;
                }
                sumDist += minWordDist;
              }
              const avgDist = sumDist / queryWords.length;
              if (avgDist <= threshold) {
                currentBaseTier = 3;
                currentFuzzyScore = avgDist;
              }
            }

            if (currentBaseTier !== -1) {
              const finalTier = currentBaseTier + penalty;
              if (finalTier < bestFinalTier || (finalTier === bestFinalTier && currentFuzzyScore < bestFuzzyScore)) {
                bestFinalTier = finalTier;
                bestFuzzyScore = currentFuzzyScore;
              }
            }
          }
          if (bestFinalTier === 0) break;
        }

        if (bestFinalTier !== Infinity) {
          results.push({
            item,
            tier: bestFinalTier,
            score: bestFuzzyScore,
            trending: item.trendingScore || 0
          });
        }
      }



      // Professional Sorting:
      // 1. Tier (0=Exact, 1=Prefix, 2=Contains, 3=Fuzzy)
      // 2. Score (Lower is better for fuzzy)
      // 3. Trending Score (Higher is better for ties)
      return results
        .sort((a, b) => {
          if (a.tier !== b.tier) return a.tier - b.tier;
          if (a.score !== b.score) return a.score - b.score;
          return b.trending - a.trending;
        })
        .map(({ item, score }) => ({ item, score }));
    },

  };
}

module.exports = { createFuzzyIndex, levenshteinDistance, normalizedDistance };
