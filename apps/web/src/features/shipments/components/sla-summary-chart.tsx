'use client';

import { MetricBarChart } from '@/components/common/charts/metric-bar-chart';
import { Panel } from '@/components/common/panel';
import type { SlaSummaryItem } from '../types';

const percent = (value: number) => `${value.toFixed(0)}%`;

export function SlaSummaryChart({ data }: { data: SlaSummaryItem[] }) {
  return (
    <Panel title="SLA adherence by modality">
      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Not enough data yet. SLA adherence appears once a shipment is
          delivered in a modality with an SLA configured.
        </p>
      ) : (
        <MetricBarChart
          data={data}
          categoryKey="modalityName"
          valueKey="onTimeRate"
          valueLabel="On-time rate"
          orientation="vertical"
          valueDomain={[0, 100]}
          formatTick={percent}
          formatLabel={(row) => percent(row.onTimeRate)}
          formatTooltip={(row) =>
            `${percent(row.onTimeRate)} on time (${row.onTimeCount}/${row.deliveredCount} delivered)`
          }
        />
      )}
    </Panel>
  );
}
