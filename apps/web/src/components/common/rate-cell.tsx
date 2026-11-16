import { hasEnoughData, notEnoughNote } from '@/lib/metrics';

// A table cell has no room for the note: "—" on screen, the sample size in its title and
// for screen readers (spec 07 FR-009).
export function RateCell({ rate, n }: { rate: number | null; n: number }) {
  if (rate !== null && hasEnoughData(n)) return `${rate.toFixed(1)}%`;
  const note = notEnoughNote(n, 'deliveries');
  return (
    <span title={note}>
      <span aria-hidden>—</span>
      <span className="sr-only">{note}</span>
    </span>
  );
}
