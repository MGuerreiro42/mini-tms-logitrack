import type { LiveStatus } from '@/lib/live-status';
import { cn } from '@/lib/utils';

const STATES: Record<LiveStatus, { label: string; dot: string }> = {
  connecting: {
    label: 'Connecting…',
    dot: 'animate-pulse bg-muted-foreground',
  },
  live: { label: 'Live', dot: 'animate-pulse bg-live' },
  offline: {
    label: 'Offline · updates refresh every few seconds',
    dot: 'bg-status-out-for-delivery-dot',
  },
};

export function LiveIndicator({
  status,
  className,
}: {
  status: LiveStatus;
  className?: string;
}) {
  const { label, dot } = STATES[status];

  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground',
        className,
      )}
    >
      <span aria-hidden className={cn('size-2 rounded-full', dot)} />
      {label}
    </span>
  );
}
