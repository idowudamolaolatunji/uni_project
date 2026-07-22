export function jaccardSimilarity(setA: string[], setB: string[]): number {
  const a = new Set(setA);
  const b = new Set(setB);

  if (a.size === 0 && b.size === 0) {
    return 0;
  }

  let intersectionSize = 0;
  for (const value of a) {
    if (b.has(value)) {
      intersectionSize++;
    }
  }

  const unionSize = a.size + b.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}
