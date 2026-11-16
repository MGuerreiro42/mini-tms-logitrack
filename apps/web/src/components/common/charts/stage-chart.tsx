'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDuration } from '@/lib/format-duration';
import { hasEnoughData, notEnoughNote } from '@/lib/metrics';

export interface StageRow {
  key: string;
  label: string;
  p50Hours: number | null;
  p90Hours: number | null;
  budgetHours: number | null;
  n: number;
}

const TICKS = 4;
const fmt = (hours: number | null) =>
  hours === null ? '—' : formatDuration(hours);

// A round step so the shared axis reads 0 · 6 h · 12 h · 18 h, not 0 · 5.3 h …
function axisMax(max: number): number {
  const raw = max / TICKS;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].find((m) => m * magnitude >= raw) ?? 10;
  return step * magnitude * TICKS;
}

// Too few samples: no bar, no median, no over-budget flag, in the chart and the table alike.
const isCharted = (row: StageRow) =>
  hasEnoughData(row.n) && row.p50Hours !== null;

const isOver = (row: StageRow) =>
  isCharted(row) &&
  row.budgetHours !== null &&
  (row.p50Hours as number) > row.budgetHours;

const summary = (row: StageRow) =>
  `${row.label}: median ${fmt(row.p50Hours)}, p90 ${fmt(row.p90Hours)}, budget ${fmt(row.budgetHours)}, n=${row.n}${isOver(row) ? ', over budget' : ''}`;

export function StageChart({ rows }: { rows: StageRow[] }) {
  const [asTable, setAsTable] = useState(false);
  const n = rows.reduce((sum, row) => sum + row.n, 0);
  const max = axisMax(
    Math.max(
      ...rows
        .filter(isCharted)
        .flatMap((row) => [
          row.p50Hours ?? 0,
          row.p90Hours ?? 0,
          row.budgetHours ?? 0,
        ]),
      1,
    ),
  );
  const at = (hours: number) => `${(hours / max) * 100}%`;

  return (
    <div className="flex flex-col gap-4">
      {asTable ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">Median</TableHead>
              <TableHead className="text-right">p90</TableHead>
              <TableHead className="text-right">Budget</TableHead>
              <TableHead className="text-right">n</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.key}>
                <TableCell>
                  {row.label}
                  {!isCharted(row) && (
                    <span className="block text-xs text-muted-foreground">
                      {notEnoughNote(row.n, 'data')}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {isCharted(row) ? fmt(row.p50Hours) : '—'}
                  {isOver(row) && (
                    <span className="block font-sans text-xs font-semibold text-destructive">
                      over budget
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {isCharted(row) ? fmt(row.p90Hours) : '—'}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {fmt(row.budgetHours)}
                </TableCell>
                <TableCell className="text-right font-mono">{row.n}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <li
              key={row.key}
              // biome-ignore lint/a11y/noNoninteractiveTabindex: a data mark whose tooltip opens on focus
              tabIndex={0}
              aria-label={
                isCharted(row)
                  ? summary(row)
                  : `${row.label}: ${notEnoughNote(row.n, 'data')}`
              }
              className="group relative grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 rounded-sm text-[13px] outline-ring focus-visible:outline-2 focus-visible:outline-offset-2 max-sm:grid-cols-1"
            >
              <span className="truncate text-muted-foreground">
                {row.label}
              </span>
              {isCharted(row) ? (
                <StageBar row={row} at={at} />
              ) : (
                <span className="text-muted-foreground">
                  {notEnoughNote(row.n, 'data')}
                </span>
              )}
            </li>
          ))}
          <li
            aria-hidden
            className="relative ml-[calc(7rem+0.75rem)] h-4 text-[11px] whitespace-nowrap tabular-nums text-muted-foreground max-sm:ml-0"
          >
            {Array.from({ length: TICKS + 1 }, (_, i) => (max / TICKS) * i).map(
              (hours) => (
                <span
                  key={hours}
                  className="absolute -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
                  style={{ left: at(hours) }}
                >
                  {hours === 0 ? '0' : fmt(hours)}
                </span>
              ),
            )}
          </li>
        </ul>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>Bar = median · Whisker = p90 · Tick = stage budget · n={n}</p>
        <Button variant="ghost" size="sm" onClick={() => setAsTable(!asTable)}>
          {asTable ? 'View as chart' : 'View as table'}
        </Button>
      </div>
    </div>
  );
}

function StageBar({
  row,
  at,
}: {
  row: StageRow;
  at: (hours: number) => string;
}) {
  const over = isOver(row);
  return (
    <div className="flex flex-col gap-1">
      <div aria-hidden className="relative h-3">
        <span
          className="absolute inset-y-0 left-0 rounded-r bg-chart-1"
          style={{ width: at(row.p50Hours ?? 0) }}
        />
        {row.p90Hours !== null && (
          <span
            className="absolute top-1/2 left-0 h-px bg-foreground/60"
            style={{
              left: at(row.p50Hours ?? 0),
              width: `calc(${at(row.p90Hours)} - ${at(row.p50Hours ?? 0)})`,
            }}
          >
            <span className="absolute -top-1 right-0 h-2.5 w-px bg-foreground/60" />
          </span>
        )}
        {row.budgetHours !== null && (
          <span
            className="absolute -inset-y-1 border-l border-dashed border-foreground"
            style={{ left: at(row.budgetHours) }}
          />
        )}
      </div>
      <p aria-hidden className="text-xs tabular-nums">
        {fmt(row.p50Hours)} · p90 {fmt(row.p90Hours)}
        {over && (
          <span className="ml-2 font-semibold text-destructive">
            over budget
          </span>
        )}
      </p>
      <span
        aria-hidden
        className="pointer-events-none absolute right-0 bottom-full z-10 mb-1 hidden rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10 group-hover:block group-focus-visible:block"
      >
        {summary(row)}
      </span>
    </div>
  );
}
