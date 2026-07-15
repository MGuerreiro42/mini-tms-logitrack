'use client';

import { useMutation } from '@tanstack/react-query';
import { getPublicTracking } from '../api';

// A mutation, not a query — this is a one-shot lookup triggered by the
// visitor submitting a code, not something to keep fresh in the background
// (no session, no WebSocket room to subscribe to on this screen).
export function usePublicTrackingMutation() {
  return useMutation({
    mutationFn: (trackingCode: string) => getPublicTracking(trackingCode),
  });
}
