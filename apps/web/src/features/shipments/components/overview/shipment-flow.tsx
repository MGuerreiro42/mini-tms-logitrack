'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { Panel } from '@/components/common/panel';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import { SlaMark } from '@/components/common/sla-mark';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  type OverviewPoll,
  useSellerFlow,
  useSellerSlaTotals,
} from '@/features/shipments/hooks/use-seller-dashboard';
import {
  type FlowKind,
  flowStages,
} from '@/features/shipments/lib/shipment-flow';
import type {
  Shipment,
  ShipmentStatusCounts,
} from '@/features/shipments/types';
import { useFlip } from '@/hooks/use-flip';
import { useNow } from '@/hooks/use-now';
import { useRovingFocus } from '@/hooks/use-roving-focus';
import { formatShortDateTime } from '@/lib/format-date';
import { ROUTES } from '@/lib/routes';
import type { SlaState } from '@/lib/sla';
import { SHIPMENT_STATUS } from '@/lib/status-colors';
import { PIPELINE_STATUSES } from '@/lib/status-labels';
import { cn } from '@/lib/utils';

const SLA_REFRESH_MS = 60_000;

const KIND_LABEL: Record<FlowKind, string> = {
  onTrack: 'On track',
  dueSoon: 'Due soon',
  late: 'Late',
  none: 'No SLA',
};

const LEGEND: { kind: FlowKind; view?: string }[] = [
  { kind: 'onTrack', view: 'on-track' },
  { kind: 'dueSoon', view: 'due-soon' },
  { kind: 'late', view: 'late' },
  { kind: 'none' },
];

export function ShipmentFlow({
  counts,
  poll,
}: {
  counts: ShipmentStatusCounts;
  poll: OverviewPoll;
}) {
  const flow = useSellerFlow(poll);
  const totals = useSellerSlaTotals(poll);
  const active = PIPELINE_STATUSES.reduce(
    (sum, status) => sum + counts[status],
    0,
  );

  return (
    <Panel
      title="Shipment flow"
      description={`${active} active · one dot per shipment`}
      isEmpty={active === 0}
      emptyMessage="No open shipments."
    >
      <QueryState
        query={flow}
        skeleton={<QuerySkeleton variant="lines" />}
        errorMessage="Couldn't load the open shipments."
      >
        {({ data }) => (
          <FlowStages
            shipments={data}
            counts={counts}
            active={active}
            totals={totals}
          />
        )}
      </QueryState>
    </Panel>
  );
}

function FlowStages({
  shipments,
  counts,
  active,
  totals,
}: {
  shipments: Shipment[];
  counts: ShipmentStatusCounts;
  active: number;
  totals: ReturnType<typeof useSellerSlaTotals>;
}) {
  const now = useNow(SLA_REFRESH_MS);
  const list = useRef<HTMLOListElement>(null);
  useFlip(list);
  const roving = useRovingFocus(list, '[data-mark]');
  const stages = flowStages(shipments, counts, now);
  // Exact, from the lists the legend opens; the marks only draw the most urgent ones.
  const legend = totals && {
    ...totals,
    none: Math.max(active - totals.onTrack - totals.dueSoon - totals.late, 0),
  };

  return (
    <TooltipProvider>
      <ol ref={list} {...roving} className="flex gap-0.5 @max-[600px]:flex-col">
        {stages.map((stage) => (
          <li
            key={stage.status}
            // Proportional, with an empty stage still a thin door.
            style={{ flexGrow: Math.max(stage.count, 1) }}
            className={cn(
              'min-w-0 basis-0 rounded-md px-2.5 py-2 first:rounded-l-lg last:rounded-r-lg @max-[600px]:basis-auto',
              SHIPMENT_STATUS[stage.status].className,
            )}
          >
            <p aria-hidden className="flex items-baseline gap-1.5 text-xs">
              <span className="truncate font-medium">
                {SHIPMENT_STATUS[stage.status].label}
              </span>
              <span className="text-base font-semibold">{stage.count}</span>
            </p>
            <ul
              aria-label={stage.summary}
              className="mt-1.5 flex flex-wrap items-center"
            >
              {stage.marks.map(({ shipment, state, kind }) => (
                <li
                  key={shipment.id}
                  data-flip-id={shipment.id}
                  data-flip-group={stage.status}
                >
                  <FlowMark shipment={shipment} state={state} kind={kind} />
                </li>
              ))}
              {stage.hidden > 0 && (
                <li
                  aria-label={`${stage.hidden} more not drawn`}
                  className="px-1 text-xs font-medium"
                >
                  +{stage.hidden}
                </li>
              )}
            </ul>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
        {LEGEND.filter(({ kind }) => kind !== 'none' || legend?.none).map(
          ({ kind, view }) => {
            const content = (
              <>
                <SlaMark kind={kind} />
                {KIND_LABEL[kind]}{' '}
                <span className="font-semibold">{legend?.[kind] ?? '—'}</span>
              </>
            );
            return view ? (
              <Link
                key={kind}
                href={ROUTES.sellerShipmentList(`view=${view}`)}
                className="inline-flex items-center gap-1.5 rounded-sm outline-ring hover:underline focus-visible:outline-2 pointer-coarse:min-h-11"
              >
                {content}
              </Link>
            ) : (
              <span key={kind} className="inline-flex items-center gap-1.5">
                {content}
              </span>
            );
          },
        )}
        {shipments.length < active && (
          <span className="text-muted-foreground">
            Showing the {shipments.length} most urgent of {active}
          </span>
        )}
        <span className="ml-auto text-muted-foreground @max-[600px]:hidden">
          Hover or focus a dot for its details · a dot slides right when a
          carrier scans it
        </span>
      </div>
    </TooltipProvider>
  );
}

function FlowMark({
  shipment,
  state,
  kind,
}: {
  shipment: Shipment;
  state: SlaState;
  kind: FlowKind;
}) {
  const place = `${shipment.addressCity}/${shipment.addressState}`;
  // Late carries how late; the rest read as the legend does.
  const label = kind === 'late' ? state.label : KIND_LABEL[kind];
  const due = shipment.dueAt
    ? `, due ${formatShortDateTime(shipment.dueAt)}`
    : '';
  const name = `${shipment.trackingCode}, ${place}, ${shipment.modalityName}, ${label}${due}`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={ROUTES.sellerShipment(shipment.id)}
          aria-label={name}
          data-mark
          // 24 px target (WCAG 2.5.8) around the 10 px dot.
          className="grid size-6 place-items-center rounded-full outline-ring focus-visible:outline-2"
        >
          <SlaMark kind={kind} className="ring-2 ring-card" />
        </Link>
      </TooltipTrigger>
      <TooltipContent>{name}</TooltipContent>
    </Tooltip>
  );
}
