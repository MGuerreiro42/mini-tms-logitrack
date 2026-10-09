import type { ChartConfig } from '@/components/ui/chart';
import { ordinalChartRamp } from '@/lib/ordinal-chart-ramp';

export type BarColors = 'ordinal' | { light: string; dark: string };

export const rowColorKey = (index: number) => `row${index}`;

// Colors go through the config so shadcn's ChartStyle emits the CSS variables per theme.
export function buildBarChartConfig(
  valueKey: string,
  valueLabel: string,
  colors: BarColors,
  rowCount: number,
): ChartConfig {
  if (colors !== 'ordinal') {
    return { [valueKey]: { label: valueLabel, theme: colors } };
  }

  const rows = ordinalChartRamp(rowCount).map((step, index) => [
    rowColorKey(index),
    { label: valueLabel, theme: step },
  ]);
  return { [valueKey]: { label: valueLabel }, ...Object.fromEntries(rows) };
}
