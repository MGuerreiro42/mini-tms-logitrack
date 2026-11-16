'use client';

import { SidebarStatusRow } from '@/components/common/sidebar-status-row';
import { ChaosStatusRow } from '@/features/demo/components/chaos-status-row';
import { usePulse } from '../hooks/use-pulse';
import { UNAVAILABLE, webhooksText } from './pulse-strip';

// The admin Overview's pulse query: on other admin pages this footer is what keeps its 5 s poll running.
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
            label={`Webhooks · ${data.webhooks ? webhooksText(data.webhooks, `n ${data.webhooks.n}`) : unavailable}`}
            href="/admin/monitoring"
          />
        </>
      )}
      <ChaosStatusRow href="/admin" />
    </>
  );
}
