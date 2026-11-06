'use client';

import { useEffect } from 'react';
import {
  LiveIndicator,
  OfflineBanner,
} from '@/components/common/live-indicator';
import { ShipmentStepper } from '@/components/common/shipment-stepper';
import { TextLink } from '@/components/common/text-link';
import { useChangeSignal } from '@/hooks/use-change-signal';
import { ROUTES } from '@/lib/routes';
import { SHIPMENT_STATUS, SHIPMENT_STATUS_DOT } from '@/lib/status-colors';
import { cn } from '@/lib/utils';
import { getPublicSocket } from '@/services/websocket-client';
import { usePositionSubscription } from '../hooks/use-position-subscription';
import {
  publicTrackingKey,
  usePublicTracking,
} from '../hooks/use-public-tracking';
import { usePublicTrackingSubscription } from '../hooks/use-public-tracking-subscription';
import { mapCaption, mapStage } from '../lib/map-stage';
import { trackingTitle } from '../lib/tracking-title';
import type { PositionEvent, PublicTracking } from '../types';
import { LazyDeliveryMap } from './lazy-delivery-map';
import { TrackingTimeline } from './tracking-timeline';

export function PublicTrackingDetails({
  initialData,
}: {
  initialData: PublicTracking;
}) {
  const code = initialData.trackingCode;
  const live = usePublicTrackingSubscription(code);
  const { data: tracking } = usePublicTracking(initialData, live.status);
  usePositionSubscription<PositionEvent>({
    getSocket: getPublicSocket,
    connectionKey: code,
    room: { event: 'subscribe:tracking', args: [code] },
    accepts: (event) => event.trackingCode === code,
    queryKey: publicTrackingKey(code),
  });
  const stage = mapStage(tracking.status);
  const title = trackingTitle(tracking);
  const statusSignal = useChangeSignal(tracking.status);
  const statusLabel = SHIPMENT_STATUS[tracking.status].label;

  // Route metadata is rendered once on the server, so a live status change has to retitle the tab here.
  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <div className="flex flex-col gap-6.5">
      <div className="flex items-start justify-between gap-5">
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="text-[13px] text-muted-foreground">
            Tracking code
          </span>
          <span className="truncate font-mono text-lg font-medium sm:text-[22px]">
            {tracking.trackingCode}
          </span>
        </div>
        <LiveIndicator
          live={live}
          className="h-8.5 shrink-0 rounded-lg bg-muted px-3 text-foreground"
        />
      </div>
      <OfflineBanner status={live.status} />
      <div className="flex flex-col gap-2.5">
        <h1
          className={cn(
            'text-[40px] leading-[1.05] font-semibold tracking-[-0.02em] lg:text-5xl',
            SHIPMENT_STATUS_DOT[tracking.status],
          )}
        >
          <span
            key={statusSignal}
            className={cn(
              'inline-block',
              statusSignal > 0 && 'animate-value-in',
            )}
          >
            {statusLabel}
          </span>
        </h1>
        <p aria-live="polite" className="sr-only">
          {statusSignal > 0 && `Status changed to ${statusLabel}`}
        </p>
        <p className="text-base text-muted-foreground">
          {tracking.addressCity}, {tracking.addressState} ·{' '}
          {tracking.modalityName}
        </p>
        <p className="text-[15px] text-muted-foreground">
          From {tracking.sellerName} · carried by {tracking.carrierName}
        </p>
      </div>
      {tracking.map && stage && (
        <LazyDeliveryMap
          route={tracking.map.route}
          area={{ center: tracking.map.cityCenter }}
          stage={stage}
          // The last mile stays private: once out for delivery, a cached ping must not show.
          position={stage === 'IN_TRANSIT' ? tracking.lastPosition : null}
          label={`Route to ${tracking.map.city}`}
          caption={mapCaption(stage, tracking.map.city)}
        />
      )}
      <ShipmentStepper status={tracking.status} events={tracking.events} />
      <TrackingTimeline events={tracking.events} status={tracking.status} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-muted pt-4.5 text-[13px] text-muted-foreground">
        <span>This page updates by itself. No need to refresh.</span>
        <TextLink href={ROUTES.track}>Track another shipment</TextLink>
      </div>
    </div>
  );
}
