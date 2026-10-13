import type { Column } from '@/components/common/paginated-table';
import { ShipmentStatusPill } from '@/components/ui/status-pill';
import { formatDate } from '@/lib/format-date';
import type { Shipment } from '../types';

type ShipmentRow = Pick<
  Shipment,
  'trackingCode' | 'status' | 'addressCity' | 'addressState' | 'createdAt'
>;

export const shipmentColumns = {
  trackingCode: {
    header: 'Tracking code',
    cell: (s) => <span className="font-mono text-xs">{s.trackingCode}</span>,
  },
  status: {
    header: 'Status',
    cell: (s) => <ShipmentStatusPill status={s.status} />,
  },
  destination: {
    header: 'Destination',
    cell: (s) => `${s.addressCity}/${s.addressState}`,
  },
  created: {
    header: 'Created',
    className: 'text-right text-muted-foreground',
    cell: (s) => formatDate(s.createdAt),
  },
} satisfies Record<string, Column<ShipmentRow>>;
