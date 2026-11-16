import type { WebhookHealth } from '@/features/integrations/types';
import type {
  AttentionGroup,
  ShipmentAttention,
} from '@/features/shipments/types';

// Who acts next, per exception type (spec 10 FR-022). A type the API adds later (phase 4)
// has no entry and reads its server owner instead.
const OWNER_BY_TYPE: Record<string, string> = {
  late: 'Carrier must act',
  failed: 'Carrier must act',
  waiting: 'Waiting for carrier',
};

const OWNER_FALLBACK: Record<AttentionGroup['owner'], string> = {
  carrier: 'Carrier',
  seller: 'You',
  recipient: 'Recipient',
  unknown: 'Owner unknown',
};

export const ownerLabel = ({
  type,
  owner,
}: Pick<AttentionGroup, 'type' | 'owner'>) =>
  OWNER_BY_TYPE[type] ?? OWNER_FALLBACK[owner];

// The panel's title and the announcer count the same rows: every group, plus the webhook when down.
export const exceptionTotal = (
  { groups }: ShipmentAttention,
  webhook: WebhookHealth['state'] | undefined,
) =>
  groups.reduce((sum, group) => sum + group.count, 0) +
  (webhook === 'down' ? 1 : 0);
