'use client';

import { SidebarStatusRow } from '@/components/common/sidebar-status-row';
import { useDemoStatus } from '../hooks/use-demo-status';

// Off the demo deployment, or on a 404 (no simulator), the query has no data and the row is absent.
export function ChaosStatusRow({ href }: { href?: string }) {
  const { data } = useDemoStatus();
  if (!data) return null;
  return data.chaos ? (
    <SidebarStatusRow
      tone="warning"
      label={`Chaos · ${data.chaos.label}`}
      href={href}
    />
  ) : (
    <SidebarStatusRow tone="neutral" label="Chaos · off" href={href} />
  );
}
