'use client';

import { Panel } from '@/components/common/panel';
import { QueryState } from '@/components/common/query-state';
import { RiskBadge } from '@/components/common/risk-badge';
import { TextLink } from '@/components/common/text-link';
import { TrackingCode } from '@/components/common/tracking-code';
import { Badge } from '@/components/ui/badge';
import { PanelLink } from '@/features/shipments/components/panel-link';
import {
  type OverviewPoll,
  useSellerAttention,
} from '@/features/shipments/hooks/use-seller-dashboard';
import { useNow } from '@/hooks/use-now';
import { plural } from '@/lib/plural';
import { ROUTES } from '@/lib/routes';
import { slaState } from '@/lib/sla';

const SLA_REFRESH_MS = 60_000;

export function ExceptionsPanel({ poll }: { poll: OverviewPoll }) {
  const attention = useSellerAttention(poll);
  const now = useNow(SLA_REFRESH_MS);

  return (
    <QueryState query={attention} errorMessage="Couldn't load the exceptions.">
      {({ shipments, counts }) => {
        const total = counts.failed + counts.late;
        return (
          <Panel
            title={
              <span className="flex items-center gap-2">
                Exceptions
                <Badge variant="secondary" aria-hidden>
                  {total}
                </Badge>
              </span>
            }
            aside={
              // Announced with its noun when the number changes, not on first render.
              <span className="sr-only" aria-live="polite">
                {plural(total, 'exception')}
              </span>
            }
            description={
              total > 0
                ? `${counts.late} late · ${counts.failed} failed`
                : undefined
            }
            className="gap-2.5"
            footer={
              total > shipments.length && (
                <TextLink
                  href={ROUTES.sellerShipmentList('view=exceptions')}
                  className="text-sm"
                >
                  All exceptions
                </TextLink>
              )
            }
          >
            {shipments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing needs you right now.
              </p>
            ) : (
              <ul>
                {shipments.map((shipment) => (
                  <li key={shipment.id}>
                    <PanelLink href={ROUTES.sellerShipment(shipment.id)}>
                      {/* A fixed column, so the codes line up whatever the badge says. */}
                      <span className="w-22 shrink-0">
                        <RiskBadge state={slaState({ ...shipment, now })} />
                      </span>
                      <TrackingCode
                        code={shipment.trackingCode}
                        className="shrink-0 text-[13px]"
                      />
                      <span className="min-w-0 flex-1 truncate text-[13px] text-muted-foreground">
                        {shipment.addressCity}, {shipment.addressState} ·{' '}
                        {shipment.modalityName}
                      </span>
                    </PanelLink>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        );
      }}
    </QueryState>
  );
}
