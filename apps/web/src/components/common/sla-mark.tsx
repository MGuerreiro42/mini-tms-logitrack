import { cn } from '@/lib/utils';

// The SLA state as a shape, so it never rests on colour (spec 10 FR-016): a ring on track,
// a half disc due soon, a filled disc late, a dashed ring without an SLA.
const SHAPE = {
  onTrack: 'border-[1.5px] border-muted-foreground',
  dueSoon:
    'border-[1.5px] border-sla-soon bg-[linear-gradient(90deg,var(--color-sla-soon)_50%,transparent_50%)]',
  late: 'bg-sla-late',
  none: 'border-[1.5px] border-dashed border-muted-foreground',
};

export type SlaMarkKind = keyof typeof SHAPE;

export function SlaMark({
  kind,
  className,
}: {
  kind: SlaMarkKind;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-2.5 shrink-0 rounded-full',
        SHAPE[kind],
        className,
      )}
    />
  );
}
