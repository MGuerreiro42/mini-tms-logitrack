import { WebhookDeliveryStatus } from '../../../generated/prisma/client';
import { percentage, percentile } from '../../shared/stats/stats';
import type { WebhookHealthResponseDto } from './dto/webhook-health-response.dto';

const MIN_DELIVERIES = 5;
const DOWN_AFTER_FAILURES = 5;
const DEGRADED_BELOW_RATE = 95;

interface FinishedDelivery {
  status: WebhookDeliveryStatus;
  durationMs: number | null;
  // When it finished.
  updatedAt: Date;
}

// Deliveries newest first; the rule of spec 10 FR-012.
export function webhookHealth(
  deliveries: FinishedDelivery[],
): WebhookHealthResponseDto {
  const n = deliveries.length;
  const succeeded = deliveries.filter(
    (d) => d.status === WebhookDeliveryStatus.SUCCEEDED,
  );
  const runEnd = deliveries.findIndex(
    (d) => d.status !== WebhookDeliveryStatus.FAILED,
  );
  const failingRun = runEnd === -1 ? n : runEnd;
  const successRate = n > 0 ? percentage(succeeded.length, n) : null;
  const down = failingRun >= DOWN_AFTER_FAILURES;

  let state: WebhookHealthResponseDto['state'] = 'ok';
  if (n < MIN_DELIVERIES) state = 'too_few';
  else if (down) state = 'down';
  else if ((successRate as number) < DEGRADED_BELOW_RATE) state = 'degraded';

  return {
    state,
    n,
    successRate,
    p95Ms: percentile(
      deliveries.flatMap((d) => (d.durationMs === null ? [] : [d.durationMs])),
      95,
    ),
    lastSuccessAt: succeeded[0]?.updatedAt ?? null,
    failingSince: down ? deliveries[failingRun - 1].updatedAt : null,
  };
}
