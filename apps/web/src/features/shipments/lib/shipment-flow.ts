import { PIPELINE_STATUSES } from '@/components/common/charts/pipeline-bar';
import { type SlaState, slaState } from '@/lib/sla';
import { SHIPMENT_STATUS_LABEL } from '@/lib/status-labels';
import type { Shipment } from '../types';

type FlowStatus = (typeof PIPELINE_STATUSES)[number];
export type FlowKind = 'onTrack' | 'dueSoon' | 'late' | 'none';

const BUCKET_WORDS: [FlowKind, string][] = [
  ['onTrack', 'on track'],
  ['dueSoon', 'due soon'],
  ['late', 'late'],
  ['none', 'no SLA'],
];

// An open shipment is on track, due soon, late or without an SLA (`dueAt` null).
const flowKind = ({ kind }: SlaState): FlowKind =>
  kind === 'onTrack' || kind === 'dueSoon' || kind === 'late' ? kind : 'none';

const emptyTotals = (): Record<FlowKind, number> => ({
  onTrack: 0,
  dueSoon: 0,
  late: 0,
  none: 0,
});

// Stage counts are exact (status-counts); marks are the drawn list, so a stage may hide some.
export function flowStages(
  shipments: Shipment[],
  counts: Record<FlowStatus, number>,
  now: Date,
) {
  const totals = emptyTotals();
  const stages = PIPELINE_STATUSES.map((status) => {
    const buckets = emptyTotals();
    const marks = shipments
      .filter((shipment) => shipment.status === status)
      .map((shipment) => {
        const state = slaState({ ...shipment, now });
        const kind = flowKind(state);
        buckets[kind] += 1;
        totals[kind] += 1;
        return { shipment, state, kind };
      });
    const parts = BUCKET_WORDS.filter(([kind]) => buckets[kind] > 0).map(
      ([kind, words]) => `${buckets[kind]} ${words}`,
    );
    return {
      status,
      count: counts[status],
      marks,
      hidden: counts[status] - marks.length,
      summary: `${SHIPMENT_STATUS_LABEL[status]} ${counts[status]}${parts.length ? `: ${parts.join(', ')}` : ''}`,
    };
  });
  return { stages, totals };
}
