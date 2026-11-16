'use client';

import { StatusDistribution } from '@/components/common/charts/status-distribution';
import { EmptyState } from '@/components/common/feedback-state';
import { PageHeader } from '@/components/common/page-header';
import { QueryState } from '@/components/common/query-state';
import { StatTile } from '@/components/common/stat-tile';
import { WindowSelector } from '@/components/common/window-selector';
import { useStatsWindow, windowLabel } from '@/hooks/use-stats-window';
import { formatDuration } from '@/lib/format-duration';
import { cn } from '@/lib/utils';
import { useCarrierPerformance } from '../hooks/use-carrier-performance';
import { useOperatorRanking } from '../hooks/use-operator-ranking';
import type {
  CarrierPerformance as CarrierPerformanceData,
  OperatorRankingItem,
} from '../types';
import { OperatorRankingChart } from './operator-ranking-chart';
import { StageDurationChart } from './stage-duration-chart';

export function CarrierPerformance() {
  // One reader of the window per page: the selector and the queries share it.
  const [statsWindow, setStatsWindow] = useStatsWindow();
  const query = useCarrierPerformance(statsWindow);
  const operatorRanking = useOperatorRanking(statsWindow);
  const loadingNext =
    query.isPlaceholderData || operatorRanking.isPlaceholderData;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Performance"
        description="How your company's shipments are performing."
        action={
          <WindowSelector value={statsWindow} onChange={setStatsWindow} />
        }
      />
      <QueryState query={query} errorMessage="Couldn't load performance data.">
        {(data) => (
          // The previous window's numbers stay, dimmed, until the new ones arrive.
          <div
            aria-busy={loadingNext}
            className={cn('transition-opacity', loadingNext && 'opacity-60')}
          >
            {data.totalShipments === 0 ? (
              <EmptyState
                title={`No shipments created in the last ${windowLabel(statsWindow)}`}
                description="Metrics appear once shipments start moving through your queue."
              />
            ) : (
              <CarrierPerformanceView
                data={data}
                operatorRanking={operatorRanking.data}
              />
            )}
          </div>
        )}
      </QueryState>
    </div>
  );
}

function CarrierPerformanceView({
  data,
  operatorRanking,
}: {
  data: CarrierPerformanceData;
  operatorRanking?: OperatorRankingItem[];
}) {
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
        {operatorRanking && <OperatorRankingChart data={operatorRanking} />}
      </div>
    </div>
  );
}
