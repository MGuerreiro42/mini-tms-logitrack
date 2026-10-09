'use client';

import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { cn } from '@/lib/utils';
import {
  type BarColors,
  buildBarChartConfig,
  rowColorKey,
} from './bar-chart-config';

type MetricBarChartProps<T> = {
  data: T[];
  categoryKey: keyof T & string;
  valueKey: keyof T & string;
  valueLabel: string;
  /** `horizontal`: ranked bars growing right; `vertical`: columns. */
  orientation: 'horizontal' | 'vertical';
  colors: BarColors;
  formatLabel?: (row: T) => string;
  formatTooltip: (row: T) => ReactNode;
  valueDomain?: [number, number];
  formatTick?: (value: number) => string;
  categoryWidth?: number;
  className?: string;
};

const LABEL_KEY = 'barLabel';

export function MetricBarChart<T extends object>({
  data,
  categoryKey,
  valueKey,
  valueLabel,
  orientation,
  colors,
  formatLabel,
  formatTooltip,
  valueDomain,
  formatTick,
  categoryWidth = 140,
  className,
}: MetricBarChartProps<T>) {
  const horizontal = orientation === 'horizontal';
  // Recharts types dataKey against the row type, which a generic T can't satisfy.
  const categoryDataKey: string = categoryKey;
  const valueDataKey: string = valueKey;
  const config = buildBarChartConfig(valueKey, valueLabel, colors, data.length);
  const rows = data.map((row) => ({
    ...row,
    [LABEL_KEY]: formatLabel ? formatLabel(row) : row[valueKey],
  }));

  return (
    <ChartContainer config={config} className={cn('h-56 w-full', className)}>
      <BarChart
        data={rows}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={horizontal ? { left: 24, right: 32 } : { top: 16 }}
      >
        <CartesianGrid horizontal={!horizontal} vertical={horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tickLine={false} axisLine={false} hide />
            <YAxis
              type="category"
              dataKey={categoryDataKey}
              tickLine={false}
              axisLine={false}
              width={categoryWidth}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={categoryDataKey}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              domain={valueDomain}
              tickFormatter={formatTick}
            />
          </>
        )}
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(_value, _name, item) =>
                formatTooltip(item.payload as T)
              }
            />
          }
        />
        <Bar
          dataKey={valueDataKey}
          fill={`var(--color-${valueKey})`}
          radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
          maxBarSize={horizontal ? 24 : 48}
        >
          {colors === 'ordinal' &&
            rows.map((_row, index) => (
              <Cell
                key={rowColorKey(index)}
                fill={`var(--color-${rowColorKey(index)})`}
              />
            ))}
          <LabelList
            dataKey={LABEL_KEY}
            position={horizontal ? 'right' : 'top'}
            className={cn(
              'text-xs',
              horizontal ? 'fill-muted-foreground' : 'fill-foreground',
            )}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
