import { StatTile } from '@/components/common/stat-tile';
import { formatDuration } from '@/lib/format-duration';
import { hasEnoughData, notEnoughNote } from '@/lib/metrics';
import type { CarrierPerformance } from '../types';

// Carrier Performance and the Carrier 360 show these two from the same response, in the same words.
export function MedianDeliveryTile({
  metric: { hours, n },
  scope,
}: {
  metric: CarrierPerformance['medianDelivery'];
  scope: string;
}) {
  const shown = hasEnoughData(n) && hours !== null;
  return (
    <StatTile
      label="Median delivery"
      scope={scope}
      value={shown ? formatDuration(hours) : '—'}
      note={shown ? `n=${n}` : notEnoughNote(n, 'deliveries')}
      definition={`Middle value (nearest rank) of creation to delivery, over the shipments created in the last ${scope} and delivered (n=${n}).`}
    />
  );
}

export function FirstAttemptTile({
  metric: { rate, n, failed, returned },
  scope,
}: {
  metric: CarrierPerformance['firstAttempt'];
  scope: string;
}) {
  const shown = hasEnoughData(n) && rate !== null;
  return (
    <StatTile
      label="First attempt"
      scope={scope}
      value={shown ? `${rate.toFixed(1)}%` : '—'}
      note={
        shown
          ? `${failed} failed · ${returned} returned`
          : notEnoughNote(n, 'deliveries')
      }
      definition={`Outcomes without a failed delivery ÷ shipments created in the last ${scope} that were delivered or ever failed (n=${n}). A failure that later returned still counts as failed.`}
    />
  );
}
