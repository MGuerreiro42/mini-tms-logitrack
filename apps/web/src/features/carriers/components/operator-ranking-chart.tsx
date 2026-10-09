'use client';

import { ChartSection } from '@/components/common/charts/chart-section';
import { MetricBarChart } from '@/components/common/charts/metric-bar-chart';
import type { OperatorRankingItem } from '../types';

export function OperatorRankingChart({
  data,
}: {
  data: OperatorRankingItem[];
}) {
  return (
    <ChartSection
      title="Operator ranking"
      isEmpty={data.length === 0}
      emptyMessage="Not enough data yet — the ranking fills in once someone claims a shipment."
    >
      <MetricBarChart
        data={data}
        categoryKey="email"
        valueKey="totalOwned"
        valueLabel="Shipments owned"
        orientation="horizontal"
        colors="ordinal"
        categoryWidth={160}
        formatTooltip={(row) =>
          `${row.totalOwned} owned, ${row.delivered} delivered`
        }
      />
    </ChartSection>
  );
}
