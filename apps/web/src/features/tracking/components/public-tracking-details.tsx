'use client';

import Link from 'next/link';
import { LiveIndicator } from '@/components/common/live-indicator';
import { TrackingTimeline } from '@/components/common/tracking-timeline';
import { ShipmentStatusPill } from '@/components/ui/status-pill';
import { usePublicTracking } from '../hooks/use-public-tracking';
import { usePublicTrackingSubscription } from '../hooks/use-public-tracking-subscription';
import type { PublicTracking } from '../types';

export function PublicTrackingDetails({
  initialData,
}: {
  initialData: PublicTracking;
}) {
  const { data: tracking } = usePublicTracking(initialData);
  usePublicTrackingSubscription(tracking.trackingCode);

  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <ShipmentStatusPill status={tracking.status} />
          <LiveIndicator />
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{tracking.modalityName}</span>
          <span>
            {tracking.addressCity}/{tracking.addressState}
          </span>
        </div>
        <TrackingTimeline events={tracking.events} />
      </div>
      <p className="text-center text-sm">
        <Link href="/track" className="text-primary hover:underline">
          Track another shipment
        </Link>
      </p>
    </div>
  );
}
