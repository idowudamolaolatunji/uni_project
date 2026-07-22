const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "but", "by", "for",
  "from", "has", "have", "had", "he", "in", "is", "it", "its", "of", "on",
  "or", "that", "the", "to", "was", "were", "will", "with", "this", "these",
  "those", "i", "you", "your", "we", "they", "them", "their", "our", "his",
  "her", "not", "no", "do", "does", "did", "can", "could", "should", "would",
  "about", "into", "over", "under", "than", "then", "so", "such", "if",
  "while", "when", "where", "which", "who", "whom", "what", "how", "why",
  "there", "here", "all", "any", "each", "more", "most", "some", "other",
  "also", "just", "only", "up", "down", "out", "off", "again", "further",
  "both", "few", "own", "same", "very", "one", "two", "as", "using", "used",
  "via",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0 && !STOP_WORDS.has(token));
}
