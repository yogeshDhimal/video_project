const Fuse = require('fuse.js');

/**
 * Typo-tolerant search index (Fuse.js).
 */
function createFuzzyIndex(items, keys) {
  const fuse = new Fuse(items, {
    keys,
    includeScore: true,
    threshold: 0.45,
    ignoreLocation: true,
    minMatchCharLength: 1,
  });
  return {
    search(query) {
      if (!query || !String(query).trim()) return items.map((item) => ({ item, score: 0 }));
      return fuse.search(String(query).trim()).map((r) => ({
        item: r.item,
        score: r.score ?? 0,
      }));
    },
  };
}

module.exports = { createFuzzyIndex };
