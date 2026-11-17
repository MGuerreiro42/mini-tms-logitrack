'use client';

import { useAutoAnimate } from '@formkit/auto-animate/react';
import { type FocusEvent, useId, useMemo, useState } from 'react';
import { TrackingCode } from '@/components/common/tracking-code';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/use-media-query';
import { formatTimeAgo } from '@/lib/format-date';
import { LIST_ANIMATION } from '@/lib/motion';
import { plural } from '@/lib/plural';
import { ROUTES } from '@/lib/routes';
import { previousStatus } from '@/lib/shipment-progress';
import { slaState } from '@/lib/sla';
import { SHIPMENT_STATUS_DOT } from '@/lib/status-colors';
import { SHIPMENT_STATUS_LABEL } from '@/lib/status-labels';
import { cn } from '@/lib/utils';
import { useActivityFeed } from '../hooks/use-activity-feed';
import type { ShipmentActivity } from '../types';
import { PanelLink } from './panel-link';

const HOUR_MS = 3_600_000;
const FEED_SIZE = 20;
// At 390 the feed keeps to the first rows of the last hour; "See all updates" follows.
const NARROW_ROWS = 4;

export function ActivityFeed({
  events,
  now,
}: {
  events: ShipmentActivity[];
  now: Date;
}) {
  const latest = useMemo(() => events.slice(0, FEED_SIZE), [events]);
  const [paused, setPaused] = useState(false);
  const [pointerInside, setPointerInside] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  // On touch screens the hover state sticks after a tap, so only real pointers hold arrivals.
  const canHover = useMediaQuery('(hover: hover)');
  const holding = paused || focusInside || (canHover && pointerInside);

  const { shown, freshIds, heldCount, apply, listKey } = useActivityFeed(
    latest,
    holding,
  );
  const hourAgo = now.getTime() - HOUR_MS;
  const lastHour = shown.filter(
    (event) => Date.parse(event.createdAt) >= hourAgo,
  );
  const earlier = shown.filter(
    (event) => Date.parse(event.createdAt) < hourAgo,
  );

  function leaveFocus(event: FocusEvent<HTMLDivElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setFocusInside(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex h-8 items-center justify-between gap-3">
        {paused ? (
          <span className="text-[13px] text-muted-foreground">
            Paused · {heldCount} new
          </span>
        ) : heldCount > 0 ? (
          <Button size="xs" variant="secondary" onClick={apply}>
            Show {plural(heldCount, 'new update')}
          </Button>
        ) : (
          <span />
        )}
        <Button
          size="xs"
          variant="ghost"
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? 'Back to live' : 'Pause updates'}
        </Button>
      </div>
      {shown.length === 0 ? (
        <p className="border-t border-muted py-3 text-sm text-muted-foreground">
          Status changes of your shipments show up here as they happen.
        </p>
      ) : (
        // Not a live region (spec 10 FR-032); remounted to skip entrance animations.
        // biome-ignore lint/a11y/noStaticElementInteractions: hover and focus only hold arrivals, they act on nothing
        <div
          key={listKey}
          className="flex flex-col gap-3"
          onPointerEnter={() => setPointerInside(true)}
          onPointerLeave={() => setPointerInside(false)}
          onFocus={() => setFocusInside(true)}
          onBlur={leaveFocus}
        >
          <ActivityGroup
            title="Last hour"
            events={lastHour}
            now={now}
            freshIds={freshIds}
          />
          <ActivityGroup
            title="Earlier today"
            events={earlier}
            now={now}
            freshIds={freshIds}
            className="@max-[600px]:hidden"
          />
        </div>
      )}
    </div>
  );
}

function ActivityGroup({
  title,
  events,
  now,
  freshIds,
  className,
}: {
  title: string;
  events: ShipmentActivity[];
  now: Date;
  freshIds: ReadonlySet<string>;
  className?: string;
}) {
  const [listRef] = useAutoAnimate<HTMLOListElement>(LIST_ANIMATION);
  const titleId = useId();
  if (events.length === 0) return null;

  return (
    <section className={className}>
      <h3
        id={titleId}
        className="flex justify-between text-xs font-medium text-muted-foreground"
      >
        {title} <span>{events.length}</span>
      </h3>
      <ol ref={listRef} aria-labelledby={titleId}>
        {events.map((event, index) => (
          <li
            key={event.id}
            className={cn(index >= NARROW_ROWS && '@max-[600px]:hidden')}
          >
            <ActivityLine
              event={event}
              now={now}
              fresh={freshIds.has(event.id)}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

// "Collected → In transit"; an outcome reads its verdict instead: "Delivered · Late by 3 h".
function ChangeText({ event }: { event: ShipmentActivity }) {
  const status = (
    <span className="font-semibold">{SHIPMENT_STATUS_LABEL[event.status]}</span>
  );
  if (event.status === 'DELIVERED') {
    const verdict =
      event.dueAt && slaState({ ...event, deliveredAt: event.createdAt }).label;
    return (
      <>
        {status}
        {verdict && ` · ${verdict}`}
      </>
    );
  }
  const from = previousStatus(event.status);
  return (
    <>
      {from && (
        <span className="text-muted-foreground">
          {SHIPMENT_STATUS_LABEL[from]} →{' '}
        </span>
      )}
      {status}
    </>
  );
}

function ActivityLine({
  event,
  now,
  fresh,
}: {
  event: ShipmentActivity;
  now: Date;
  fresh: boolean;
}) {
  return (
    <PanelLink
      href={ROUTES.sellerShipment(event.shipmentId)}
      className={cn(fresh && 'bg-live-halo')}
    >
      <span
        aria-hidden
        className={cn(
          'size-2.5 shrink-0 rounded-full bg-current',
          SHIPMENT_STATUS_DOT[event.status],
        )}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <TrackingCode code={event.trackingCode} className="text-[13px]" />
        {/* Status first on the second line, so a narrow screen truncates the city, not the change. */}
        <span className="truncate text-sm">
          <ChangeText event={event} />
          <span className="text-[13px] text-muted-foreground">
            {' · '}
            {event.city}
          </span>
        </span>
      </span>
      {fresh && (
        <span className="shrink-0 rounded-xs bg-card px-1.5 text-[11px] font-semibold">
          New
        </span>
      )}
      <time
        dateTime={event.createdAt}
        className="shrink-0 text-[13px] text-muted-foreground"
      >
        {formatTimeAgo(event.createdAt, now)}
      </time>
    </PanelLink>
  );
}
