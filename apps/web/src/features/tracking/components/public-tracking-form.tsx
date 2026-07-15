'use client';

import { useState } from 'react';
import {
  TrackingTimeline,
  type TrackingTimelineEvent,
} from '@/components/common/tracking-timeline';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShipmentStatusPill } from '@/components/ui/status-pill';
import { ApiError } from '@/services/api-client';
import { usePublicTrackingMutation } from '../hooks/use-public-tracking';

export function PublicTrackingForm() {
  const [code, setCode] = useState('');
  const trackingMutation = usePublicTrackingMutation();

  // The backend never sends `note` on this endpoint (SCREENS.md's privacy
  // stance) — TrackingTimeline's shared shape still expects the key, so it's
  // filled in as null here rather than forking the component for one prop.
  const timelineEvents: TrackingTimelineEvent[] =
    trackingMutation.data?.events.map((event, index) => ({
      id: `${event.status}-${index}`,
      status: event.status,
      note: null,
      createdAt: event.createdAt,
    })) ?? [];

  return (
    <div className="space-y-4">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (code.trim()) {
            trackingMutation.mutate(code.trim());
          }
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="trackingCode">Tracking code</Label>
          <Input
            id="trackingCode"
            placeholder="TMS-XXXXXXXXXXXX"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={trackingMutation.isPending || !code.trim()}
        >
          {trackingMutation.isPending ? 'Searching…' : 'Track shipment'}
        </Button>
      </form>

      {trackingMutation.isError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {trackingMutation.error instanceof ApiError &&
          trackingMutation.error.statusCode === 404
            ? "We couldn't find a shipment with this tracking code."
            : 'Something went wrong. Please try again.'}
        </p>
      )}

      {trackingMutation.data && (
        <div className="space-y-4 rounded-xl border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <ShipmentStatusPill status={trackingMutation.data.status} />
            <span className="text-sm text-muted-foreground">
              {trackingMutation.data.addressCity}/
              {trackingMutation.data.addressState}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {trackingMutation.data.modalityName}
          </p>
          <TrackingTimeline events={timelineEvents} />
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Public tracking doesn't expose the full address, internal notes, or
        seller/carrier identity.
      </p>
    </div>
  );
}
