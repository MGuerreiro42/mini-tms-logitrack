'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/common/page-header';
import { WindowSelector } from '@/components/common/window-selector';
import { Button } from '@/components/ui/button';
import {
  type OverviewPoll,
  useSellerMetrics,
} from '@/features/shipments/hooks/use-seller-dashboard';
import {
  rangeLine,
  windowDeltas,
} from '@/features/shipments/lib/overview-rules';
import type { StatsWindow } from '@/hooks/use-stats-window';
import { hasEnoughData } from '@/lib/metrics';
import { ROUTES } from '@/lib/routes';

export function OverviewHeader({
  statsWindow,
  onWindowChange,
  poll,
}: {
  statsWindow: StatsWindow;
  onWindowChange: (value: StatsWindow) => void;
  poll: OverviewPoll;
}) {
  const { data } = useSellerMetrics(statsWindow, poll);
  const compared =
    data !== undefined &&
    Object.values(windowDeltas(data)).some(
      (delta) => delta !== null && delta !== 'immature',
    );

  return (
    <PageHeader
      title="Overview"
      description="What needs you and what is moving now."
      action={
        <div className="flex flex-wrap items-start gap-3">
          <WindowSelector
            value={statsWindow}
            onChange={onWindowChange}
            range={
              data &&
              rangeLine(data.comparison, compared, new Date()) +
                // The seed holds one 90 d window of history, so the one before it is empty.
                (hasEnoughData(data.comparison.onTime.n)
                  ? ''
                  : ' · No earlier history to compare')
            }
          />
          <Button asChild>
            <Link href={ROUTES.newShipment}>Create shipment</Link>
          </Button>
        </div>
      }
    />
  );
}
