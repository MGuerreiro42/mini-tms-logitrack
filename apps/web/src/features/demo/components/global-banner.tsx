'use client';

import { useQueryClient } from '@tanstack/react-query';
import { XIcon, ZapIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNow } from '@/hooks/use-now';
import { useSession } from '@/hooks/use-session';
import { DEMO_EMAIL_DOMAIN } from '@/lib/demo';
import { formatLocalTime } from '@/lib/format-date';
import { formatCountdown } from '@/lib/format-duration';
import { demoKeys } from '../api';
import { useDemoStatus } from '../hooks/use-demo-status';
import { useEndChaos } from '../hooks/use-end-chaos';
import type { ChaosStatus } from '../types';

const INFO_DISMISSED_KEY = 'tms:demo-info-dismissed';
const TICK_MS = 1_000;

function ChaosBanner({
  chaos,
  left,
  canEnd,
}: {
  chaos: ChaosStatus;
  left: number;
  canEnd: boolean;
}) {
  const endChaos = useEndChaos();

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-warning px-safe-4 py-2.5 text-[13px] text-warning-foreground md:flex-nowrap md:px-safe-10 lg:px-8">
      <ZapIcon aria-hidden className="size-4 shrink-0" />
      <p className="min-w-0 flex-1 basis-60">
        <strong className="font-semibold">Chaos Mode: {chaos.label}.</strong>{' '}
        {chaos.description} Everyone on the demo sees this banner.
      </p>
      <span aria-hidden className="font-mono tabular-nums whitespace-nowrap">
        {formatCountdown(left)} left
      </span>
      {canEnd && (
        <Button
          variant="outline"
          size="sm"
          className="border-warning-foreground/40 bg-transparent text-warning-foreground shadow-none hover:bg-warning-foreground/10 hover:text-warning-foreground"
          disabled={endChaos.isPending}
          onClick={() => endChaos.mutate()}
        >
          {endChaos.isPending ? 'Ending…' : 'End now'}
        </Button>
      )}
    </div>
  );
}

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(INFO_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function DemoInfo({ nextResetAt }: { nextResetAt: string | null }) {
  const [dismissed, setDismissed] = useState(readDismissed);
  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(INFO_DISMISSED_KEY, '1');
    } catch {}
  };

  return (
    <div className="flex items-center gap-3 bg-muted px-safe-4 py-1.5 text-[13px] text-muted-foreground md:px-safe-10 lg:px-8">
      <p className="min-w-0 flex-1">
        You're using the shared public demo. Data resets daily
        {nextResetAt ? ` at ${formatLocalTime(nextResetAt)}` : ''}.
      </p>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Dismiss the demo notice"
        onClick={dismiss}
      >
        <XIcon aria-hidden />
      </Button>
    </div>
  );
}

// Mounted in every app shell; renders nothing off the demo deployment or when the API has no simulator.
export function GlobalBanner() {
  const session = useSession();
  const queryClient = useQueryClient();
  const { data } = useDemoStatus();
  const now = useNow(TICK_MS).getTime();
  const stored = data?.chaos ?? null;
  // Over at its local end even if the socket missed the end event; the refetch confirms it.
  const chaos = stored && Date.parse(stored.endsAt) > now ? stored : null;
  const expired = stored !== null && chaos === null;
  useEffect(() => {
    if (expired) void queryClient.invalidateQueries({ queryKey: demoKeys.all });
  }, [expired, queryClient]);
  // Announce the end only after a start was seen, never on a page that opens with none running.
  const [sawChaos, setSawChaos] = useState(false);
  if (chaos && !sawChaos) setSawChaos(true);
  if (!session || !data) return null;

  const announcement = chaos
    ? `Chaos Mode started: ${chaos.label}, ends at ${formatLocalTime(chaos.endsAt)}`
    : sawChaos
      ? 'Chaos Mode ended'
      : '';

  return (
    <div>
      <p role="status" className="sr-only">
        {announcement}
      </p>
      {chaos ? (
        <ChaosBanner
          chaos={chaos}
          left={Date.parse(chaos.endsAt) - now}
          canEnd={session.role === 'ADMIN'}
        />
      ) : (
        !stored &&
        session.email.endsWith(DEMO_EMAIL_DOMAIN) && (
          <DemoInfo nextResetAt={data.nextResetAt} />
        )
      )}
    </div>
  );
}
