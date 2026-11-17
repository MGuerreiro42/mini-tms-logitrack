export const AXIS_TICKS = 4;

// A round step so a shared axis reads 0 · 6 h · 12 h · 18 h, not 0 · 5.3 h …
export function axisMax(max: number): number {
  const raw = max / AXIS_TICKS;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= raw) ?? 10;
  return step * magnitude * AXIS_TICKS;
}
