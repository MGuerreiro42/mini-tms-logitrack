'use client';

import Link from 'next/link';
import { StatusDistribution } from '@/components/common/charts/status-distribution';
import { EmptyState } from '@/components/common/feedback-state';
import { QueryState } from '@/components/common/query-state';
import { StatTile } from '@/components/common/stat-tile';
import { Button } from '@/components/ui/button';
import { formatDuration } from '@/lib/format-duration';
import { useCarrierPerformance } from '../hooks/use-carrier-performance';
import { useOperatorRanking } from '../hooks/use-operator-ranking';
import type { CarrierPerformance as CarrierPerformanceData } from '../types';
import { OperatorRankingChart } from './operator-ranking-chart';
import { StageDurationChart } from './stage-duration-chart';

export function CarrierPerformance() {
  const query = useCarrierPerformance();

  return (
    <QueryState query={query} errorMessage="Couldn't load performance data.">
      {(data) => <CarrierPerformanceView data={data} />}
    </QueryState>
  );
}

function CarrierPerformanceView({ data }: { data: CarrierPerformanceData }) {
  const operatorRanking = useOperatorRanking();

  if (data.totalShipments === 0) {
    return (
      <EmptyState
        title="No performance data yet"
        description="Metrics appear once shipments start moving through your queue."
        steps={[
          {
            label: 'Claim a shipment from the queue',
            action: (
              <Button asChild variant="link" className="h-auto p-0">
                <Link href="/carrier/queue">Open the queue</Link>
              </Button>
            ),
          },
        ]}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Total shipments" value={data.totalShipments} />
        <StatTile
          label="Avg. time between updates"
          value={
            data.avgHoursBetweenEvents === null
              ? '—'
              : formatDuration(data.avgHoursBetweenEvents)
          }
        />
        <StatTile
          label="Failed delivery rate"
          value={`${data.failedDeliveryRate.toFixed(1)}%`}
        />
        <StatTile
          label="Returned rate"
          value={`${data.returnedRate.toFixed(1)}%`}
        />
      </div>
      {data.avgHoursBetweenEvents === null && (
        <p className="text-[13px] text-muted-foreground">
          Avg. time between updates needs a shipment with at least two tracking
          events.
        </p>
      )}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-5">
          <StatusDistribution counts={data.shipmentCountsByStatus} />
          <StageDurationChart data={data.stageDurations} />
        </div>
        {operatorRanking.data && (
          <OperatorRankingChart data={operatorRanking.data} />
        )}
      </div>
    </div>
  );
}
