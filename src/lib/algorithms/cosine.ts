function magnitude(vector: Map<string, number>): number {
  let sumOfSquares = 0;
  for (const weight of vector.values()) {
    sumOfSquares += weight * weight;
  }
  return Math.sqrt(sumOfSquares);
}

export function cosineSimilarity(
  vectorA: Map<string, number>,
  vectorB: Map<string, number>
): number {
  const [smaller, larger] =
    vectorA.size <= vectorB.size ? [vectorA, vectorB] : [vectorB, vectorA];

  let dotProduct = 0;
  for (const [term, weight] of smaller) {
    const otherWeight = larger.get(term);
    if (otherWeight !== undefined) {
      dotProduct += weight * otherWeight;
    }
  }

  const magnitudeA = magnitude(vectorA);
  const magnitudeB = magnitude(vectorB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}
