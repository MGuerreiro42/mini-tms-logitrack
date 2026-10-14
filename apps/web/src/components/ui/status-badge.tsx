import { Badge } from '@/components/ui/badge';
import { APPROVAL_STATUS, SHIPMENT_STATUS } from '@/lib/status-colors';
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
  return (
    <Badge variant="plain" className={meta.className}>
      {meta.label}
    </Badge>
  );
}
