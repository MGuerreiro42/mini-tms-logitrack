'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import {
  LiveIndicator,
  OfflineBanner,
} from '@/components/common/live-indicator';
import { ShipmentStepper } from '@/components/common/shipment-stepper';
import { ShipmentStatusBadge } from '@/components/ui/status-badge';
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
    <div className="space-y-4">
      <OfflineBanner status={liveStatus} />
      <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <ShipmentStatusBadge status={tracking.status} />
          <LiveIndicator status={liveStatus} />
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{tracking.modalityName}</span>
          <span>
            {tracking.addressCity}/{tracking.addressState}
          </span>
        </div>
        <ShipmentStepper status={tracking.status} events={tracking.events} />
        <TrackingTimeline events={tracking.events} status={tracking.status} />
      </div>
      <p className="text-center text-sm">
        <Link href="/track" className="text-primary hover:underline">
          Track another shipment
        </Link>
      </p>
    </div>
  );
}
