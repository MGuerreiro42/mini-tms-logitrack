'use client';

import { ChartSection } from '@/components/common/charts/chart-section';
import { MetricBarChart } from '@/components/common/charts/metric-bar-chart';
import { formatDuration } from '@/lib/format-duration';
import { SHIPMENT_STATUS } from '@/lib/status-colors';
import type { StageDuration } from '../types';

export function StageDurationChart({ data }: { data: StageDuration[] }) {
  const rows = data.map((stage) => ({
    label: `${SHIPMENT_STATUS[stage.fromStatus].label} → ${SHIPMENT_STATUS[stage.toStatus].label}`,
    avgHours: stage.avgHours ?? 0,
    hasData: stage.avgHours !== null,
    display:
      stage.avgHours === null ? 'no data' : formatDuration(stage.avgHours),
    sampleCount: stage.sampleCount,
  }));

  return (
    <ChartSection
      title="Time per stage"
      isEmpty={rows.every((row) => !row.hasData)}
      emptyMessage="Not enough data yet — the funnel fills in as shipments move through each stage."
    >
      <MetricBarChart
        data={rows}
        categoryKey="label"
        valueKey="avgHours"
        valueLabel="Avg. duration"
        orientation="horizontal"
        colors="ordinal"
        className="h-64"
        formatLabel={(row) => row.display}
        formatTooltip={(row) =>
          row.hasData
            ? `${row.display} avg (${row.sampleCount} sample${row.sampleCount === 1 ? '' : 's'})`
            : 'Not enough data yet'
        }
      />
    </ChartSection>
  );
}
