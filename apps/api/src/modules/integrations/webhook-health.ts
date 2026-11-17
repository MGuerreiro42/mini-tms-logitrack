import { WebhookDeliveryStatus } from '../../../generated/prisma/client';
import { percentage, percentile } from '../../shared/stats/stats';
import type { WebhookHealthResponseDto } from './dto/webhook-health-response.dto';

const MIN_ATTEMPTS = 5;
const DOWN_AFTER_FAILURES = 5;
const DEGRADED_BELOW_RATE = 95;

interface Delivery {
  status: WebhookDeliveryStatus;
  attempts: number;
  durationMs: number | null;
  // When its last attempt ran.
  updatedAt: Date;
}

// Deliveries newest first; the rule of spec 10 FR-012 over attempts, so retries in the backoff already count.
export function webhookHealth(
  deliveries: Delivery[],
): WebhookHealthResponseDto {
  // Newest attempt first: the success (if any) ends the delivery's failed attempts.
  // shortcut: every attempt of a delivery takes its last attempt's time, the table keeps no per-attempt log.
  const attempts = deliveries.flatMap((d) => {
    const ok = d.status === WebhookDeliveryStatus.SUCCEEDED;
    return [
      ...(ok ? [{ ok, at: d.updatedAt }] : []),
      ...Array.from({ length: d.attempts - Number(ok) }, () => ({
        ok: false,
        at: d.updatedAt,
      })),
    ];
  });
  const n = attempts.length;
  const succeeded = attempts.filter((a) => a.ok);
  const runEnd = attempts.findIndex((a) => a.ok);
  const failingRun = runEnd === -1 ? n : runEnd;
  const successRate = n > 0 ? percentage(succeeded.length, n) : null;
  const down = failingRun >= DOWN_AFTER_FAILURES;

  let state: WebhookHealthResponseDto['state'] = 'ok';
  if (n < MIN_ATTEMPTS) state = 'too_few';
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
    lastSuccessAt: succeeded[0]?.at ?? null,
    failingSince: down ? attempts[failingRun - 1].at : null,
  };
}
