'use client';

import { Badge } from '@/components/ui/badge';
import { useChangeSignal } from '@/hooks/use-change-signal';
import { APPROVAL_STATUS, SHIPMENT_STATUS } from '@/lib/status-colors';
import { cn } from '@/lib/utils';
import type { ApprovalStatus, ShipmentStatus } from '@/types/status';

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  const meta = APPROVAL_STATUS[status];
  return (
    <Badge variant="plain" className={meta.className}>
      {meta.label}
    </Badge>
  );
}

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  const meta = SHIPMENT_STATUS[status];
  const signal = useChangeSignal(status);
  return (
    <Badge
      key={signal}
      variant="plain"
      className={cn(meta.className, signal > 0 && 'animate-value-in')}
    >
      {meta.label}
    </Badge>
  );
}
