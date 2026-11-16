'use client';

import type { ReactNode } from 'react';
import { Sparkline } from '@/components/common/charts/sparkline';
import { cn } from '@/lib/utils';
import { type Pulse, usePulse } from '../hooks/use-pulse';

const SIMULATOR_WORDS = { off: 'Off', running: 'Running', idle: 'Idle' };
export const UNAVAILABLE = 'Unavailable';

// Before the first answer it reads "—". The Demo card shows this word even during Chaos Mode,
// whose label the strip shows in its place.
export function simulatorWord(pulse?: Pulse): string {
  if (!pulse) return '—';
  return pulse.simulator ? SIMULATOR_WORDS[pulse.simulator] : UNAVAILABLE;
}

const sum = (values: number[]) =>
  values.reduce((total, value) => total + value, 0);

export function PulseStrip() {
  const pulse = usePulse();

  return (
    <section
      aria-label="Platform pulse"
      className="rounded-xl bg-card px-5 py-4 shadow-panel"
    >
      {pulse.isError ? (
        <p role="status" className="text-sm text-muted-foreground">
          Pulse unavailable · retrying
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-6">
          <PulseItems pulse={pulse.data} />
        </dl>
      )}
    </section>
  );
}

// Before the first answer every item reads "—", so the strip keeps its height.
function PulseItems({ pulse }: { pulse?: Pulse }) {
  const pending = (value: ReactNode | null) =>
    pulse ? (value ?? UNAVAILABLE) : '—';
  const { eventsPerMinute: events, sockets, webhooks, queues } = pulse ?? {};

  return (
    <>
      <Item label="Events">
        <span className="flex items-center gap-3">
          {pending(events && `${events.at(-1)}/min`)}
          {events && <Sparkline values={events} />}
        </span>
      </Item>
      <Item label="Sockets">
        {pending(
          sockets &&
            `${sockets.internal + sockets.public} · ${sockets.public} public`,
        )}
      </Item>
      <Item label="Simulator">
        {pulse?.chaos ? (
          // Inline, so a wrapped label keeps the dot on its first line.
          <span>
            <span
              aria-hidden
              className="mr-1.5 inline-block size-2 rounded-full bg-warning align-middle"
            />
            Chaos · {pulse.chaos.label}
          </span>
        ) : (
          simulatorWord(pulse)
        )}
      </Item>
      <Item label="Webhooks · 1 h">
        {pending(
          webhooks &&
            (webhooks.successRate === null
              ? 'No deliveries'
              : [
                  `${webhooks.successRate.toFixed(1)}%`,
                  webhooks.p95Ms !== null && `p95 ${webhooks.p95Ms} ms`,
                ]
                  .filter(Boolean)
                  .join(' · ')),
        )}
      </Item>
      <Item label="Queues">
        {pending(
          queues?.length
            ? `${sum(queues.map((queue) => queue.waiting))} waiting · ${sum(queues.map((queue) => queue.failed))} failed`
            : null,
        )}
      </Item>
      <Item label="Data">
        {pulse ? (
          <span className="flex flex-wrap gap-x-3">
            <ServiceState name="Postgres" up={pulse.services.database} />
            <ServiceState name="Redis" up={pulse.services.redis} />
          </span>
        ) : (
          '—'
        )}
      </Item>
    </>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="text-[15px] font-semibold">{children}</dd>
    </div>
  );
}

// The word carries the state; the dot only repeats it.
function ServiceState({ name, up }: { name: string; up: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span
        aria-hidden
        className={cn('size-2 rounded-full', up ? 'bg-live' : 'bg-offline')}
      />
      {name} {up ? 'up' : 'down'}
    </span>
  );
}
