'use client';

import Link from 'next/link';
import { LIVE_STATES } from '@/components/common/live-indicator';
import { useNavCounts } from '@/components/common/nav-counts';
import { RailTooltip } from '@/components/common/rail-tooltip';
import { cn } from '@/lib/utils';

const TONES = {
  live: LIVE_STATES.live.dot,
  connecting: LIVE_STATES.connecting.dot,
  offline: LIVE_STATES.offline.dot,
  warning: 'bg-warning',
  neutral: 'bg-muted-foreground',
};

// One footer line; in the rail it shrinks to its dot, named by a tooltip.
export function SidebarStatusRow({
  tone,
  label,
  href,
}: {
  tone: keyof typeof TONES;
  label: string;
  href?: string;
}) {
  const content = (
    <>
      <span
        aria-hidden
        className={cn('size-2 shrink-0 rounded-full', TONES[tone])}
      />
      <span className="truncate rail:sr-only">{label}</span>
    </>
  );
  const className =
    'flex min-h-6 items-center gap-2 rounded-sm px-2 text-xs text-muted-foreground rail:justify-center rail:px-0 pointer-coarse:min-h-9';
  return (
    <RailTooltip label={label}>
      {href ? (
        <Link
          href={href}
          className={cn(
            className,
            'outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset',
          )}
        >
          {content}
        </Link>
      ) : (
        <p className={className}>{content}</p>
      )}
    </RailTooltip>
  );
}

export function ConnectionStatusRow() {
  const { status } = useNavCounts();
  return (
    <SidebarStatusRow
      tone={status}
      label={
        status === 'offline'
          ? 'Reconnecting · counts may be stale'
          : LIVE_STATES[status].label
      }
    />
  );
}
