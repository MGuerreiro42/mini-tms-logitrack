'use client';

import { useEffect, useRef, useState } from 'react';
import { throttle } from '@/lib/throttle';

// The first change shows at once; later ones at most once per waitMs, ending on the latest.
export function useThrottledValue<T>(value: T, waitMs: number): T {
  const [shown, setShown] = useState(value);
  const latest = useRef(value);
  const [push] = useState(() =>
    throttle(() => setShown(latest.current), waitMs),
  );

  useEffect(() => push.cancel, [push]);
  useEffect(() => {
    if (Object.is(latest.current, value)) return;
    latest.current = value;
    push();
  }, [value, push]);

  return shown;
}
