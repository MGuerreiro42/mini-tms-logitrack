// z for a two-sided 95 % interval.
const Z = 1.96;

// The Wilson score interval of k successes in n, in percent: honest at small n, where
// the normal approximation would spill past 0 or 100.
export function wilson(k: number, n: number): { low: number; high: number } {
  const p = k / n;
  const z2 = Z * Z;
  const centre = (p + z2 / (2 * n)) / (1 + z2 / n);
  const spread =
    (Z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
  return {
    low: Math.max(0, centre - spread) * 100,
    high: Math.min(1, centre + spread) * 100,
  };
}
