import type { ReactNode } from 'react';
import { hasEnoughData, ON_TIME_TARGET } from '@/lib/metrics';

export interface OnTimeRow {
  key: string;
  label: ReactNode;
  rate: number | null;
  n: number;
}

// Text carries every number; the meter only repeats the rate for the eye.
export function OnTimeRows({ rows }: { rows: OnTimeRow[] }) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3.5">
        {rows.map(({ key, label, rate, n }) => {
          const enough = rate !== null && hasEnoughData(n);
          return (
            <li key={key} className="flex flex-col gap-1.5 text-[13px]">
              <div className="flex items-baseline gap-2">
                <span className="min-w-0 truncate font-medium">{label}</span>
                <span className="ml-auto tabular-nums">
                  {enough ? `${rate.toFixed(1)}%` : '—'}
                </span>
                <span className="w-28 shrink-0 text-right whitespace-nowrap text-muted-foreground tabular-nums">
                  {enough ? `n=${n}` : `n=${n}, not enough`}
                </span>
              </div>
              {enough && (
                <div
                  aria-hidden
                  className="relative h-1.5 rounded-full bg-chart-2"
                >
                  <div
                    className="h-full rounded-full bg-chart-1"
                    style={{ width: `${rate}%` }}
                  />
                  <span
                    className="absolute -top-1 h-3.5 w-0.5 rounded-full bg-foreground/70"
                    style={{ left: `${ON_TIME_TARGET}%` }}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">
        Tick = target {ON_TIME_TARGET}%
      </p>
    </div>
  );
}
