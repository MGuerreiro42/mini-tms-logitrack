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
import { formatDuration } from '@/lib/format-duration';
import { ordinalChartRamp } from '@/lib/ordinal-chart-ramp';
import { SHIPMENT_STATUS } from '@/lib/status-colors';
import type { StageDuration } from '../types';

const chartConfig = {
  avgHours: { label: 'Avg. duration' },
} satisfies ChartConfig;

export function StageDurationChart({ data }: { data: StageDuration[] }) {
  const rampId = useId().replace(/:/g, '');
  const ramp = ordinalChartRamp(data.length);
  const rows = data.map((stage, index) => ({
    label: `${SHIPMENT_STATUS[stage.fromStatus].label} → ${SHIPMENT_STATUS[stage.toStatus].label}`,
    avgHours: stage.avgHours ?? 0,
    hasData: stage.avgHours !== null,
    display:
      stage.avgHours === null ? 'no data' : formatDuration(stage.avgHours),
    sampleCount: stage.sampleCount,
    varName: `--ordinal-${rampId}-${index}`,
  }));

  if (rows.every((row) => !row.hasData)) {
    return (
      <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
        Not enough data yet — the funnel fills in as shipments move through each
        stage.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold">Time per stage</h2>
      {/* Per-row ordinal color as a CSS custom property, light + dark — same
          mechanism as shadcn's ChartStyle, hand-rolled here because these
          slots are dynamic (one per stage), not static named series. */}
      <style>
        {`
:root { ${rows.map((row, i) => `${row.varName}: ${ramp[i].light};`).join(' ')} }
.dark { ${rows.map((row, i) => `${row.varName}: ${ramp[i].dark};`).join(' ')} }
`}
      </style>
      <ChartContainer config={chartConfig} className="h-64 w-full">
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ left: 24, right: 32 }}
        >
          <CartesianGrid horizontal={false} />
          <XAxis type="number" tickLine={false} axisLine={false} hide />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            width={140}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(_value, _name, item) => {
                  const row = item.payload as (typeof rows)[number];
                  return row.hasData
                    ? `${row.display} avg (${row.sampleCount} sample${row.sampleCount === 1 ? '' : 's'})`
                    : 'Not enough data yet';
                }}
              />
            }
          />
          <Bar dataKey="avgHours" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {rows.map((row) => (
              <Cell key={row.label} fill={`var(${row.varName})`} />
            ))}
            <LabelList
              dataKey="display"
              position="right"
              className="fill-muted-foreground text-xs"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
