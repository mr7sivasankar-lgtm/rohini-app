export const getLevenshteinDistance = (a, b) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[a.length][b.length];
};

export const isFuzzyMatch = (query, text) => {
  if (!text || !query) return false;
  query = query.toLowerCase().trim();
  text = text.toLowerCase();
  
  // Exact substring match
  if (text.includes(query)) return true;
  
  // Split into words for more granular matching
  const queryWords = query.split(/\s+/);
  const textWords = text.split(/[\s,.-]+/);
  
  // Every word in the search query must roughly match some word in the target text
  return queryWords.every(qWord => {
    // For very short words, require exact substring match to avoid false positives
    if (qWord.length <= 2) return text.includes(qWord);
    
    // For longer words, allow typos
    return textWords.some(tWord => {
      // If the word contains the query piece, it's a match
      if (tWord.includes(qWord)) return true;
      
      const dist = getLevenshteinDistance(qWord, tWord);
      // Allow 1 typo for 3-5 letter words, 2 typos for 6+ letter words
      const allowedTypos = qWord.length > 5 ? 2 : 1;
      
      return dist <= allowedTypos;
    });
  });
};
