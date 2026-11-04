'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useChangeSignal } from '@/hooks/use-change-signal';
import { useNow } from '@/hooks/use-now';
import { formatTimeAgo } from '@/lib/format-date';
import type { LiveConnection, LiveStatus } from '@/lib/live-status';
import { cn } from '@/lib/utils';
import { reconnectSockets } from '@/services/websocket-client';

const STATES: Record<LiveStatus, { label: string; dot: string }> = {
  connecting: { label: 'Connecting…', dot: 'bg-chart-2' },
  live: { label: 'Live', dot: 'bg-live' },
  offline: { label: 'Offline', dot: 'bg-offline' },
};

const DROP_GRACE_MS = 1000;
const UPDATED_REFRESH_MS = 15_000;

// A drop shorter than the grace right after being live keeps reading "Live", so a blip doesn't flash the label.
function useSteadyStatus(status: LiveStatus): LiveStatus {
  const [shown, setShown] = useState(status);

  useEffect(() => {
    if (status === 'live' || shown !== 'live') {
      setShown(status);
      return;
    }
    const timeout = setTimeout(() => setShown(status), DROP_GRACE_MS);
    return () => clearTimeout(timeout);
  }, [status, shown]);

  return shown;
}

export function LiveIndicator({
  live,
  detail,
  className,
}: {
  live: LiveConnection;
  detail?: string;
  className?: string;
}) {
  const status = useSteadyStatus(live.status);
  const { label, dot } = STATES[status];
  const flash = useChangeSignal(live.lastEventAt?.getTime() ?? null);
  const now = useNow(UPDATED_REFRESH_MS);
  const note =
    detail ??
    (live.lastEventAt &&
      `Updated ${formatTimeAgo(live.lastEventAt.toISOString(), now)}`);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-[13px] font-semibold text-muted-foreground',
        className,
      )}
    >
      <span aria-hidden className="relative flex size-2">
        {status === 'live' && flash > 0 && (
          <span
            key={flash}
            className="absolute -inset-1 animate-glow rounded-full bg-live-halo opacity-0"
          />
        )}
        <span className={cn('relative size-2 rounded-full', dot)} />
      </span>
      <span role="status">{label}</span>
      {status === 'live' && note && <span className="-ml-1">· {note}</span>}
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
        className="text-notice-foreground"
        onClick={reconnect}
        disabled={isReconnecting}
      >
        {isReconnecting ? 'Reconnecting…' : 'Reconnect'}
      </Button>
    </div>
  );
}
