'use client';

import { useId } from 'react';
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
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { ordinalChartRamp } from '@/lib/ordinal-chart-ramp';
import type { OperatorRankingItem } from '../types';

const chartConfig = {
  totalOwned: { label: 'Shipments owned' },
} satisfies ChartConfig;

export function OperatorRankingChart({
  data,
}: {
  data: OperatorRankingItem[];
}) {
  const rampId = useId().replace(/:/g, '');

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
        Not enough data yet — the ranking fills in once someone claims a
        shipment.
      </div>
    );
  }

  // Rank order carries meaning here (1st vs. 2nd place), so this is an
  // ordinal ramp, not a flat categorical color — same reasoning as the
  // stage-duration funnel.
  const ramp = ordinalChartRamp(data.length);
  const rows = data.map((operator, index) => ({
    ...operator,
    varName: `--ordinal-${rampId}-${index}`,
  }));

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold">Operator ranking</h2>
      <style>
        {`
:root { ${rows.map((row, i) => `${row.varName}: ${ramp[i].light};`).join(' ')} }
.dark { ${rows.map((row, i) => `${row.varName}: ${ramp[i].dark};`).join(' ')} }
`}
      </style>
      <ChartContainer config={chartConfig} className="h-56 w-full">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ left: 24, right: 32 }}
        >
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} hide />
          <YAxis
            type="category"
            dataKey="email"
            tickLine={false}
            axisLine={false}
            width={160}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, _name, item) => {
                  const row = item.payload as (typeof rows)[number];
                  return `${value} owned, ${row.delivered} delivered`;
                }}
              />
            }
          />
          <Bar dataKey="totalOwned" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {rows.map((row) => (
              <Cell key={row.carrierUserId} fill={`var(${row.varName})`} />
            ))}
            <LabelList
              dataKey="totalOwned"
              position="right"
              className="fill-muted-foreground text-xs"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
