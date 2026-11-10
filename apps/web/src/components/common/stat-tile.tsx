'use client';

import { ArrowRightIcon, InfoIcon } from 'lucide-react';
import Link from 'next/link';
import { Popover } from 'radix-ui';
import type { ReactNode } from 'react';
import { Sparkline } from '@/components/common/charts/sparkline';
import { useChangeSignal } from '@/hooks/use-change-signal';
import { cn } from '@/lib/utils';

const TONE_CLASS = {
  critical: 'text-destructive',
  caution: 'text-notice-foreground',
};

interface StatTileProps {
  label: string;
  // A primitive, so a live change can be told apart from a re-render.
  value: string | number;
  // "now" or the window ("30 d"), after the label.
  scope?: string;
  note?: ReactNode;
  // Colours the value only, never the card; the label and note carry the meaning.
  tone?: keyof typeof TONE_CLASS;
  // The formula, n and window, behind an info button.
  definition?: ReactNode;
  sparkline?: (number | null)[];
  target?: number;
  // The list filtered to exactly this number, and what opening it does.
  href?: string;
  linkLabel?: string;
}

export function StatTile({
  label,
  value,
  scope,
  note,
  tone,
  definition,
  sparkline,
  target,
  href,
  linkLabel,
}: StatTileProps) {
  const signal = useChangeSignal(value);
  const heading = (
    <>
      {label}
      {scope && <span className="text-muted-foreground"> · {scope}</span>}
    </>
  );

  return (
    <div
      className={cn(
        'group relative isolate flex min-w-0 flex-col gap-2 rounded-xl bg-card px-5 py-4.5 shadow-panel',
        // An outline, not a ring: it survives forced-colors mode.
        href &&
          'transition-colors outline-ring has-[a:hover]:bg-selected has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2',
      )}
    >
      {signal > 0 && (
        <span
          key={signal}
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 animate-glow rounded-xl bg-live-halo opacity-0"
        />
      )}
      <div className="flex items-center justify-between gap-2 text-[13px] text-muted-foreground">
        {href ? (
          // Stretched over the card, so the info button stays a sibling, not a nested control.
          <Link
            href={href}
            aria-label={[
              `${[label, scope].filter(Boolean).join(' ')}, ${value}`,
              linkLabel,
            ]
              .filter(Boolean)
              .join('. ')}
            className="outline-none after:absolute after:inset-0 after:rounded-xl"
          >
            {heading}
          </Link>
        ) : (
          <p>{heading}</p>
        )}
        <span className="flex items-center gap-1">
          {href && (
            <ArrowRightIcon
              aria-hidden
              className="size-4 opacity-0 transition-opacity group-hover:opacity-100 group-has-[a:focus-visible]:opacity-100"
            />
          )}
          {definition && <Definition label={label}>{definition}</Definition>}
        </span>
      </div>
      {/* The sparkline drops under the value when the tile is narrow. */}
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
        <p
          className={cn(
            'text-[34px] leading-none font-semibold tracking-[-0.02em]',
            tone && TONE_CLASS[tone],
          )}
        >
          <span
            key={signal}
            className={cn('inline-block', signal > 0 && 'animate-value-in')}
          >
            {value}
          </span>
        </p>
        {sparkline && <Sparkline values={sparkline} target={target} />}
      </div>
      {note && <p className="truncate text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

function Definition({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={`About ${label}`}
        className="relative z-10 -m-1 grid size-6 place-items-center rounded-full text-muted-foreground outline-ring hover:text-foreground focus-visible:outline-2 pointer-coarse:size-8"
      >
        <InfoIcon aria-hidden className="size-3.5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          aria-label={`${label} definition`}
          side="bottom"
          align="end"
          sideOffset={6}
          collisionPadding={16}
          className="z-50 max-w-72 rounded-lg bg-popover p-3 text-[13px] leading-relaxed text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
