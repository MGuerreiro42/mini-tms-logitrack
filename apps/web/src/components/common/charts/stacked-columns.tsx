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
import { cn } from '@/lib/utils';
import { AXIS_TICKS, axisMax } from './axis';

export interface StackedSeries {
  key: string;
  label: string;
  // A text colour class; segments paint with `bg-current`.
  className: string;
}

export interface StackedColumn {
  key: string;
  label: string;
  // One value per series, bottom segment first.
  values: number[];
}

const total = (column: StackedColumn) =>
  column.values.reduce((sum, value) => sum + value, 0);

// Parts of a whole over time: a 2 px gap between segments, a 4 px rounded data end on top,
// a tooltip per column on hover or focus, and a table view (spec 10 FR-028).
export function StackedColumns({
  series,
  columns,
  label,
}: {
  series: StackedSeries[];
  columns: StackedColumn[];
  label: string;
}) {
  const [asTable, setAsTable] = useState(false);
  const max = axisMax(Math.max(...columns.map(total), 1));
  const ticks = Array.from(
    { length: AXIS_TICKS + 1 },
    (_, index) => (max / AXIS_TICKS) * index,
  );
  const describe = (column: StackedColumn) =>
    `${column.label}: ${total(column)} — ${series.map((item, index) => `${item.label} ${column.values[index]}`).join(' · ')}`;
  const last = columns.at(-1);

  return (
    <div className="flex flex-col gap-3">
      {asTable ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Start</TableHead>
              {series.map((item) => (
                <TableHead key={item.key} className="text-right">
                  {item.label}
                </TableHead>
              ))}
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {columns.map((column) => (
              <TableRow key={column.key}>
                <TableCell>{column.label}</TableCell>
                {column.values.map((value, index) => (
                  <TableCell
                    key={series[index].key}
                    className="text-right font-mono"
                  >
                    {value}
                  </TableCell>
                ))}
                <TableCell className="text-right font-mono">
                  {total(column)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2">
          <div
            aria-hidden
            className="relative h-40 text-[11px] text-muted-foreground tabular-nums"
          >
            {ticks.map((tick) => (
              <span
                key={tick}
                className="absolute right-0 translate-y-1/2"
                style={{ bottom: `${(tick / max) * 100}%` }}
              >
                {tick}
              </span>
            ))}
          </div>
          <ul
            aria-label={label}
            className="relative flex h-40 items-end gap-1 border-b border-border"
          >
            {columns.map((column) => (
              <li
                key={column.key}
                // biome-ignore lint/a11y/noNoninteractiveTabindex: a data mark whose tooltip opens on focus
                tabIndex={0}
                aria-label={describe(column)}
                className="group relative flex h-full min-w-0 flex-1 flex-col-reverse gap-0.5 rounded-t-[4px] outline-ring focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {/* First in the DOM, so the top segment stays the last child (its rounded end). */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow-md ring-1 ring-foreground/10 group-hover:block group-focus-visible:block"
                >
                  {describe(column)}
                </span>
                {column.values.map((value, index) =>
                  value > 0 ? (
                    <span
                      key={series[index].key}
                      className={cn(
                        'bg-current last:rounded-t-[4px]',
                        series[index].className,
                      )}
                      style={{ height: `${(value / max) * 100}%` }}
                    />
                  ) : null,
                )}
              </li>
            ))}
            {last && (
              <li
                aria-hidden
                className="absolute right-0 text-xs font-semibold"
                style={{ bottom: `calc(${(total(last) / max) * 100}% + 2px)` }}
              >
                {total(last)}
              </li>
            )}
          </ul>
          <div
            aria-hidden
            className="col-start-2 flex justify-between pt-1 text-[11px] text-muted-foreground"
          >
            <span>{columns[0]?.label}</span>
            <span>{last?.label}</span>
          </div>
        </div>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="self-end"
        onClick={() => setAsTable(!asTable)}
      >
        {asTable ? 'View as chart' : 'View as table'}
      </Button>
    </div>
  );
}
