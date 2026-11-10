'use client';

import { RadioGroup } from 'radix-ui';
import {
  STATS_WINDOWS,
  type StatsWindow,
  useStatsWindow,
  windowLabel,
} from '@/hooks/use-stats-window';

// A segmented control at every width: three short options fit at 320 px.
export function WindowSelector() {
  const [selected, setSelected] = useStatsWindow();

  return (
    <RadioGroup.Root
      aria-label="Time window"
      orientation="horizontal"
      value={selected}
      onValueChange={(value) => setSelected(value as StatsWindow)}
      className="inline-flex h-8 items-center rounded-lg bg-muted p-[3px] pointer-coarse:h-11"
    >
      {STATS_WINDOWS.map((option) => (
        <RadioGroup.Item
          key={option}
          value={option}
          className="h-full rounded-md px-3 text-[13px] font-medium tabular-nums whitespace-nowrap text-foreground/60 outline-none transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=checked]:bg-background data-[state=checked]:text-foreground data-[state=checked]:shadow-sm dark:text-muted-foreground dark:data-[state=checked]:text-foreground"
        >
          {windowLabel(option)}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
