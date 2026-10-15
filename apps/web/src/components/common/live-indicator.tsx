'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { LiveStatus } from '@/lib/live-status';
import { cn } from '@/lib/utils';
import { reconnectSockets } from '@/services/websocket-client';

const STATES: Record<LiveStatus, { label: string; dot: string }> = {
  connecting: { label: 'Connecting…', dot: 'bg-chart-2' },
  live: { label: 'Live', dot: 'bg-live' },
  offline: { label: 'Offline', dot: 'bg-offline' },
};

export function LiveIndicator({
  status,
  detail,
  className,
}: {
  status: LiveStatus;
  detail?: string;
  className?: string;
}) {
  const { label, dot } = STATES[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-[13px] font-semibold text-muted-foreground',
        className,
      )}
    >
      <span aria-hidden className="relative flex size-2">
        {status === 'live' && (
          <span className="absolute -inset-1 rounded-full animate-pulse bg-live-halo" />
        )}
        <span className={cn('relative size-2 rounded-full', dot)} />
      </span>
      <span role="status">{label}</span>
      {status === 'live' && detail && <span className="-ml-1">· {detail}</span>}
    </span>
  );
}

export function OfflineBanner({ status }: { status: LiveStatus }) {
  const [isReconnecting, setIsReconnecting] = useState(false);

  if (status !== 'offline') return null;

  function reconnect() {
    setIsReconnecting(true);
    reconnectSockets().finally(() => setIsReconnecting(false));
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-notice px-4 py-3 text-sm text-notice-foreground">
      <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-offline" />
      <p className="min-w-0 flex-1">
        <span className="font-semibold">Live updates paused.</span> We'll
        refresh every few seconds until the connection is back.
      </p>
      <Button
        size="sm"
        variant="outline"
        className="text-notice-foreground pointer-coarse:h-11"
        onClick={reconnect}
        disabled={isReconnecting}
      >
        {isReconnecting ? 'Reconnecting…' : 'Reconnect'}
      </Button>
    </div>
  );
}
