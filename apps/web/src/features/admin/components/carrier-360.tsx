'use client';

import { CopyText } from '@/components/common/copy-field';
import { EmptyState } from '@/components/common/feedback-state';
import { OnTimeTile } from '@/components/common/on-time-tile';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import { StatTile } from '@/components/common/stat-tile';
import { WindowSelector } from '@/components/common/window-selector';
import { CarrierCoveragePanel } from '@/features/carriers/components/carrier-coverage-panel';
import {
  FirstAttemptTile,
  MedianDeliveryTile,
} from '@/features/carriers/components/delivery-tiles';
import { StageDurationChart } from '@/features/carriers/components/stage-duration-chart';
import { TeamTable } from '@/features/carriers/components/team-table';
import {
  useApproveCarrier,
  useRejectCarrier,
} from '@/features/carriers/hooks/use-approve-reject-carrier';
import { useCarrier } from '@/features/carriers/hooks/use-carrier';
import { useCarrierPerformance } from '@/features/carriers/hooks/use-carrier-performance';
import { useOperatorRanking } from '@/features/carriers/hooks/use-operator-ranking';
import { usePerformanceRefresh } from '@/features/carriers/hooks/use-performance-live';
import { carrierDetails } from '@/features/carriers/lib/carrier-details';
import type { Carrier } from '@/features/carriers/types';
import {
  CompanyReview,
  TenantHeader,
} from '@/features/companies/components/company-cards';
import { RecentShipments } from '@/features/shipments/components/recent-shipments';
import {
  useAdminMetrics,
  useRecentShipments,
} from '@/features/shipments/hooks/use-admin-shipments';
import { useShipmentTracking } from '@/features/shipments/hooks/use-shipment-tracking';
import { useStatsWindow, windowLabel } from '@/hooks/use-stats-window';
import { formatDateTime } from '@/lib/format-date';
import { plural } from '@/lib/plural';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';

const BACK = { href: '/admin/carriers', label: 'Carriers' };

export function Carrier360({ id }: { id: string }) {
  const query = useCarrier(id);
  const approve = useApproveCarrier(id);
  const reject = useRejectCarrier(id);

  return (
    <QueryState
      query={query}
      errorMessage="Couldn't load this carrier."
      notFoundMessage="Carrier not found."
    >
      {(carrier) =>
        carrier.status === 'APPROVED' ? (
          <ApprovedCarrier carrier={carrier} justApproved={approve.isSuccess} />
        ) : (
          <CompanyReview
            company={carrier}
            rows={carrierDetails(carrier, formatDateTime)}
            back={BACK}
            approve={approve}
            reject={reject}
          />
        )
      }
    </QueryState>
  );
}

function ApprovedCarrier({
  carrier,
  justApproved,
}: {
  carrier: Carrier;
  justApproved: boolean;
}) {
  // One reader of the window per page: the selector and the queries share it.
  const [statsWindow, setStatsWindow] = useStatsWindow();
  const scope = windowLabel(statsWindow);
  const carrierId = carrier.id;
  // Throttled like carrier Performance, so both pages pick up a status change alike.
  const { status: liveStatus } = useShipmentTracking({
    subscribeToMonitoring: true,
    onEvent: usePerformanceRefresh(carrierId),
  });
  // The manager's own endpoints by id, so every number equals their Performance page.
  const performance = useCarrierPerformance(statsWindow, liveStatus, carrierId);
  const team = useOperatorRanking(statsWindow, liveStatus, carrierId);
  const active = useAdminMetrics({ carrierId }, liveStatus);
  const recent = useRecentShipments({ carrierId }, liveStatus);
  const total = recent.data?.meta.total;
  const loadingNext = performance.isPlaceholderData || team.isPlaceholderData;

  return (
    <div className="flex flex-col gap-5">
      <TenantHeader
        company={carrier}
        back={BACK}
        focusTitle={justApproved}
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {carrier.email ? (
              <CopyText value={carrier.email} label="Copy manager e-mail" />
            ) : (
              'No manager'
            )}
            {plural(carrier.userCount, 'user')}
          </span>
        }
        action={
          total !== 0 && (
            <WindowSelector value={statsWindow} onChange={setStatsWindow} />
          )
        }
      />
      {/* Nothing until the total is known, so a carrier without shipments never flashes zero tiles. */}
      {total === undefined && !recent.error ? (
        <QuerySkeleton />
      ) : total === 0 ? (
        <EmptyState
          title="No shipments yet"
          description="Metrics appear once a seller sends this carrier a shipment."
        />
      ) : (
        <>
          <QueryState
            query={performance}
            errorMessage="Couldn't load the performance."
          >
            {(data) => (
              <div
                aria-busy={loadingNext}
                className={cn(
                  'flex flex-col gap-5 transition-opacity',
                  loadingNext && 'opacity-60',
                )}
              >
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <OnTimeTile onTime={data.onTime} scope={scope} />
                  <MedianDeliveryTile
                    metric={data.medianDelivery}
                    scope={scope}
                  />
                  <FirstAttemptTile metric={data.firstAttempt} scope={scope} />
                  <StatTile
                    label="Active"
                    scope="now"
                    value={active.data?.active ?? '—'}
                    note={
                      active.error
                        ? "Couldn't load the active count."
                        : undefined
                    }
                    href={`${ROUTES.adminMonitoring}?carrierId=${carrierId}&view=active`}
                    linkLabel="View active shipments"
                  />
                </div>
                <StageDurationChart stages={data.stages} />
              </div>
            )}
          </QueryState>
          {/* Team and coverage sit beside the ten recent rows from 1280 px and below them
              otherwise; the last panel fills its column so both columns end together. */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)]">
            <RecentShipments scope={{ carrierId }} liveStatus={liveStatus} />
            <div className="flex flex-col gap-5">
              <QueryState query={team} errorMessage="Couldn't load the team.">
                {(members) => <TeamTable members={members} scope={scope} />}
              </QueryState>
              <CarrierCoveragePanel id={carrierId} className="flex-1" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
