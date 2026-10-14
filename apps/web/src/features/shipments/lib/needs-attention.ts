import { type SlaState, slaState } from '@/lib/sla';
import type { Shipment } from '../types';

export interface AttentionItem {
  shipment: Shipment;
  reason: 'failed' | 'late';
  sla: SlaState;
}

export function needsAttention(
  shipments: Shipment[],
  now: Date,
): AttentionItem[] {
  const items = shipments.map((shipment) => ({
    shipment,
    sla: slaState({ dueAt: shipment.dueAt, status: shipment.status, now }),
  }));
  const failed = items
    .filter(({ shipment }) => shipment.status === 'FAILED_DELIVERY')
    .map((item) => ({ ...item, reason: 'failed' as const }));
  const late = items
    .filter(
      ({ shipment, sla }) =>
        shipment.status !== 'FAILED_DELIVERY' && sla.tone === 'late',
    )
    .sort((a, b) =>
      (a.shipment.dueAt ?? '').localeCompare(b.shipment.dueAt ?? ''),
    )
    .map((item) => ({ ...item, reason: 'late' as const }));
  return [...failed, ...late];
}
