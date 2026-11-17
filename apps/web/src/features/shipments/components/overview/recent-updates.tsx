'use client';

import { LiveIndicator } from '@/components/common/live-indicator';
import { Panel } from '@/components/common/panel';
import { QueryState } from '@/components/common/query-state';
import { TextLink } from '@/components/common/text-link';
import { ActivityFeed } from '@/features/shipments/components/activity-feed';
import {
  type OverviewPoll,
  useSellerActivity,
} from '@/features/shipments/hooks/use-seller-dashboard';
import { useNow } from '@/hooks/use-now';
import type { LiveConnection } from '@/lib/live-status';
import { ROUTES } from '@/lib/routes';
import { ActivityStrip } from './activity-strip';

const STRIP_REFRESH_MS = 60_000;

export function RecentUpdates({
  live,
  poll,
}: {
  live: LiveConnection;
  poll: OverviewPoll;
}) {
  const activity = useSellerActivity(poll);
  const now = useNow(STRIP_REFRESH_MS);

  return (
    <Panel
      title="Recent updates"
      className="gap-2.5"
      aside={<LiveIndicator live={live} />}
      footer={
        <TextLink href={ROUTES.sellerShipments} className="text-sm">
          See all updates
        </TextLink>
      }
    >
      <QueryState query={activity} errorMessage="Couldn't load the updates.">
        {(events) => (
          <>
            <ActivityStrip events={events} now={now} />
            <ActivityFeed events={events} />
          </>
        )}
      </QueryState>
    </Panel>
  );
}
