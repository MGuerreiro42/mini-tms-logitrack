'use client';

import { MetricBarChart } from '@/components/common/charts/metric-bar-chart';
import { Panel } from '@/components/common/panel';
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
    <Panel
      title="Time per stage"
      description="Average, happy path"
      isEmpty={rows.every((row) => !row.hasData)}
      emptyMessage="Not enough data yet. The funnel fills in as shipments move through each stage."
    >
      <MetricBarChart
        data={rows}
        categoryKey="label"
        valueKey="avgHours"
        valueLabel="Avg. duration"
        orientation="horizontal"
        emphasis="max"
        className="h-64"
        formatLabel={(row) => row.display}
        formatTooltip={(row) =>
          row.hasData
            ? `${row.display} avg (${row.sampleCount} sample${row.sampleCount === 1 ? '' : 's'})`
            : 'Not enough data yet'
        }
      />
    </Panel>
  );
}
