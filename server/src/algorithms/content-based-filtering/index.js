/**
 * TF-IDF + Cosine Similarity Content-Based Recommendation Engine
 * ══════════════════════════════════════════════════════════════
 * 100% from scratch — zero external libraries.
 *
 * Concepts:
 *   1. Tokenization with stop-word removal
 *   2. TF  (Term Frequency)           = count(term, doc) / totalTerms(doc)
 *   3. IDF (Inverse Document Frequency) = ln(N / df(term))
 *   4. TF-IDF vector per document
 *   5. Cosine Similarity              = (A·B) / (||A|| × ||B||)
 */

// ─── Stop Words (common English words that carry no semantic meaning) ───
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'as', 'be', 'was', 'are',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'this',
  'that', 'these', 'those', 'i', 'me', 'my', 'we', 'our', 'you', 'your',
  'he', 'she', 'they', 'them', 'his', 'her', 'its', 'their', 'what',
  'which', 'who', 'whom', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'because', 'about', 'into', 'through', 'during', 'before',
  'after', 'above', 'below', 'between', 'out', 'off', 'over', 'under',
  'again', 'further', 'then', 'once', 'here', 'there', 'up', 'down',
]);

/**
 * Step 1: Tokenize text into meaningful terms.
 * - Lowercase conversion
 * - Remove punctuation
 * - Split on whitespace
 * - Remove stop words
 * - Remove very short tokens (< 2 chars)
 *
 * @param {string} text - Raw text input
 * @returns {string[]} Array of cleaned tokens
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')   // Strip punctuation
    .split(/\s+/)                     // Split on whitespace
    .filter(t => t.length >= 2 && !STOP_WORDS.has(t));
}

/**
 * Step 2: Compute Term Frequency (TF) for a single document.
 * TF(t, d) = (number of times term t appears in document d) / (total terms in d)
 *
 * @param {string[]} tokens - Tokenized document
 * @returns {Object} Map of term -> TF value
 */
function computeTF(tokens) {
  if (!tokens.length) return {};
  const counts = {};
  for (const t of tokens) {
    counts[t] = (counts[t] || 0) + 1;
  }
  const total = tokens.length;
  const tf = {};
  for (const [term, count] of Object.entries(counts)) {
    tf[term] = count / total;
  }
  return tf;
}

/**
 * Step 3: Compute Inverse Document Frequency (IDF) across a corpus.
 * IDF(t) = ln(N / df(t))
 * where N = total documents, df(t) = documents containing term t
 *
 * @param {string[][]} corpus - Array of tokenized documents
 * @returns {Object} Map of term -> IDF value
 */
function computeIDF(corpus) {
  const N = corpus.length;
  if (N === 0) return {};

  // df(t) = number of documents containing term t
  const df = {};
  for (const tokens of corpus) {
    const uniqueTerms = new Set(tokens);
    for (const term of uniqueTerms) {
      df[term] = (df[term] || 0) + 1;
    }
  }

  const idf = {};
  for (const [term, docFreq] of Object.entries(df)) {
    idf[term] = Math.log(N / docFreq);
  }
  return idf;
}

/**
 * Step 4: Build TF-IDF vector for one document.
 * TF-IDF(t, d) = TF(t, d) × IDF(t)
 *
 * @param {Object} tf - Term frequency map for this document
 * @param {Object} idf - Global IDF map
 * @returns {Object} Map of term -> TF-IDF weight
 */
function buildTFIDFVector(tf, idf) {
  const vector = {};
  for (const [term, tfVal] of Object.entries(tf)) {
    if (idf[term] !== undefined) {
      vector[term] = tfVal * idf[term];
    }
  }
  return vector;
}

/**
 * Step 5: Cosine Similarity between two sparse vectors.
 *
 *                   A · B              Σ(Ai × Bi)
 * cos(θ) = ─────────────────── = ─────────────────────
 *            ||A|| × ||B||       √Σ(Ai²) × √Σ(Bi²)
 *
 * @param {Object} vecA - Sparse vector A (term -> weight)
 * @param {Object} vecB - Sparse vector B (term -> weight)
 * @returns {number} Similarity score in [0, 1]
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  // Compute dot product (only for shared terms)
  for (const [term, weightA] of Object.entries(vecA)) {
    magnitudeA += weightA * weightA;
    if (vecB[term] !== undefined) {
      dotProduct += weightA * vecB[term];
    }
  }

  for (const weightB of Object.values(vecB)) {
    magnitudeB += weightB * weightB;
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Main Function: Find the most similar series to a target series.
 *
 * Process:
 *   1. Build a text corpus from series title + description + genres + tags
 *   2. Tokenize each document
 *   3. Compute global IDF across all documents
 *   4. Build TF-IDF vectors for each series
 *   5. Compute cosine similarity between target and every other series
 *   6. Return top N most similar
 *
 * @param {string} targetId - MongoDB _id of the target series
 * @param {Object[]} allSeries - Array of series documents (from DB)
 * @param {number} topN - Number of results to return
 * @returns {{ seriesId: string, similarity: number }[]} Sorted similarity results
 */
function findSimilarSeries(targetId, allSeries, topN = 5) {
  const targetIdStr = targetId.toString();

  // Step A: Build text corpus — one "document" per series
  const documents = allSeries.map(s => {
    const text = [
      s.title || '',
      s.description || '',
      ...(s.genres || []),
      ...(s.tags || []),
    ].join(' ');
    return { id: s._id.toString(), tokens: tokenize(text) };
  });

  // Step B: Compute global IDF
  const corpus = documents.map(d => d.tokens);
  const idf = computeIDF(corpus);

  // Step C: Build TF-IDF vectors for all series
  const vectors = {};
  for (const doc of documents) {
    const tf = computeTF(doc.tokens);
    vectors[doc.id] = buildTFIDFVector(tf, idf);
  }

  // Step D: Get the target vector
  const targetVector = vectors[targetIdStr];
  if (!targetVector || Object.keys(targetVector).length === 0) {
    return [];
  }

  // Step E: Compute cosine similarity with every other series
  const similarities = [];
  for (const doc of documents) {
    if (doc.id === targetIdStr) continue; // Skip self
    const sim = cosineSimilarity(targetVector, vectors[doc.id]);
    if (sim > 0) {
      similarities.push({ seriesId: doc.id, similarity: parseFloat(sim.toFixed(4)) });
    }
  }

  // Step F: Sort by similarity descending and return top N
  similarities.sort((a, b) => b.similarity - a.similarity);
  return similarities.slice(0, topN);
}

module.exports = {
  tokenize,
  computeTF,
  computeIDF,
  buildTFIDFVector,
  cosineSimilarity,
  findSimilarSeries,
};
