export function computeTermFrequencies(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  const totalTokens = tokens.length || 1;
  const frequencies = new Map<string, number>();
  for (const [term, count] of counts) {
    frequencies.set(term, count / totalTokens);
  }
  return frequencies;
}

export function computeInverseDocumentFrequencies(
  documents: string[][]
): Map<string, number> {
  const documentCount = documents.length;
  const documentFrequency = new Map<string, number>();

  for (const tokens of documents) {
    for (const term of new Set(tokens)) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
  }

  const idf = new Map<string, number>();
  for (const [term, frequency] of documentFrequency) {
    idf.set(term, Math.log((documentCount + 1) / (frequency + 1)) + 1);
  }
  return idf;
}

export function computeTfidfVector(
  tokens: string[],
  idf: Map<string, number>
): Map<string, number> {
  const termFrequencies = computeTermFrequencies(tokens);
  const vector = new Map<string, number>();

  for (const [term, frequency] of termFrequencies) {
    const termIdf = idf.get(term);
    if (termIdf !== undefined) {
      vector.set(term, frequency * termIdf);
    }
  }
  return vector;
}
