'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from 'recharts';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { SlaSummaryItem } from '../types';

// Recharts doesn't export this type from its root.
type RenderableText = string | number | boolean | null | undefined;

// Single series, so one hue: the x-axis already names each modality.
const chartConfig = {
  onTimeRate: {
    label: 'On-time rate',
    theme: { light: '#2a78d6', dark: '#3987e5' },
  },
} satisfies ChartConfig;

export function SlaSummaryChart({ data }: { data: SlaSummaryItem[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
        Not enough data yet — SLA adherence appears once a shipment is delivered
        in a modality with an SLA configured.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold">SLA adherence by modality</h2>
      <ChartContainer config={chartConfig} className="h-56 w-full">
        <BarChart data={data} margin={{ top: 16 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="modalityName" tickLine={false} axisLine={false} />
          <YAxis
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, _name, item) => {
                  const row = item.payload as SlaSummaryItem;
                  return `${Number(value).toFixed(0)}% on time (${row.onTimeCount}/${row.deliveredCount} delivered)`;
                }}
              />
            }
          />
          <Bar
            dataKey="onTimeRate"
            fill="var(--color-onTimeRate)"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          >
            <LabelList
              dataKey="onTimeRate"
              position="top"
              formatter={(value: RenderableText) =>
                `${Number(value).toFixed(0)}%`
              }
              className="fill-foreground text-xs"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
