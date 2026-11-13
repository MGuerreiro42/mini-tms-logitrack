import type { StatsWindow } from '../../shared/stats/stats';
import type {
  AttentionGroupDto,
  AttentionItemDto,
} from './dto/shipment-attention-response.dto';

// Most severe first; each query opens the list whose count is the group's (spec 10 FR-009).
const GROUPS = [
  { type: 'late', label: 'Late', owner: 'carrier', query: 'view=late' },
  {
    type: 'failed',
    label: 'Failed attempt',
    owner: 'carrier',
    query: 'status=FAILED_DELIVERY',
  },
  {
    type: 'waiting',
    label: 'Waiting for a carrier',
    owner: 'carrier',
    query: 'view=waiting',
  },
] as const;

type GroupType = (typeof GROUPS)[number]['type'];

export function attentionGroups(
  found: Record<GroupType, { count: number; items: AttentionItemDto[] }>,
  window?: StatsWindow,
): AttentionGroupDto[] {
  const inWindow = window ? `&window=${window}` : '';
  return GROUPS.filter(({ type }) => found[type].count > 0).map(
    ({ query, ...group }) => ({
      ...group,
      ...found[group.type],
      href: `?${query}${inWindow}`,
    }),
  );
}
