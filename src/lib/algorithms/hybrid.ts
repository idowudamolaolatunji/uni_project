export function hybridScore(
  jaccard: number,
  cosine: number,
  alpha: number = 0.5
): number {
  return alpha * jaccard + (1 - alpha) * cosine;
}
