'use client';

import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useChangeSignal } from '@/hooks/use-change-signal';
import { cn } from '@/lib/utils';

interface StatTileProps {
  label: string;
  // A primitive, so a live change can be told apart from a re-render.
  value: string | number;
  note?: ReactNode;
  problem?: boolean;
  // The list filtered to exactly this number.
  href?: string;
}

export function StatTile({ label, value, note, problem, href }: StatTileProps) {
  const signal = useChangeSignal(value);
  const tile =
    'group relative isolate flex min-w-0 flex-col gap-2 rounded-xl bg-card px-5 py-4.5 shadow-panel';
  const content = (
    <>
      {signal > 0 && (
        <span
          key={signal}
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 animate-glow rounded-xl bg-live-halo opacity-0"
        />
      )}
      <p className="flex items-center justify-between gap-2 text-[13px] text-muted-foreground">
        {label}
        {href && (
          <ArrowRightIcon
            aria-hidden
            className="size-4 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          />
        )}
      </p>
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
    </>
  );

  if (!href) return <div className={tile}>{content}</div>;
  return (
    // An outline, not a ring: it survives forced-colors mode.
    <Link
      href={href}
      className={cn(
        tile,
        'transition-colors outline-ring hover:bg-selected focus-visible:outline-2 focus-visible:outline-offset-2',
      )}
    >
      {content}
    </Link>
  );
}
