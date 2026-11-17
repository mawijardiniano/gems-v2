
export function normalizeText(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}


export function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1, 
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}


export function levenshteinSimilarity(a, b) {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(na, nb) / maxLen;
}


export function jaccardSimilarity(a, b) {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na && !nb) return 1;
  if (!na || !nb) return 0;

  const setA = new Set(na.split(" ").filter(Boolean));
  const setB = new Set(nb.split(" ").filter(Boolean));

  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 1 : intersection / union;
}


export function exactSimilarity(a, b) {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na && !nb) return 1;
  return na === nb ? 1 : 0;
}


export function similarityScore(a, b) {
  if (!a || !b) return 0;
  return Math.max(
    exactSimilarity(a, b),
    levenshteinSimilarity(a, b),
    jaccardSimilarity(a, b),
  );
}


export function findDuplicates(input, existing, threshold = 0.7) {
  if (!input || !Array.isArray(existing) || existing.length === 0) return [];

  const results = [];

  for (const item of existing) {
    let existingText = "";
    if (item && typeof item === "object") {
      if (item.gender_issue && typeof item.gender_issue === "object" && "value" in item.gender_issue) {
        existingText = item.gender_issue.value || "";
      } else if (typeof item.gender_issue === "string") {
        existingText = item.gender_issue;
      }
    } else if (typeof item === "string") {
      existingText = item;
    }

    if (!existingText) continue;

    const score = similarityScore(input, existingText);
    if (score >= threshold) {
      results.push({
        projectId: item?._id || item?.id || null,
        gender_issue: existingText,
        similarity: Math.round(score * 100) / 100,
      });
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}