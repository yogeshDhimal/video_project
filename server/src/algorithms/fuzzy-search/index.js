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
  const threshold = options.threshold || 0.45;

  return {
    search(query) {
      if (!query || !String(query).trim()) {
        return items.map(item => ({ item, score: 0 }));
      }
      const clean = String(query).trim().toLowerCase();
      const queryWords = clean.split(/\s+/);

      const exactHits = [];
      const exactSet = new Set();
      const fuzzyHits = [];

      for (const item of items) {
        let bestScore = Infinity;
        let isExact = false;

        for (const key of keys) {
          const val = item[key];
          if (!val) continue;

          // Handle arrays (e.g., tags, genres)
          const values = Array.isArray(val) ? val : [val];

          for (const v of values) {
            const str = String(v).toLowerCase();

            // Priority 1: Exact substring match
            if (containsSubstring(str, clean)) {
              isExact = true;
              bestScore = 0;
              break;
            }

            // Priority 2: Aggregated word-level fuzzy matching
            // Find the best match for *each* query word, and average the distances.
            // This prevents a single random matched word from overpowering the whole result.
            let sumDist = 0;
            const targetWords = str.split(/\s+/);
            
            for (const qw of queryWords) {
              let bestWordDist = 1; // 1 represents a complete mismatch
              for (const tw of targetWords) {
                // Exact substring counts as a perfect word match
                if (tw.includes(qw) || qw.includes(tw)) {
                  bestWordDist = 0;
                  break;
                }
                const dist = normalizedDistance(qw, tw);
                if (dist < bestWordDist) {
                  bestWordDist = dist;
                }
              }
              sumDist += bestWordDist;
            }
            
            const avgDist = sumDist / queryWords.length;
            if (avgDist < bestScore) {
              bestScore = avgDist;
            }
          }
          if (isExact) break;
        }

        const id = item._id ? item._id.toString() : JSON.stringify(item);

        if (isExact) {
          exactHits.push({ item, score: 0 });
          exactSet.add(id);
        } else if (bestScore <= threshold) {
          fuzzyHits.push({ item, score: bestScore });
        }
      }

      // Sort fuzzy hits by score (lower = better match)
      fuzzyHits.sort((a, b) => a.score - b.score);

      // Combine: exact matches first, then fuzzy matches (avoiding duplicates)
      const combined = [...exactHits];
      for (const fh of fuzzyHits) {
        const id = fh.item._id ? fh.item._id.toString() : JSON.stringify(fh.item);
        if (!exactSet.has(id)) {
          combined.push(fh);
        }
      }

      return combined;
    },
  };
}

module.exports = { createFuzzyIndex, levenshteinDistance, normalizedDistance };
