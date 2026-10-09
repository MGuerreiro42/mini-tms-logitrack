import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export type IndicatorShape = 'line' | 'dot' | 'dashed';

export function ChartIndicator({
  shape,
  color,
  nested,
}: {
  shape: IndicatorShape;
  color?: string;
  nested: boolean;
}) {
  return (
    <div
      className={cn(
        'shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)',
        {
          'h-2.5 w-2.5': shape === 'dot',
          'w-1': shape === 'line',
          'w-0 border-[1.5px] border-dashed bg-transparent': shape === 'dashed',
          'my-0.5': nested && shape === 'dashed',
        },
      )}
      style={{ '--color-bg': color, '--color-border': color } as CSSProperties}
    />
  );
}
