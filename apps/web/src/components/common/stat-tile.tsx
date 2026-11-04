'use client';

import type { ReactNode } from 'react';
import { useChangeSignal } from '@/hooks/use-change-signal';
import { cn } from '@/lib/utils';

interface StatTileProps {
  label: string;
  // A primitive, so a live change can be told apart from a re-render.
  value: string | number;
  note?: ReactNode;
  problem?: boolean;
}

export function StatTile({ label, value, note, problem }: StatTileProps) {
  const signal = useChangeSignal(value);

  return (
    <div className="relative isolate flex min-w-0 flex-col gap-2 rounded-xl bg-card px-5 py-4.5 shadow-panel">
      {signal > 0 && (
        <span
          key={signal}
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 animate-glow rounded-xl bg-live-halo opacity-0"
        />
      )}
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="text-[34px] leading-none font-semibold tracking-[-0.02em]">
        <span
          key={signal}
          className={cn('inline-block', signal > 0 && 'animate-value-in')}
        >
          {value}
        </span>
      </p>
      {note && (
        <p
          className={cn(
            'truncate text-xs',
            problem ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {note}
        </p>
      )}
    </div>
  );
}
