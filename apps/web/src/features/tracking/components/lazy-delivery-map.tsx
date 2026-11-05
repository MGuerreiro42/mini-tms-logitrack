'use client';

import dynamic from 'next/dynamic';
import type { DeliveryMapProps } from './delivery-map';
import { MapSkeleton, MapUnavailable } from './map-placeholder';

// A failed chunk (offline, blocked CDN) degrades to the message instead of the error boundary.
export const LazyDeliveryMap = dynamic<DeliveryMapProps>(
  () => import('./delivery-map').catch(() => MapUnavailable),
  { ssr: false, loading: MapSkeleton },
);
