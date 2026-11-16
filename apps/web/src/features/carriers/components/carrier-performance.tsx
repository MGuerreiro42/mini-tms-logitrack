'use client';

import { EmptyState } from '@/components/common/feedback-state';
import {
  LiveIndicator,
  OfflineBanner,
} from '@/components/common/live-indicator';
import { MedianClaimTile } from '@/components/common/median-claim-tile';
import { OnTimeTile } from '@/components/common/on-time-tile';
import { PageHeader } from '@/components/common/page-header';
import { QueryState } from '@/components/common/query-state';
import { WindowSelector } from '@/components/common/window-selector';
import { useStatsWindow, windowLabel } from '@/hooks/use-stats-window';
import { cn } from '@/lib/utils';
import { useCarrierPerformance } from '../hooks/use-carrier-performance';
import { useOperatorRanking } from '../hooks/use-operator-ranking';
import { usePerformanceLive } from '../hooks/use-performance-live';
import type { CarrierPerformance as CarrierPerformanceData } from '../types';
import { FirstAttemptTile, MedianDeliveryTile } from './delivery-tiles';
import { StageDurationChart } from './stage-duration-chart';
import { TeamTable } from './team-table';

export function CarrierPerformance() {
  // One reader of the window per page: the selector and the queries share it.
  const [statsWindow, setStatsWindow] = useStatsWindow();
  const live = usePerformanceLive();
  const query = useCarrierPerformance(statsWindow, live.status);
  const team = useOperatorRanking(statsWindow, live.status);
  const loadingNext = query.isPlaceholderData || team.isPlaceholderData;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Performance"
        description="How your company's shipments are performing."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <LiveIndicator live={live} />
            <WindowSelector value={statsWindow} onChange={setStatsWindow} />
          </div>
        }
      />
      <OfflineBanner status={live.status} />
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
                team={team}
                scope={windowLabel(statsWindow)}
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
  team,
  scope,
}: {
  data: CarrierPerformanceData;
  team: ReturnType<typeof useOperatorRanking>;
  scope: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <OnTimeTile onTime={data.onTime} scope={scope} />
        <MedianDeliveryTile metric={data.medianDelivery} scope={scope} />
        <FirstAttemptTile metric={data.firstAttempt} scope={scope} />
        <MedianClaimTile claim={data.claim} scope={scope} />
      </div>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <StageDurationChart stages={data.stages} />
        {/* Its own state, so a failed team keeps the grid's two columns. */}
        <QueryState query={team} errorMessage="Couldn't load the team.">
          {(members) => <TeamTable members={members} scope={scope} />}
        </QueryState>
      </div>
    </div>
  );
}
