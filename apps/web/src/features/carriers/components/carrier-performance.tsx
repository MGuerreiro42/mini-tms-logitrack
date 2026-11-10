'use client';

import { EmptyState } from '@/components/common/feedback-state';
import { LiveIndicator } from '@/components/common/live-indicator';
import { MedianClaimTile } from '@/components/common/median-claim-tile';
import { OnTimeTile } from '@/components/common/on-time-tile';
import { PageHeader } from '@/components/common/page-header';
import { QueryState } from '@/components/common/query-state';
import { StatTile } from '@/components/common/stat-tile';
import { WindowSelector } from '@/components/common/window-selector';
import { useStatsWindow, windowLabel } from '@/hooks/use-stats-window';
import { formatDuration } from '@/lib/format-duration';
import { hasEnoughData, notEnoughNote } from '@/lib/metrics';
import { cn } from '@/lib/utils';
import { useCarrierPerformance } from '../hooks/use-carrier-performance';
import { useOperatorRanking } from '../hooks/use-operator-ranking';
import { usePerformanceLive } from '../hooks/use-performance-live';
import type {
  CarrierPerformance as CarrierPerformanceData,
  TeamMember,
} from '../types';
import { StageDurationChart } from './stage-duration-chart';
import { TeamTable } from './team-table';

export function CarrierPerformance() {
  // One reader of the window per page: the selector and the queries share it.
  const [statsWindow, setStatsWindow] = useStatsWindow();
  const query = useCarrierPerformance(statsWindow);
  const team = useOperatorRanking(statsWindow);
  const loadingNext = query.isPlaceholderData || team.isPlaceholderData;
  const live = usePerformanceLive();

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Performance"
        description="How your company's shipments are performing."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <LiveIndicator live={{ status: live, lastEventAt: null }} />
            <WindowSelector value={statsWindow} onChange={setStatsWindow} />
          </div>
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
                team={team.data}
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
  team?: TeamMember[];
  scope: string;
}) {
  const { medianDelivery, firstAttempt, claim } = data;
  const deliveryShown =
    hasEnoughData(medianDelivery.n) && medianDelivery.hours !== null;
  const firstShown =
    hasEnoughData(firstAttempt.n) && firstAttempt.rate !== null;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <OnTimeTile onTime={data.onTime} scope={scope} />
        <StatTile
          label="Median delivery"
          scope={scope}
          value={
            deliveryShown ? formatDuration(medianDelivery.hours as number) : '—'
          }
          note={
            deliveryShown
              ? `n=${medianDelivery.n}`
              : notEnoughNote(medianDelivery.n, 'deliveries')
          }
          definition={`Middle value (nearest rank) of creation to delivery, over the shipments created in the last ${scope} and delivered (n=${medianDelivery.n}).`}
        />
        <StatTile
          label="First attempt"
          scope={scope}
          value={
            firstShown ? `${(firstAttempt.rate as number).toFixed(1)}%` : '—'
          }
          note={
            firstShown
              ? `${firstAttempt.failed} failed · ${firstAttempt.returned} returned`
              : notEnoughNote(firstAttempt.n, 'deliveries')
          }
          definition={`Outcomes without a failed delivery ÷ shipments created in the last ${scope} that were delivered or ever failed (n=${firstAttempt.n}). A failure that later returned still counts as failed.`}
        />
        <MedianClaimTile claim={claim} scope={scope} />
      </div>
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <StageDurationChart stages={data.stages} />
        {team && <TeamTable members={team} scope={scope} />}
      </div>
    </div>
  );
}
