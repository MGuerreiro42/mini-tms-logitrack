import type { Column } from '@/components/common/paginated-table';
import { SlaCell } from '@/components/common/sla-cell';
import { ShipmentStatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/lib/format-date';
import { slaState } from '@/lib/sla';
import type { Shipment } from '../types';

type ShipmentRow = Pick<
  Shipment,
  | 'trackingCode'
  | 'status'
  | 'addressCity'
  | 'addressState'
  | 'createdAt'
  | 'dueAt'
>;

export function lateRowClassName(row: ShipmentRow): string | undefined {
  return slaState(row).tone === 'late' ? 'bg-late-row' : undefined;
}

export const shipmentColumns = {
  trackingCode: {
    header: 'Tracking code',
    cell: (s) => <span className="font-mono text-xs">{s.trackingCode}</span>,
  },
  status: {
    header: 'Status',
    cell: (s) => <ShipmentStatusBadge status={s.status} />,
  },
  destination: {
    header: 'Destination',
    cell: (s) => `${s.addressCity}/${s.addressState}`,
  },
  sla: {
    header: 'SLA',
    cell: (s) => <SlaCell dueAt={s.dueAt} status={s.status} />,
  },
  created: {
    header: 'Created',
    className: 'text-right text-muted-foreground',
    cell: (s) => formatDate(s.createdAt),
  },
} satisfies Record<string, Column<ShipmentRow>>;
