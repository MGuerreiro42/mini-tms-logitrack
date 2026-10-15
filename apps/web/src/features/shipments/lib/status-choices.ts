import type { FilterChoice } from '@/components/common/filter-toolbar';
import type { StatusFilter } from '@/components/common/status-filter-tabs';
import { ALL } from '@/lib/filters';
import { SHIPMENT_STATUS, SHIPMENT_STATUSES } from '@/lib/status-colors';
import { sumRecord } from '@/lib/sum-record';
import type { ShipmentStatus, ShipmentStatusCounts } from '../types';

export const STATUS_FILTER_VALUES: StatusFilter<ShipmentStatus>[] = [
  ALL,
  ...SHIPMENT_STATUSES,
];

export function statusChoices(
  counts: ShipmentStatusCounts | undefined,
): FilterChoice<StatusFilter<ShipmentStatus>>[] {
  return [
    { value: ALL, label: 'All', count: counts && sumRecord(counts) },
    ...SHIPMENT_STATUSES.map((status) => ({
      value: status,
      label: SHIPMENT_STATUS[status].label,
      count: counts?.[status],
    })),
  ];
}
