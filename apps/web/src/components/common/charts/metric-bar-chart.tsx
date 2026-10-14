'use client';

import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
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
  type BarEmphasis,
  barFills,
  buildBarChartConfig,
} from './bar-chart-config';

type MetricBarChartProps<T> = {
  data: T[];
  categoryKey: keyof T & string;
  valueKey: keyof T & string;
  valueLabel: string;
  orientation: 'horizontal' | 'vertical';
  emphasis?: BarEmphasis;
  formatLabel?: (row: T) => string;
  formatTooltip: (row: T) => ReactNode;
  valueDomain?: [number, number];
  formatTick?: (value: number) => string;
  categoryWidth?: number;
  target?: { value: number; label: string };
  className?: string;
};

const LABEL_KEY = 'barLabel';

export function MetricBarChart<T extends object>({
  data,
  categoryKey,
  valueKey,
  valueLabel,
  orientation,
  emphasis = 'all',
  formatLabel,
  formatTooltip,
  valueDomain,
  formatTick,
  categoryWidth = 140,
  target,
  className,
}: MetricBarChartProps<T>) {
  const horizontal = orientation === 'horizontal';
  // Recharts types dataKey against the row type, which a generic T can't satisfy.
  const categoryDataKey: string = categoryKey;
  const valueDataKey: string = valueKey;
  const config = buildBarChartConfig(valueKey, valueLabel);
  const rows = data.map((row) => ({
    ...row,
    [LABEL_KEY]: formatLabel ? formatLabel(row) : row[valueKey],
  }));
  const fills = barFills(
    data.map((row) => Number(row[valueKey])),
    emphasis,
  );

  return (
    <ChartContainer config={config} className={cn('h-56 w-full', className)}>
      <BarChart
        data={rows}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={
          horizontal
            ? { left: 24, right: 32, top: target ? 20 : 0 }
            : { top: 16, right: target ? 72 : 0 }
        }
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
        {target && (
          <ReferenceLine
            {...(horizontal ? { x: target.value } : { y: target.value })}
            stroke="var(--foreground)"
            strokeWidth={1}
            ifOverflow="extendDomain"
            label={{
              value: target.label,
              position: horizontal ? 'top' : 'right',
              className: 'fill-foreground text-xs font-semibold',
            }}
          />
        )}
        <Bar
          dataKey={valueDataKey}
          fill={`var(--color-${valueKey})`}
          radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
          maxBarSize={horizontal ? 24 : 48}
        >
          {rows.map((row, index) => (
            <Cell key={String(row[categoryKey])} fill={fills[index]} />
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
