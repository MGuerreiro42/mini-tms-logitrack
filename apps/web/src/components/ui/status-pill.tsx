import { Badge } from '@/components/ui/badge';
import {
  APPROVAL_STATUS,
  type ApprovalStatus,
  SHIPMENT_STATUS,
  type ShipmentStatus,
} from '@/lib/status-colors';
import { cn } from '@/lib/utils';

export function ApprovalStatusPill({ status }: { status: ApprovalStatus }) {
  const meta = APPROVAL_STATUS[status];
  return (
    <Badge variant="outline" className={cn('font-semibold', meta.className)}>
      {meta.label}
    </Badge>
  );
}

export function ShipmentStatusPill({ status }: { status: ShipmentStatus }) {
  const meta = SHIPMENT_STATUS[status];
  return (
    <Badge variant="outline" className={cn('font-semibold', meta.className)}>
      {meta.label}
    </Badge>
  );
}
