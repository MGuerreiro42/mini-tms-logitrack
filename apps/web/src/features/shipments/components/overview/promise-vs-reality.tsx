'use client';

import { CircleAlertIcon } from 'lucide-react';
import { useState } from 'react';
import { Panel } from '@/components/common/panel';
import { QuerySkeleton, QueryState } from '@/components/common/query-state';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  type OverviewPoll,
  useSellerMetrics,
} from '@/features/shipments/hooks/use-seller-dashboard';
import { promiseSummary } from '@/features/shipments/lib/overview-rules';
import type { SellerMetrics } from '@/features/shipments/types';
import { type StatsWindow, windowLabel } from '@/hooks/use-stats-window';
import { formatDuration } from '@/lib/format-duration';
import {
  hasEnoughData,
  notEnoughNote,
  STAGE_LABEL,
  type StageDuration,
} from '@/lib/metrics';
import { cn } from '@/lib/utils';

const fmt = (hours: number | null) =>
  hours === null ? '—' : formatDuration(hours);
const label = (stage: StageDuration) =>
  STAGE_LABEL[stage.status] ?? stage.status;
const charted = (stage: StageDuration) =>
  hasEnoughData(stage.n) && stage.p50Hours !== null;
// Stages alternate two strengths of one hue: order, not status, tells them apart.
const SHADE = ['bg-primary', 'bg-primary/70'];

export function PromiseVsReality({
  statsWindow,
  poll,
}: {
  statsWindow: StatsWindow;
  poll: OverviewPoll;
}) {
  const metrics = useSellerMetrics(statsWindow, poll);
  const data = metrics.data;

  return (
    <section id="promise" className="scroll-mt-6">
      <Panel
        title={
          <>
            Promise against reality{' '}
            <span className="text-[13px] font-normal text-muted-foreground">
              · {windowLabel(statsWindow)}
            </span>
          </>
        }
        isEmpty={
          data !== undefined &&
          (data.slaMedianHours === null ||
            data.stages.every((stage) => stage.n === 0))
        }
        emptyMessage="Not enough data yet. Stages fill in as shipments move through them."
      >
        <QueryState
          query={metrics}
          skeleton={<QuerySkeleton variant="lines" />}
          errorMessage="Couldn't load the window's metrics."
        >
          {(loaded) => <PromiseBody metrics={loaded} />}
        </QueryState>
      </Panel>
    </section>
  );
}

function PromiseBody({
  metrics: { stages, slaMedianHours, medianDelivery },
}: {
  metrics: SellerMetrics;
}) {
  const [asTable, setAsTable] = useState(false);
  const sla = slaMedianHours ?? 0;
  const median = medianDelivery.hours;
  const max = Math.max(
    sla,
    median ?? 0,
    stages.reduce((sum, stage) => sum + (stage.p50Hours ?? 0), 0),
  );
  const width = (hours: number) => `${(hours / max) * 100}%`;
  const summary = `Promise: ${stages.map((stage) => `${label(stage)} ${fmt(stage.budgetHours)}`).join(', ')}. Reality, medians: ${stages
    .filter(charted)
    .map((stage) => `${label(stage)} ${fmt(stage.p50Hours)}`)
    .join(', ')}. Median delivery ${fmt(median)} of a ${fmt(sla)} SLA.`;

  return (
    <div className="grid gap-6 @min-[880px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
      <div className="flex flex-col gap-3">
        {asTable ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Stage</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Median</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.map((stage) => (
                <TableRow key={stage.status}>
                  <TableCell>{label(stage)}</TableCell>
                  <TableCell className="text-right font-mono">
                    {fmt(stage.budgetHours)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {charted(stage) ? fmt(stage.p50Hours) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div
            role="img"
            aria-label={summary}
            className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-[13px]"
          >
            <span className="text-muted-foreground">Promise</span>
            <Ribbon
              parts={stages.map((stage) => stage.budgetHours ?? 0)}
              width={width}
            />
            <span className="text-muted-foreground">Reality</span>
            <span className="relative">
              <Ribbon
                parts={stages.map((stage) =>
                  charted(stage) ? (stage.p50Hours ?? 0) : 0,
                )}
                width={width}
              />
              {median !== null && (
                <span
                  className="absolute -inset-y-1 w-px bg-foreground"
                  style={{ left: width(median) }}
                />
              )}
            </span>
            <span />
            <span className="relative h-4 text-[11px] text-muted-foreground">
              <span className="absolute left-0">0 h</span>
              {median !== null && (
                <span
                  className="absolute -translate-x-1/2 font-medium text-foreground"
                  style={{ left: width(median) }}
                >
                  {fmt(median)} of a {fmt(sla)} SLA
                </span>
              )}
              <span className="absolute right-0">{fmt(max)}</span>
            </span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Promise: each stage's share of your {fmt(sla)} median SLA. Reality:
          the median time of each stage, one after another.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="self-end"
          onClick={() => setAsTable(!asTable)}
        >
          {asTable ? 'View as chart' : 'View as table'}
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        <SlowTail stages={stages} />
        <p className="text-[13px]">
          {promiseSummary(stages, median, slaMedianHours)}
        </p>
      </div>
    </div>
  );
}

// Each stage laid end to end; a stage with nothing to draw leaves no gap.
function Ribbon({
  parts,
  width,
}: {
  parts: number[];
  width: (hours: number) => string;
}) {
  return (
    <span className="flex h-3 gap-0.5">
      {parts.map((hours, index) =>
        hours > 0 ? (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: stages keep their order
            key={index}
            className={cn('rounded-xs', SHADE[index % SHADE.length])}
            style={{ width: width(hours) }}
          />
        ) : null,
      )}
    </span>
  );
}

function SlowTail({ stages }: { stages: StageDuration[] }) {
  return (
    <Table>
      <caption className="mb-2 text-left text-[13px] font-semibold">
        The slow tail: slowest 10% per stage
      </caption>
      <TableHeader>
        <TableRow>
          <TableHead>Stage</TableHead>
          <TableHead className="text-right">p90</TableHead>
          <TableHead className="text-right">Budget</TableHead>
          <TableHead className="text-right">n</TableHead>
          <TableHead>State</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stages.map((stage) => {
          const enough = hasEnoughData(stage.n) && stage.p90Hours !== null;
          const over =
            enough && stage.budgetHours !== null
              ? (stage.p90Hours as number) - stage.budgetHours
              : 0;
          return (
            <TableRow key={stage.status}>
              <TableCell>{label(stage)}</TableCell>
              <TableCell
                className={cn(
                  'text-right font-mono',
                  over > 0 && 'font-semibold text-sla-late',
                )}
              >
                {enough ? fmt(stage.p90Hours) : '—'}
              </TableCell>
              <TableCell className="text-right font-mono">
                {fmt(stage.budgetHours)}
              </TableCell>
              <TableCell className="text-right font-mono">{stage.n}</TableCell>
              <TableCell>
                {!enough ? (
                  <span className="text-muted-foreground">
                    {notEnoughNote(stage.n, 'data')}
                  </span>
                ) : over > 0 ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-sla-late">
                    <CircleAlertIcon aria-hidden className="size-3.5" />+
                    {fmt(over)}
                  </span>
                ) : (
                  'within'
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
