import { StatTile } from '@/components/common/stat-tile';
import { formatDuration } from '@/lib/format-duration';
import { type ClaimMetric, hasEnoughData, notEnoughNote } from '@/lib/metrics';

const minutes = (value: number) => formatDuration(value / 60);

export function MedianClaimTile({
  claim: { p50Minutes, p90Minutes, n },
  scope,
}: {
  claim: ClaimMetric;
  scope: string;
}) {
  const shown = hasEnoughData(n) && p50Minutes !== null && p90Minutes !== null;
  return (
    <StatTile
      label="Median claim"
      scope={scope}
      value={shown ? minutes(p50Minutes) : '—'}
      note={
        shown ? `p90 ${minutes(p90Minutes)} · n=${n}` : notEnoughNote(n, 'data')
      }
      definition={`Middle value (nearest rank) of creation to the first claim, over the shipments created in the last ${scope} that were claimed (n=${n}).`}
    />
  );
}
