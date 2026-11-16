import { StatTile, type StatTileProps } from '@/components/common/stat-tile';
import { formatDuration } from '@/lib/format-duration';
import { hasEnoughData, notEnoughNote } from '@/lib/metrics';

// The seller Overview names, notes, draws and links these; low n always reads the same.
type TileOverrides = Partial<
  Pick<StatTileProps, 'label' | 'note' | 'figure' | 'href' | 'linkLabel'>
>;

// Carrier Performance, the Carrier 360 and the seller Overview show these in the same words.
export function MedianDeliveryTile({
  metric: { hours, n },
  scope,
  note = `n=${n}`,
  figure,
  ...overrides
}: {
  metric: { hours: number | null; n: number };
  scope: string;
} & TileOverrides) {
  const shown = hasEnoughData(n) && hours !== null;
  return (
    <StatTile
      label="Median delivery"
      scope={scope}
      {...overrides}
      value={shown ? formatDuration(hours) : '—'}
      note={shown ? note : notEnoughNote(n, 'deliveries')}
      figure={shown && figure}
      definition={`Middle value (nearest rank) of creation to delivery, over the shipments created in the last ${scope} and delivered (n=${n}).`}
    />
  );
}

export function FirstAttemptTile({
  metric: { rate, n, failed, returned },
  scope,
  note = `${failed} failed · ${returned} returned`,
  figure,
  ...overrides
}: {
  metric: { rate: number | null; n: number; failed: number; returned: number };
  scope: string;
} & TileOverrides) {
  const shown = hasEnoughData(n) && rate !== null;
  return (
    <StatTile
      label="First attempt"
      scope={scope}
      {...overrides}
      value={shown ? `${rate.toFixed(1)}%` : '—'}
      note={shown ? note : notEnoughNote(n, 'deliveries')}
      figure={shown && figure}
      definition={`Outcomes without a failed delivery ÷ shipments created in the last ${scope} that were delivered or ever failed (n=${n}). A failure that later returned still counts as failed.`}
    />
  );
}
