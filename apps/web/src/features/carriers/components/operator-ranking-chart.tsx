'use client';

import { MetricBarChart } from '@/components/common/charts/metric-bar-chart';
import { Panel } from '@/components/common/panel';
import type { OperatorRankingItem } from '../types';

export function OperatorRankingChart({
  data,
}: {
  data: OperatorRankingItem[];
}) {
  return (
    <Panel
      title="Operator ranking"
      description="Shipments owned"
      isEmpty={data.length === 0}
      emptyMessage="Not enough data yet. The ranking fills in once someone claims a shipment."
    >
      <MetricBarChart
        data={data}
        categoryKey="email"
        valueKey="totalOwned"
        valueLabel="Shipments owned"
        orientation="horizontal"
        emphasis="max"
        categoryWidth={160}
        formatTooltip={(row) =>
          `${row.totalOwned} owned, ${row.delivered} delivered`
        }
      />
    </Panel>
  );
}
