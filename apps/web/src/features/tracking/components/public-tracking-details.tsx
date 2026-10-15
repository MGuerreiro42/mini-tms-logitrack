'use client';

import { useEffect } from 'react';
import {
  LiveIndicator,
  OfflineBanner,
} from '@/components/common/live-indicator';
import { ShipmentStepper } from '@/components/common/shipment-stepper';
import { TextLink } from '@/components/common/text-link';
import { ROUTES } from '@/lib/routes';
import { SHIPMENT_STATUS, SHIPMENT_STATUS_DOT } from '@/lib/status-colors';
import { cn } from '@/lib/utils';
import { usePublicTracking } from '../hooks/use-public-tracking';
import { usePublicTrackingSubscription } from '../hooks/use-public-tracking-subscription';
import { trackingTitle } from '../lib/tracking-title';
import type { PublicTracking } from '../types';
import { TrackingTimeline } from './tracking-timeline';

export function PublicTrackingDetails({
  initialData,
}: {
  initialData: PublicTracking;
}) {
  const liveStatus = usePublicTrackingSubscription(initialData.trackingCode);
  const { data: tracking } = usePublicTracking(initialData, liveStatus);
  const title = trackingTitle(tracking);

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
          status={liveStatus}
          className="h-8.5 shrink-0 rounded-lg bg-muted px-3 text-foreground"
        />
      </div>
      <OfflineBanner status={liveStatus} />
      <div className="flex flex-col gap-2.5">
        <h1
          className={cn(
            'text-[40px] leading-[1.05] font-semibold tracking-[-0.02em] lg:text-5xl',
            SHIPMENT_STATUS_DOT[tracking.status],
          )}
        >
          {SHIPMENT_STATUS[tracking.status].label}
        </h1>
        <p className="text-base text-muted-foreground">
          {tracking.addressCity}, {tracking.addressState} ·{' '}
          {tracking.modalityName}
        </p>
      </div>
      <ShipmentStepper status={tracking.status} events={tracking.events} />
      <TrackingTimeline events={tracking.events} status={tracking.status} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-muted pt-4.5 text-[13px] text-muted-foreground">
        <span>This page updates by itself. No need to refresh.</span>
        <TextLink href={ROUTES.track}>Track another shipment</TextLink>
      </div>
    </div>
  );
}
