import type { ChartConfig } from '@/components/ui/chart';

export type BarEmphasis = 'all' | 'max';

export const ACCENT_FILL = 'var(--chart-1)';
export const SOFT_FILL = 'var(--chart-2)';

export function buildBarChartConfig(
  valueKey: string,
  valueLabel: string,
): ChartConfig {
  return { [valueKey]: { label: valueLabel, color: ACCENT_FILL } };
}

export function barFills(values: number[], emphasis: BarEmphasis): string[] {
  if (emphasis === 'all') return values.map(() => ACCENT_FILL);
  const top = values.indexOf(Math.max(...values));
  return values.map((_, index) => (index === top ? ACCENT_FILL : SOFT_FILL));
}
