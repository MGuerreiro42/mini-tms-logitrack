'use client';

import { OnTimeRows } from '@/components/common/charts/on-time-rows';
import { Panel } from '@/components/common/panel';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import {
  type OverviewPoll,
  useSellerMetrics,
} from '@/features/shipments/hooks/use-seller-dashboard';
import { type StatsWindow, windowLabel } from '@/hooks/use-stats-window';
import { cn } from '@/lib/utils';

export function OnTimeBy({
  statsWindow,
  poll,
}: {
  statsWindow: StatsWindow;
  poll: OverviewPoll;
}) {
  const metrics = useSellerMetrics(statsWindow, poll);
  const busy = metrics.isPlaceholderData;

  return (
    // Grid items stretch to the row; this panel fills the left column so both end flush.
    <div
      aria-busy={busy}
      className={cn('flex-1 transition-opacity', busy && 'opacity-60')}
    >
      <Panel
        title={`On time by modality · ${windowLabel(statsWindow)}`}
        className="h-full"
      >
        <QueryState
          query={metrics}
          skeleton={<QuerySkeleton variant="lines" />}
          errorMessage="Couldn't load the window's metrics."
        >
          {(data) =>
            data.byModality.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No delivery with an SLA in this window yet.
              </p>
            ) : (
              <OnTimeRows
                rows={data.byModality.map((modality) => ({
                  key: modality.modalityCode,
                  label: modality.modalityName,
                  rate: modality.rate,
                  n: modality.n,
                }))}
              />
            )
          }
        </QueryState>
      </Panel>
    </div>
  );
}
