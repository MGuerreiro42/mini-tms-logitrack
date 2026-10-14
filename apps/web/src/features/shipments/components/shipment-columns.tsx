import type { Column } from '@/components/common/paginated-table';
import { SlaCell } from '@/components/common/sla-cell';
import { ShipmentStatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/lib/format-date';
import { type SlaState, slaState } from '@/lib/sla';
import type { Shipment } from '../types';

type ShipmentRow = Pick<
  Shipment,
  'trackingCode' | 'status' | 'addressCity' | 'addressState' | 'createdAt'
>;

export type WithSla<T> = T & { sla: SlaState };

export function withSla<T extends Pick<Shipment, 'dueAt' | 'status'>>(
  rows: T[],
  now: Date,
): WithSla<T>[] {
  return rows.map((row) => ({
    ...row,
    sla: slaState({ dueAt: row.dueAt, status: row.status, now }),
  }));
}

export function lateRowClassName(row: { sla: SlaState }): string | undefined {
  return row.sla.tone === 'late' ? 'bg-late-row' : undefined;
}

export const slaColumn: Column<{ sla: SlaState }> = {
  header: 'SLA',
  card: 'meta',
  cell: (s) => <SlaCell state={s.sla} />,
};

export const shipmentColumns = {
  trackingCode: {
    header: 'Tracking code',
    card: 'title',
    cell: (s) => (
      <span className="font-mono text-[13px]">{s.trackingCode}</span>
    ),
  },
  status: {
    header: 'Status',
    card: 'badge',
    cell: (s) => <ShipmentStatusBadge status={s.status} />,
  },
  destination: {
    header: 'Destination',
    card: 'place',
    cell: (s) => `${s.addressCity}/${s.addressState}`,
  },
  created: {
    header: 'Created',
    card: 'meta',
    className: 'text-right text-muted-foreground',
    cell: (s) => formatDate(s.createdAt),
  },
} satisfies Record<string, Column<ShipmentRow>>;
