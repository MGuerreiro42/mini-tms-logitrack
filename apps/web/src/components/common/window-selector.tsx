'use client';

import { SegmentedControl } from '@/components/common/segmented-control';
import {
  STATS_WINDOWS,
  type StatsWindow,
  windowLabel,
} from '@/hooks/use-stats-window';

const OPTIONS = STATS_WINDOWS.map((value) => ({
  value,
  label: windowLabel(value),
}));

interface WindowSelectorProps {
  // From useStatsWindow, read once by the page.
  value: StatsWindow;
  onChange: (value: StatsWindow) => void;
  // The dates the window covers, read under the segments.
  range?: string;
}

export function WindowSelector({
  value,
  onChange,
  range,
}: WindowSelectorProps) {
  const control = (
    <SegmentedControl
      label="Time window"
      options={OPTIONS}
      value={value}
      onChange={onChange}
    />
  );
  if (!range) return control;
  return (
    <div className="flex flex-col items-end gap-1.5 max-sm:items-start">
      {control}
      <p className="text-xs text-muted-foreground">{range}</p>
    </div>
  );
}
