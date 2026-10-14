import type { SlaState, SlaTone } from '@/lib/sla';

const TONE: Record<SlaTone, string> = {
  muted: 'text-muted-foreground',
  soon: 'font-semibold text-notice-foreground',
  late: 'font-semibold text-destructive',
};

export function SlaCell({ state }: { state: SlaState }) {
  return <span className={TONE[state.tone]}>{state.label}</span>;
}
