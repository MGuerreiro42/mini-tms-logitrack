'use client';

import { createContext, use, useEffect, useRef, useState } from 'react';
import { useChangeSignal } from '@/hooks/use-change-signal';
import type { LiveStatus } from '@/lib/live-status';
import { plural } from '@/lib/plural';
import { throttle } from '@/lib/throttle';
import { cn } from '@/lib/utils';

export interface NavCounts {
  counts?: Partial<Record<string, number>>;
  status: LiveStatus;
}

// A feature provides the counts (app/*/layout.tsx composes it), so shared code never imports one.
export const NavCountsContext = createContext<NavCounts>({
  status: 'connecting',
});

export const useNavCounts = () => use(NavCountsContext);

const ANNOUNCE_WINDOW_MS = 10_000;
const MAX_SHOWN = 99;

const TONES: Partial<Record<string, string>> = {
  exceptions: 'bg-destructive-tint text-destructive',
  // The tables' late tone; on dark it needs the nav surface to keep 4.5:1.
  late: 'bg-late-row text-destructive dark:bg-nav dark:text-status-failed-delivery-dot',
};

// Visually a pill; for assistive tech the link's name gains ", <n> shipments".
export function CountPill({ countKey }: { countKey: string }) {
  const { counts, status } = useNavCounts();
  const count = counts?.[countKey] ?? 0;
  const signal = useChangeSignal(count);
  if (count === 0) return null;

  const tone = TONES[countKey];
  return (
    <>
      <span className="sr-only">, {plural(count, 'shipment')}</span>
      <span
        aria-hidden
        data-tone={tone ? countKey : undefined}
        className={cn(
          'ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center gap-1 rounded-xs border border-transparent px-1.5 text-xs tabular-nums',
          tone
            ? [
                tone,
                'font-semibold',
                status !== 'live' && 'border-current bg-transparent',
              ]
            : 'text-muted-foreground',
        )}
      >
        {tone && <span className="size-1.5 rounded-full bg-current" />}
        <span key={signal} className={cn(signal > 0 && 'animate-value-in')}>
          {count > MAX_SHOWN ? `${MAX_SHOWN}+` : count}
        </span>
      </span>
    </>
  );
}

// Only rises of the open Exceptions count are announced, at most one per 10 s with the latest value.
export function ExceptionsAnnouncer() {
  const value = useNavCounts().counts?.exceptions;
  const [message, setMessage] = useState('');
  const latest = useRef(value);
  const [announce] = useState(() =>
    throttle(
      () => setMessage(`Exceptions: ${latest.current} open`),
      ANNOUNCE_WINDOW_MS,
    ),
  );

  useEffect(() => announce.cancel, [announce]);
  useEffect(() => {
    const previous = latest.current;
    latest.current = value;
    if (previous !== undefined && value !== undefined && value > previous) {
      announce();
    }
  }, [value, announce]);

  return (
    <p role="status" className="sr-only">
      {message}
    </p>
  );
}
