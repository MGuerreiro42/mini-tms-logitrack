'use client';

import { useAutoAnimate } from '@formkit/auto-animate/react';
import { type FocusEvent, useMemo, useState } from 'react';
import { TrackingCode } from '@/components/common/tracking-code';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useNow } from '@/hooks/use-now';
import { formatTimeAgo } from '@/lib/format-date';
import { LIST_ANIMATION } from '@/lib/motion';
import { plural } from '@/lib/plural';
import { ROUTES } from '@/lib/routes';
import { SHIPMENT_STATUS_DOT } from '@/lib/status-colors';
import { SHIPMENT_STATUS_LABEL } from '@/lib/status-labels';
import { cn } from '@/lib/utils';
import { useActivityFeed } from '../hooks/use-activity-feed';
import { type ActivityGroup, groupActivity } from '../lib/activity-feed';
import type { ShipmentActivity } from '../types';
import { PanelLink } from './panel-link';

const TIME_REFRESH_MS = 15_000;

export function ActivityFeed({ events }: { events: ShipmentActivity[] }) {
  const groups = useMemo(() => groupActivity(events), [events]);
  const [paused, setPaused] = useState(false);
  const [pointerInside, setPointerInside] = useState(false);
  const [focusInside, setFocusInside] = useState(false);
  // On touch screens the hover state sticks after a tap, so only real pointers hold arrivals.
  const canHover = useMediaQuery('(hover: hover)');
  const holding = paused || focusInside || (canHover && pointerInside);

  const { shown, freshIds, heldCount, apply, listKey } = useActivityFeed(
    groups,
    holding,
  );
  const [listRef] = useAutoAnimate<HTMLOListElement>(LIST_ANIMATION);
  const now = useNow(TIME_REFRESH_MS);

  function leaveFocus(event: FocusEvent<HTMLOListElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setFocusInside(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex h-8 items-center justify-between gap-3">
        {heldCount > 0 ? (
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
          {paused ? 'Resume updates' : 'Pause updates'}
        </Button>
      </div>
      {shown.length === 0 ? (
        <p className="border-t border-muted py-3 text-sm text-muted-foreground">
          Status changes of your shipments show up here as they happen.
        </p>
      ) : (
        <ol
          key={listKey}
          ref={listRef}
          role="log"
          aria-label="Recent updates"
          onPointerEnter={() => setPointerInside(true)}
          onPointerLeave={() => setPointerInside(false)}
          onFocus={() => setFocusInside(true)}
          onBlur={leaveFocus}
        >
          {shown.map((event) => (
            <li key={event.id}>
              <ActivityLine
                event={event}
                now={now}
                fresh={freshIds.has(event.id)}
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ActivityLine({
  event,
  now,
  fresh,
}: {
  event: ActivityGroup;
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
          {event.previousStatus && (
            <span className="text-muted-foreground">
              {SHIPMENT_STATUS_LABEL[event.previousStatus]} →{' '}
            </span>
          )}
          <span className="font-semibold">
            {SHIPMENT_STATUS_LABEL[event.status]}
          </span>
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
