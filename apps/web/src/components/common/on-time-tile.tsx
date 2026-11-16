import { StatTile } from '@/components/common/stat-tile';
import {
  hasEnoughData,
  notEnoughNote,
  ON_TIME_TARGET,
  type OnTimeTrend,
  trendDirection,
} from '@/lib/metrics';

// The one On time tile of every dashboard, so the rule and its words never drift apart.
export function OnTimeTile({
  onTime: { n, rate, trend },
  scope,
}: {
  onTime: OnTimeTrend;
  scope: string;
}) {
  const enough = hasEnoughData(n) && rate !== null;
  return (
    <StatTile
      label="On time"
      scope={scope}
      value={enough ? `${rate.toFixed(1)}%` : '—'}
      tone={enough && rate < ON_TIME_TARGET ? 'caution' : undefined}
      sparkline={enough ? trend : undefined}
      target={ON_TIME_TARGET}
      note={
        enough
          ? `n=${n} · target ${ON_TIME_TARGET}%`
          : notEnoughNote(n, 'deliveries')
      }
      definition={`Delivered by the due time ÷ deliveries with a due time, among shipments created in the last ${scope} (n=${n}). Shipments without an SLA are left out. Trend over the window: ${trendDirection(trend)}.`}
    />
  );
}
