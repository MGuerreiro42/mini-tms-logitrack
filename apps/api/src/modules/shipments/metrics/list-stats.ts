import type { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  createdSince,
  groupBy,
  windowSince,
} from '../../../shared/stats/stats';
import { deliveryMetrics } from './delivery-metrics';
import type { CarrierListStatsDto } from './list-stats.dto';
import { loadMetricRows } from './metric-rows';

// The admin lists' scorecard has a fixed window (spec 07 FR-033).
const LIST_STATS_WINDOW = '30d';

// One row load for the whole page, grouped by tenant, through the same metrics core as the
// 360 pages, so a row equals that tenant's 360 at 30 d.
export async function listStatsByTenant(
  prisma: PrismaService,
  key: 'sellerId' | 'carrierId',
  ids: string[],
): Promise<Map<string, CarrierListStatsDto>> {
  const now = new Date();
  const since = windowSince({ window: LIST_STATS_WINDOW }, now);
  const rows = await loadMetricRows(
    prisma,
    { [key]: { in: ids }, ...createdSince(since) },
    // Only Failed reads the history, and only carriers show it.
    { events: key === 'carrierId' },
  );
  const byTenant = groupBy(rows, (row) => row[key]);
  return new Map(
    ids.map((id) => {
      const { shipments, onTime, firstAttempt } = deliveryMetrics(
        byTenant.get(id) ?? [],
        { since, now },
      );
      return [
        id,
        {
          shipments,
          onTime: { n: onTime.n, count: onTime.count, rate: onTime.rate },
          failed: {
            n: firstAttempt.n,
            rate: firstAttempt.rate === null ? null : 100 - firstAttempt.rate,
          },
        },
      ];
    }),
  );
}
