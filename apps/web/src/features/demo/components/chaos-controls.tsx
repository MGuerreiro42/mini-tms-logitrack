'use client';

import { useId, useState } from 'react';
import { SegmentedControl } from '@/components/common/segmented-control';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/format-date';
import { formatCountdown } from '@/lib/format-duration';
import { useStartChaos } from '../hooks/use-admin-demo';
import { useEndChaos } from '../hooks/use-end-chaos';
import type { AdminChaos, AdminDemo, ChaosRun } from '../types';

const DURATIONS = [
  { value: '60', label: '1 min' },
  { value: '180', label: '3 min' },
  { value: '300', label: '5 min' },
] as const;
type Duration = (typeof DURATIONS)[number]['value'];

const END_REASONS: Record<ChaosRun['reason'], string> = {
  expired: 'Expired',
  admin: 'Ended by an admin',
  reset: 'Ended by the reset',
};

// `now` ticks in the Demo card, which derives the same Ending… state for its ring.
export function ChaosControls({ demo, now }: { demo: AdminDemo; now: number }) {
  const [duration, setDuration] = useState<Duration>('180');
  const start = useStartChaos();
  const blockedId = useId();
  const { chaos } = demo;
  // Past its end until the server ends it: still blocking, so Start can't meet a 409.
  const ending = !!chaos && Date.parse(chaos.endsAt) <= now;
  const coolingMs = demo.cooldownUntil
    ? Date.parse(demo.cooldownUntil) - now
    : 0;
  const blocked = chaos
    ? ending
      ? 'Ending…'
      : 'One scenario at a time'
    : coolingMs > 0
      ? `Available in ${formatCountdown(coolingMs)}`
      : null;
  const labelOf = (id: string) =>
    demo.scenarios.find((scenario) => scenario.id === id)?.label ?? id;

  return (
    <section
      aria-label="Chaos Mode"
      className="flex flex-col gap-3 border-t border-muted pt-3"
    >
      <h3 className="text-sm font-semibold">Chaos Mode</h3>
      {chaos ? (
        <RunningScenario chaos={chaos} now={now} ending={ending} />
      ) : (
        <SegmentedControl
          label="Duration"
          options={DURATIONS}
          value={duration}
          onChange={setDuration}
        />
      )}
      <ul aria-label="Scenarios">
        {demo.scenarios.map((scenario) => (
          <li
            key={scenario.id}
            className="flex items-center gap-3 border-t border-muted py-2.5 first:border-t-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{scenario.label}</p>
              <p className="text-[13px] text-muted-foreground">
                {scenario.description}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              aria-label={`Start ${scenario.label}`}
              aria-describedby={blocked ? blockedId : undefined}
              disabled={blocked !== null || start.isPending}
              onClick={() =>
                start.mutate({
                  scenario: scenario.id,
                  durationSec: Number(duration),
                })
              }
            >
              Start
            </Button>
          </li>
        ))}
      </ul>
      {blocked && (
        <p id={blockedId} className="text-[13px] text-muted-foreground">
          {blocked}
        </p>
      )}
      <h3 className="text-sm font-semibold">Last runs</h3>
      {demo.runs.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          No scenario has run yet.
        </p>
      ) : (
        <ul aria-label="Last runs" className="flex flex-col gap-1 text-[13px]">
          {demo.runs.map((run) => (
            <li key={run.startedAt}>
              {labelOf(run.scenario)} · {formatTime(run.startedAt)}–
              {formatTime(run.endedAt)} · {END_REASONS[run.reason]}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RunningScenario({
  chaos,
  now,
  ending,
}: {
  chaos: AdminChaos;
  now: number;
  ending: boolean;
}) {
  const endChaos = useEndChaos();
  const startedAt = Date.parse(chaos.startedAt);
  const progress = (now - startedAt) / (Date.parse(chaos.endsAt) - startedAt);

  return (
    <div className="flex flex-col gap-2 rounded-lg bg-muted p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{chaos.label}</p>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold">
          <span aria-hidden className="size-2 rounded-full bg-warning" />
          {ending ? 'Ending…' : 'Running'}
        </span>
      </div>
      {/* The times below carry the same information in words. */}
      <div aria-hidden className="h-1.5 overflow-hidden rounded-full bg-card">
        <div
          className="h-full bg-warning"
          style={{ width: `${Math.min(Math.max(progress, 0), 1) * 100}%` }}
        />
      </div>
      <p className="text-[13px] text-muted-foreground">
        Started {formatTime(chaos.startedAt)} · ends {formatTime(chaos.endsAt)}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        disabled={endChaos.isPending}
        onClick={() => endChaos.mutate()}
      >
        {endChaos.isPending ? 'Ending…' : 'End now'}
      </Button>
    </div>
  );
}
