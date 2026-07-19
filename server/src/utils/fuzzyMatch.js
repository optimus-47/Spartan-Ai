function normalize(str) {
  return str.toLowerCase().trim().replace(/[^a-z0-9 ]/g, "");
}

// Returns the best-matching food from the catalog, or null if nothing is close enough
function findBestFoodMatch(detectedName, foodCatalog) {
  const target = normalize(detectedName);

  let bestMatch = null;
  let bestScore = 0;

  for (const food of foodCatalog) {
    const candidate = normalize(food.name);

    let score = 0;
    if (candidate === target) {
      score = 1;
    } else if (candidate.includes(target) || target.includes(candidate)) {
      score = 0.7;
    } else {
      const targetWords = target.split(" ");
      const candidateWords = candidate.split(" ");
      const overlap = targetWords.filter((w) => candidateWords.includes(w)).length;
      score = overlap / Math.max(targetWords.length, candidateWords.length);
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = food;
    }
  }

  // require at least a moderate overlap before trusting the match
  return bestScore >= 0.5 ? bestMatch : null;
}

module.exports = { findBestFoodMatch };