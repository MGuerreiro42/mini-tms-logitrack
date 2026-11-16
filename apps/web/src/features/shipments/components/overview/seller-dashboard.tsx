'use client';

import Link from 'next/link';
import { EmptyState } from '@/components/common/feedback-state';
import { QueryState } from '@/components/common/query-state';
import { Button } from '@/components/ui/button';
import { useSellerCounts } from '@/features/shipments/hooks/use-seller-dashboard';
import { useShipmentTracking } from '@/features/shipments/hooks/use-shipment-tracking';
import { useStatsWindow } from '@/hooks/use-stats-window';
import { fallbackPollInterval } from '@/lib/live-status';
import { ROUTES } from '@/lib/routes';
import { sumRecord } from '@/lib/sum-record';
import { ExceptionsPanel } from './exceptions-panel';
import { OnTimeBy } from './on-time-by';
import { OverviewHeader } from './overview-header';
import { OverviewTiles } from './overview-tiles';
import { RecentUpdates } from './recent-updates';
import { ShipmentFlow } from './shipment-flow';

// Composition only: each section reads its own query, so one refetch re-renders one section.
export function SellerDashboard() {
  // One reader of the window per page: the selector and the queries share it.
  const [statsWindow, setStatsWindow] = useStatsWindow();
  const live = useShipmentTracking({ subscribeToSeller: true });
  const poll = fallbackPollInterval(live.status);
  const counts = useSellerCounts(poll);

  return (
    // Laid out by its own width, which the sidebar (spec 09) narrows.
    <div className="@container space-y-6">
      <OverviewHeader
        statsWindow={statsWindow}
        onWindowChange={setStatsWindow}
        poll={poll}
      />
      <QueryState query={counts} errorMessage="Couldn't load your dashboard.">
        {(data) =>
          sumRecord(data) === 0 ? (
            <FirstShipment />
          ) : (
            <div className="space-y-5">
              <OverviewTiles statsWindow={statsWindow} poll={poll} />
              <ShipmentFlow counts={data} poll={poll} />
              <div className="grid grid-cols-1 gap-5 @min-[880px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
                <div className="flex min-w-0 flex-col gap-5">
                  <ExceptionsPanel poll={poll} />
                  <OnTimeBy statsWindow={statsWindow} poll={poll} />
                </div>
                <RecentUpdates live={live} poll={poll} />
              </div>
            </div>
          )
        }
      </QueryState>
    </div>
  );
}

function FirstShipment() {
  return (
    <EmptyState
      title="Send your first shipment"
      description="Two steps, and carriers that cover your customers can pick it up."
      steps={[
        {
          label: 'Enable at least one delivery modality',
          action: (
            <Button asChild variant="link">
              <Link href={ROUTES.sellerModalities}>Modalities</Link>
            </Button>
          ),
        },
        {
          label: 'Create a shipment for a real address',
          action: (
            <Button asChild size="sm">
              <Link href={ROUTES.newShipment}>Create shipment</Link>
            </Button>
          ),
        },
      ]}
    />
  );
}
