import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatTileProps {
  label: string;
  value: ReactNode;
  note?: ReactNode;
  problem?: boolean;
}

export function StatTile({ label, value, note, problem }: StatTileProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl bg-card px-5 py-4.5 shadow-panel">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className="text-[34px] leading-none font-semibold tracking-[-0.02em]">
        {value}
      </p>
      {note && (
        <p
          className={cn(
            'truncate text-xs',
            problem ? 'text-destructive' : 'text-muted-foreground',
          )}
        >
          {note}
        </p>
      )}
    </div>
  );
}
