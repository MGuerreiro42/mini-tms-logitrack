'use client';

import { useCallback, useEffect, useState } from 'react';
import { MAX_ANIMATED_ARRIVALS, newArrivals } from '../lib/activity-feed';
import type { ShipmentActivity } from '../types';

const NEW_MARK_MS = 3000;

// Keeps what is on screen apart from what the API returned, so arrivals can be held and marked as new.
export function useActivityFeed<T extends ShipmentActivity>(
  latest: T[],
  holding: boolean,
) {
  const [shown, setShown] = useState(latest);
  const [freshIds, setFreshIds] = useState<ReadonlySet<string>>(new Set());
  const [listKey, setListKey] = useState(0);

  const apply = useCallback(() => {
    const incoming = newArrivals(shown, latest);
    if (incoming.length === 0) return;

    setShown(latest);
    if (
      incoming.length <= MAX_ANIMATED_ARRIVALS &&
      document.visibilityState === 'visible'
    ) {
      setFreshIds(new Set(incoming.map((event) => event.id)));
    } else {
      // A remounted list renders its items without entrance animations.
      setListKey((key) => key + 1);
    }
  }, [latest, shown]);

  useEffect(() => {
    if (!holding) apply();
  }, [holding, apply]);

  useEffect(() => {
    if (freshIds.size === 0) return;
    const timeout = setTimeout(() => setFreshIds(new Set()), NEW_MARK_MS);
    return () => clearTimeout(timeout);
  }, [freshIds]);

  return {
    shown,
    freshIds,
    heldCount: holding ? newArrivals(shown, latest).length : 0,
    apply,
    listKey,
  };
}
