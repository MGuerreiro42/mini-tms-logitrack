'use client';

import { RadioGroup } from 'radix-ui';
import {
  STATS_WINDOWS,
  type StatsWindow,
  windowLabel,
} from '@/hooks/use-stats-window';

// A segmented control at every width: three short options fit at 320 px.
interface WindowSelectorProps {
  // From useStatsWindow, read once by the page.
  value: StatsWindow;
  onChange: (value: StatsWindow) => void;
}

export function WindowSelector({ value, onChange }: WindowSelectorProps) {
  return (
    <RadioGroup.Root
      aria-label="Time window"
      orientation="horizontal"
      value={value}
      onValueChange={(next) => onChange(next as StatsWindow)}
      className="inline-flex h-8 items-center rounded-lg bg-muted p-[3px] pointer-coarse:h-auto"
    >
      {STATS_WINDOWS.map((option) => (
        <RadioGroup.Item
          key={option}
          value={option}
          className="h-full rounded-md px-3 pointer-coarse:min-h-11 pointer-coarse:min-w-11 text-[13px] font-medium tabular-nums whitespace-nowrap text-foreground/60 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=checked]:bg-background data-[state=checked]:text-foreground data-[state=checked]:shadow-sm dark:text-muted-foreground dark:data-[state=checked]:text-foreground"
        >
          {windowLabel(option)}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
