'use client';

import { useEffect, useRef, useState } from 'react';

const SIGNAL_WINDOW_MS = 600;

// Counts changes of `value` after mount, at most one per window and none while the tab is hidden.
// Key a decorative overlay with the count to replay its animation without remounting the content.
export function useChangeSignal<T>(value: T): number {
  const previous = useRef(value);
  const lastSignalAt = useRef(0);
  const [signal, setSignal] = useState(0);

  useEffect(() => {
    if (Object.is(previous.current, value)) return;
    previous.current = value;

    const now = Date.now();
    if (
      document.visibilityState === 'hidden' ||
      now - lastSignalAt.current < SIGNAL_WINDOW_MS
    ) {
      return;
    }
    lastSignalAt.current = now;
    setSignal((count) => count + 1);
  }, [value]);

  return signal;
}
