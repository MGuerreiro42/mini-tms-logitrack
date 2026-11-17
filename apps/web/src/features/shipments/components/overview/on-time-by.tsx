'use client';

import { useState } from 'react';
import {
  type RangeDotRow,
  RangeDotRows,
} from '@/components/common/charts/range-dot-rows';
import { Panel } from '@/components/common/panel';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import { SegmentedControl } from '@/components/common/segmented-control';
import {
  type OverviewPoll,
  useSellerMetrics,
} from '@/features/shipments/hooks/use-seller-dashboard';
import { wilson } from '@/features/shipments/lib/wilson';
import type { SellerMetrics } from '@/features/shipments/types';
import { useMediaQuery } from '@/hooks/use-media-query';
import { type StatsWindow, windowLabel } from '@/hooks/use-stats-window';
import { hasEnoughData, type Rate } from '@/lib/metrics';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';

type Tab = 'modality' | 'destination';

const TABS = [
  { value: 'modality', label: 'Modality' },
  { value: 'destination', label: 'Destination' },
] as const;

// Destination first where the panel is wide (≥ 880 px container, ~1024 px viewport).
const WIDE = '(min-width: 1024px)';

// Worst rate first; too few to judge go last, in a stable order.
function byWorst(a: RangeDotRow, b: RangeDotRow) {
  const judged = (row: RangeDotRow) =>
    hasEnoughData(row.n) && row.rate !== null;
  if (judged(a) !== judged(b)) return judged(a) ? -1 : 1;
  return (a.rate ?? 0) - (b.rate ?? 0) || a.label.localeCompare(b.label);
}

function toRow(
  key: string,
  label: string,
  { rate, count, n }: Rate,
  search: string,
): RangeDotRow {
  return {
    key,
    label,
    rate,
    count,
    n,
    range: hasEnoughData(n) ? wilson(count, n) : null,
    href: ROUTES.sellerShipmentList(search),
  };
}

function rowsFor(tab: Tab, metrics: SellerMetrics, statsWindow: StatsWindow) {
  const delivered = `status=DELIVERED&window=${statsWindow}`;
  const rows =
    tab === 'modality'
      ? metrics.byModality.map((modality) =>
          toRow(
            modality.modalityCode,
            modality.modalityName,
            modality,
            `${delivered}&modality=${modality.modalityCode}`,
          ),
        )
      : metrics.byState.map((state) =>
          toRow(state.uf, state.uf, state, `${delivered}&uf=${state.uf}`),
        );
  return rows.sort(byWorst);
}

export function OnTimeBy({
  statsWindow,
  poll,
}: {
  statsWindow: StatsWindow;
  poll: OverviewPoll;
}) {
  const metrics = useSellerMetrics(statsWindow, poll);
  const wide = useMediaQuery(WIDE);
  const [picked, setPicked] = useState<Tab | null>(null);
  const tab = picked ?? (wide ? 'destination' : 'modality');
  const busy = metrics.isPlaceholderData;

  return (
    // Grid items stretch to the row; this panel fills the left column so both end flush.
    <div
      aria-busy={busy}
      className={cn('flex-1 transition-opacity', busy && 'opacity-60')}
    >
      <Panel
        title={
          <>
            On time by{' '}
            <span className="text-[13px] font-normal text-muted-foreground">
              · {windowLabel(statsWindow)}
            </span>
          </>
        }
        aside={
          <SegmentedControl
            label="On time by"
            options={TABS}
            value={tab}
            onChange={setPicked}
          />
        }
        className="h-full"
      >
        <QueryState
          query={metrics}
          skeleton={<QuerySkeleton variant="lines" />}
          errorMessage="Couldn't load the window's metrics."
        >
          {(data) => {
            const rows = rowsFor(tab, data, statsWindow);
            return rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No delivery with an SLA in this window yet.
              </p>
            ) : (
              <>
                <RangeDotRows
                  rows={rows}
                  label={`On time by ${tab}, worst first`}
                />
                <p className="text-xs text-muted-foreground">
                  Dot = on-time rate. Bar = where the true rate likely sits (95%
                  range): wide when n is small.
                </p>
              </>
            );
          }}
        </QueryState>
      </Panel>
    </div>
  );
}
