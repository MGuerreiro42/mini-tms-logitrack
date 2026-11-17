export const AXIS_TICKS = 4;

// A round step so a shared axis reads 0 · 6 h · 12 h · 18 h, not 0 · 5.3 h …
// `integer` keeps every tick a whole number, for counts.
export function axisMax(max: number, integer = false): number {
  const raw = max / AXIS_TICKS;
  const magnitude =
    10 ** Math.max(integer ? 0 : -Infinity, Math.floor(Math.log10(raw)));
  const step =
    [1, 2, 2.5, 5, 10].find(
      (m) =>
        m * magnitude >= raw && (!integer || Number.isInteger(m * magnitude)),
    ) ?? 10;
  return step * magnitude * AXIS_TICKS;
}
