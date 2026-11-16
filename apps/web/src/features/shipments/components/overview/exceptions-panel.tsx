'use client';

import type { ReactNode } from 'react';
import { Panel } from '@/components/common/panel';
import { QueryState } from '@/components/common/query-state';
import { RiskBadge } from '@/components/common/risk-badge';
import { TextLink } from '@/components/common/text-link';
import { TrackingCode } from '@/components/common/tracking-code';
import { Badge } from '@/components/ui/badge';
import type { WebhookHealth } from '@/features/integrations/types';
import { PanelLink } from '@/features/shipments/components/panel-link';
import {
  type OverviewPoll,
  useSellerAttention,
} from '@/features/shipments/hooks/use-seller-dashboard';
import type { AttentionGroup } from '@/features/shipments/types';
import { useNow } from '@/hooks/use-now';
import { formatTime, formatTimeAgo } from '@/lib/format-date';
import { formatDuration } from '@/lib/format-duration';
import { ROUTES } from '@/lib/routes';
import { slaState } from '@/lib/sla';
import { SHIPMENT_STATUS_LABEL } from '@/lib/status-labels';
import { exceptionTotal, ownerLabel } from './exception-types';
import { lastSuccessText } from './webhook-strip';

const SLA_REFRESH_MS = 60_000;
const HOUR_MS = 3_600_000;

type Item = AttentionGroup['items'][number];

const hoursBetween = (from: string, to: number) =>
  (to - Date.parse(from)) / HOUR_MS;

export function ExceptionsPanel({
  poll,
  webhook,
}: {
  poll: OverviewPoll;
  webhook: WebhookHealth | undefined;
}) {
  const attention = useSellerAttention(poll);
  const now = useNow(SLA_REFRESH_MS);

  return (
    <QueryState query={attention} errorMessage="Couldn't load the exceptions.">
      {(data) => {
        const total = exceptionTotal(data, webhook?.state);
        return (
          <Panel
            title={
              <span className="flex items-center gap-2">
                Exceptions <Badge variant="secondary">{total}</Badge>
              </span>
            }
            description={total > 0 ? 'Each row says who acts next' : undefined}
            className="gap-2.5"
            footer={
              <p className="text-[13px] text-muted-foreground">
                Checked{' '}
                {formatTime(new Date(attention.dataUpdatedAt).toISOString())}
                {' · '}
                <TextLink href={ROUTES.sellerShipmentList('view=exceptions')}>
                  All exceptions
                </TextLink>
              </p>
            }
          >
            {total === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing needs you right now.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {webhook?.state === 'down' && (
                  <WebhookGroup health={webhook} now={now} />
                )}
                {data.groups.map((group) => (
                  <ExceptionGroup key={group.type} group={group} now={now} />
                ))}
              </div>
            )}
          </Panel>
        );
      }}
    </QueryState>
  );
}

function GroupFrame({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="flex justify-between text-xs font-medium text-muted-foreground">
        {label} <span>{count}</span>
      </h3>
      <ul>{children}</ul>
    </section>
  );
}

function OwnerChip({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-xs">
      {children}
    </span>
  );
}

function ExceptionGroup({ group, now }: { group: AttentionGroup; now: Date }) {
  // One scale for the group's tracks, so overruns compare at a glance.
  const scale = Math.max(
    ...group.items.map(({ shipment }) =>
      hoursBetween(shipment.createdAt, now.getTime()),
    ),
  );

  return (
    <GroupFrame label={group.label} count={group.count}>
      {group.items.map((item) => (
        <li key={item.shipment.id}>
          <PanelLink href={ROUTES.sellerShipment(item.shipment.id)}>
            <span className="w-22 shrink-0">
              <RiskBadge state={slaState({ ...item.shipment, now })} />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
                <TrackingCode code={item.shipment.trackingCode} />
                <span>
                  {item.shipment.addressCity}/{item.shipment.addressState}
                </span>
                <OwnerChip>{ownerLabel(group)}</OwnerChip>
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {detail(group.type, item, now)}
              </span>
            </span>
            {group.type === 'late' && (
              <OverrunTrack item={item} now={now} scale={scale} />
            )}
          </PanelLink>
        </li>
      ))}
    </GroupFrame>
  );
}

function detail(type: string, { shipment, since, reason }: Item, now: Date) {
  const where = `${shipment.modalityName} · ${SHIPMENT_STATUS_LABEL[shipment.status]}`;
  if (type === 'failed' && reason) return reason.text;
  if (type === 'waiting')
    return `${shipment.modalityName} · created ${formatTimeAgo(since, now)}`;
  if (type === 'late' && shipment.dueAt) {
    const used = hoursBetween(shipment.createdAt, now.getTime());
    const sla = hoursBetween(shipment.createdAt, Date.parse(shipment.dueAt));
    return `${where} · ${formatDuration(used)} of a ${formatDuration(sla)} SLA`;
  }
  return where;
}

// The SLA in quiet ink, the time past it in the critical colour, a tick where it was due.
function OverrunTrack({
  item: { shipment },
  now,
  scale,
}: {
  item: Item;
  now: Date;
  scale: number;
}) {
  if (!shipment.dueAt) return null;
  const sla = hoursBetween(shipment.createdAt, Date.parse(shipment.dueAt));
  const used = hoursBetween(shipment.createdAt, now.getTime());
  const at = (hours: number) => `${(hours / scale) * 100}%`;

  return (
    <span aria-hidden className="relative h-2 w-24 shrink-0 max-sm:hidden">
      <span
        className="absolute inset-y-0.5 left-0 rounded-l-full bg-chart-2"
        style={{ width: at(sla) }}
      />
      <span
        className="absolute inset-y-0.5 rounded-r-full bg-sla-late"
        style={{ left: at(sla), width: at(used - sla) }}
      />
      <span
        className="absolute inset-y-0 w-px bg-foreground"
        style={{ left: at(sla) }}
      />
    </span>
  );
}

function WebhookGroup({ health, now }: { health: WebhookHealth; now: Date }) {
  return (
    <GroupFrame label="Webhook" count={1}>
      <li>
        <PanelLink href={ROUTES.sellerIntegrations}>
          <span className="w-22 shrink-0">
            <RiskBadge
              state={{ kind: 'failed', label: 'Down', tone: 'critical' }}
            />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex flex-wrap items-center gap-2 text-[13px]">
              Webhook endpoint failing
              {health.failingSince &&
                ` since ${formatTime(health.failingSince)}`}
              <OwnerChip>You</OwnerChip>
            </span>
            <span className="text-xs text-muted-foreground">
              Last success {lastSuccessText(health, now)} · your store is not
              receiving status updates
            </span>
          </span>
        </PanelLink>
      </li>
    </GroupFrame>
  );
}
