'use client';

import { ChartSection } from '@/components/common/charts/chart-section';
import { MetricBarChart } from '@/components/common/charts/metric-bar-chart';
import type { SlaSummaryItem } from '../types';

const percent = (value: number) => `${value.toFixed(0)}%`;

export function SlaSummaryChart({ data }: { data: SlaSummaryItem[] }) {
  return (
    <ChartSection
      title="SLA adherence by modality"
      isEmpty={data.length === 0}
      emptyMessage="Not enough data yet — SLA adherence appears once a shipment is delivered in a modality with an SLA configured."
    >
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
    </ChartSection>
  );
}
