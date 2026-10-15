'use client';

import { MetricBarChart } from '@/components/common/charts/metric-bar-chart';
import { Panel } from '@/components/common/panel';
import type { SlaSummaryItem } from '../types';

const percent = (value: number) => `${value.toFixed(0)}%`;

const SLA_TARGET = 90;

export function SlaSummaryChart({ data }: { data: SlaSummaryItem[] }) {
  return (
    <Panel
      title="SLA adherence by modality"
      isEmpty={data.length === 0}
      emptyMessage="Not enough data yet. SLA adherence appears once a shipment is delivered in a modality with an SLA configured."
    >
      <MetricBarChart
        data={data}
        categoryKey="modalityName"
        valueKey="onTimeRate"
        valueLabel="On-time rate"
        orientation="vertical"
        valueDomain={[0, 100]}
        formatTick={percent}
        target={{ value: SLA_TARGET, label: `Target ${percent(SLA_TARGET)}` }}
        formatLabel={(row) => percent(row.onTimeRate)}
        formatTooltip={(row) =>
          `${percent(row.onTimeRate)} on time (${row.onTimeCount}/${row.deliveredCount} delivered)`
        }
      />
    </Panel>
  );
}
