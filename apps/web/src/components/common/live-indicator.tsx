'use client';

import { cn } from '@/lib/utils';
import { useRealtimeStore } from '@/store/realtime-store';

export function LiveIndicator({ className }: { className?: string }) {
  const connected = useRealtimeStore((state) => state.connected);

  return (
    <span
      role="status"
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'size-2 rounded-full',
          connected ? 'animate-pulse bg-emerald-500' : 'bg-amber-500',
        )}
      />
      {connected ? 'Live' : 'Reconnecting…'}
    </span>
  );
}
