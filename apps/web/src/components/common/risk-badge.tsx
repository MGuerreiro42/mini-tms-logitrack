import {
  CheckIcon,
  CircleAlertIcon,
  CircleXIcon,
  ClockIcon,
  type LucideIcon,
} from 'lucide-react';
import type { SlaKind, SlaState, SlaTone } from '@/lib/sla';
import { cn } from '@/lib/utils';

const TONE: Record<SlaTone, string> = {
  neutral: 'text-muted-foreground',
  caution: 'font-semibold text-notice-foreground',
  critical: 'font-semibold text-destructive',
  positive: 'text-status-delivered-fg',
  mutedCritical: 'text-destructive',
};

// onTrack and none stay plain text: only states that need a second look get an icon.
const ICON: Partial<Record<SlaKind, LucideIcon>> = {
  dueSoon: ClockIcon,
  late: CircleAlertIcon,
  deliveredLate: CircleAlertIcon,
  onTime: CheckIcon,
  failed: CircleXIcon,
};

export function RiskBadge({ state }: { state: SlaState }) {
  const Icon = ICON[state.kind];
  return (
    <span
      title={state.title}
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap',
        TONE[state.tone],
      )}
    >
      {Icon && <Icon aria-hidden className="size-3.5 shrink-0" />}
      {state.label}
    </span>
  );
}
