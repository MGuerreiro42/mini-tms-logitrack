'use client';

import { SidebarStatusRow } from '@/components/common/sidebar-status-row';
import { ChaosStatusRow } from '@/features/demo/components/chaos-status-row';
import { usePulse } from '../hooks/use-pulse';
import { UNAVAILABLE } from './pulse-strip';

function webhooksText(webhooks: { n: number; successRate: number | null }) {
  return webhooks.successRate === null
    ? 'no deliveries'
    : `${webhooks.successRate.toFixed(1)}% · n ${webhooks.n}`;
}

// Reads the pulse the admin Overview already polls; no request of its own.
export function AdminOpsStatus() {
  const { data } = usePulse();
  const unavailable = UNAVAILABLE.toLowerCase();
  return (
    <>
      {data && (
        <>
          <SidebarStatusRow
            tone={data.simulator === 'running' ? 'live' : 'neutral'}
            label={`Simulator · ${data.simulator ?? unavailable}`}
          />
          <SidebarStatusRow
            tone="neutral"
            label={`Webhooks · ${data.webhooks ? webhooksText(data.webhooks) : unavailable}`}
            href="/admin/monitoring"
          />
        </>
      )}
      <ChaosStatusRow href="/admin" />
    </>
  );
}
