'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { PIPELINE_STATUSES } from '@/components/common/charts/pipeline-bar';
import { Panel } from '@/components/common/panel';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import { SlaMark } from '@/components/common/sla-mark';
import {
  type OverviewPoll,
  useSellerFlow,
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
import { formatTime } from '@/lib/format-date';
import { ROUTES } from '@/lib/routes';
import type { SlaState } from '@/lib/sla';
import { SHIPMENT_STATUS } from '@/lib/status-colors';
import { cn } from '@/lib/utils';

const SLA_REFRESH_MS = 60_000;

const LEGEND: { kind: FlowKind; label: string; view?: string }[] = [
  { kind: 'onTrack', label: 'On track', view: 'on-track' },
  { kind: 'dueSoon', label: 'Due soon', view: 'due-soon' },
  { kind: 'late', label: 'Late', view: 'late' },
  { kind: 'none', label: 'No SLA' },
];

export function ShipmentFlow({
  counts,
  poll,
}: {
  counts: ShipmentStatusCounts;
  poll: OverviewPoll;
}) {
  const flow = useSellerFlow(poll);
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
        {({ data }) => <FlowStages shipments={data} counts={counts} />}
      </QueryState>
    </Panel>
  );
}

function FlowStages({
  shipments,
  counts,
}: {
  shipments: Shipment[];
  counts: ShipmentStatusCounts;
}) {
  const now = useNow(SLA_REFRESH_MS);
  const list = useRef<HTMLOListElement>(null);
  useFlip(list);
  // shortcut: the legend counts the drawn marks, exact up to the 100 the list returns;
  // past that it needs per-state counts from the API.
  const { stages, totals } = flowStages(shipments, counts, now);

  return (
    <>
      <ol ref={list} className="flex gap-0.5 @max-[600px]:flex-col">
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
              className="mt-1.5 flex flex-wrap items-center gap-0.5"
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
                <li className="text-xs font-medium">+{stage.hidden}</li>
              )}
            </ul>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
        {LEGEND.filter(({ kind }) => kind !== 'none' || totals.none > 0).map(
          ({ kind, label, view }) => {
            const content = (
              <>
                <SlaMark kind={kind} />
                {label} <span className="font-semibold">{totals[kind]}</span>
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
        <span className="ml-auto text-muted-foreground @max-[600px]:hidden">
          Hover a dot for its code and due time · a dot slides right when a
          carrier scans it
        </span>
      </div>
    </>
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
  const label = kind === 'none' ? 'No SLA' : state.label;
  const due = shipment.dueAt ? ` · due ${formatTime(shipment.dueAt)}` : '';

  return (
    <Link
      href={ROUTES.sellerShipment(shipment.id)}
      aria-label={`${shipment.trackingCode}, ${place}, ${label}`}
      title={`${shipment.trackingCode} ${place} · ${shipment.modalityName} · ${label}${due}`}
      className="grid size-3.5 place-items-center rounded-full outline-ring focus-visible:outline-2"
    >
      <SlaMark kind={kind} className="ring-2 ring-card" />
    </Link>
  );
}
