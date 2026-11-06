'use client';

import dynamic from 'next/dynamic';
import { useId, useState, useSyncExternalStore } from 'react';
import { useNow } from '@/hooks/use-now';
import { formatDuration } from '@/lib/format-duration';
import { subscribeNever } from '@/lib/subscribe-never';
import { isNewer } from '../lib/vehicle-motion';
import type { DeliveryMapProps, LastPosition } from '../types';
import type { DeliveryCanvasProps } from './delivery-map';
import { MapSkeleton, MapUnavailable } from './map-placeholder';

const STALE_CAPTION_S = 10;
const STALE_MARKER_S = 30;

// A failed chunk (offline, blocked CDN) degrades to the message instead of the error boundary.
const DeliveryCanvas = dynamic<DeliveryCanvasProps>(
  () => import('./delivery-map').catch(() => MapUnavailable),
  { ssr: false, loading: MapSkeleton },
);

// Keeps the newest position seen, so a refetch that raced a ping never moves the vehicle back.
function useLatestPosition(position: LastPosition | null) {
  // Device clocks drift, so age counts from when this client got the ping; only the fetched one has nothing better than recordedAt.
  const [seen, setSeen] = useState(
    () => position && { position, receivedAt: Date.parse(position.recordedAt) },
  );
  if (position && isNewer(position, seen?.position)) {
    setSeen({ position, receivedAt: Date.now() });
  }
  return position && seen;
}

function signalText(
  hasPosition: boolean,
  age: number | null,
  expectsVehicle: boolean,
) {
  if (!hasPosition)
    return expectsVehicle ? "Waiting for the vehicle's signal" : null;
  if (age === null || age <= STALE_CAPTION_S) return null;
  return `Last signal ${age < 60 ? `${age} s` : formatDuration(age / 3600)} ago`;
}

// The caption sits outside the lazy boundary: no layout shift while loading, and kept if the chunk fails.
export function LazyDeliveryMap(props: DeliveryMapProps) {
  const captionId = useId();
  const now = useNow(5000);
  const latest = useLatestPosition(props.position);
  // The age reads the client clock, so the server and hydration renders leave it out.
  const mounted = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  const age =
    mounted && latest
      ? Math.max(0, Math.floor((now.getTime() - latest.receivedAt) / 1000))
      : null;
  // The public link never shows the vehicle out for delivery, so it isn't waiting for one.
  const expectsVehicle =
    props.stage === 'IN_TRANSIT' ||
    (props.stage === 'OUT_FOR_DELIVERY' && !props.area);
  const signal = signalText(latest !== null, age, expectsVehicle);

  return (
    <figure aria-labelledby={captionId} className="flex flex-col gap-2.5">
      <DeliveryCanvas
        {...props}
        position={latest?.position ?? null}
        stale={age !== null && age > STALE_MARKER_S}
        captionId={captionId}
      />
      <figcaption id={captionId} className="text-[13px] text-muted-foreground">
        {props.caption}
        {signal && ` · ${signal}`}
      </figcaption>
    </figure>
  );
}
