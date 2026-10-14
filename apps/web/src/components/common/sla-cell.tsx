import { type SlaTone, slaState } from '@/lib/sla';

const TONE: Record<SlaTone, string> = {
  muted: 'text-muted-foreground',
  soon: 'font-semibold text-notice-foreground',
  late: 'font-semibold text-destructive',
};

export function SlaCell(props: Parameters<typeof slaState>[0]) {
  const { label, tone } = slaState(props);
  return <span className={TONE[tone]}>{label}</span>;
}
