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
}

export function WindowSelector({ value, onChange }: WindowSelectorProps) {
  return (
    <SegmentedControl
      label="Time window"
      options={OPTIONS}
      value={value}
      onChange={onChange}
    />
  );
}
