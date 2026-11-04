export const WEBHOOKS_QUEUE = 'webhooks';
export const DELIVER_JOB = 'deliver';

export interface DeliverJobData {
  deliveryId: string;
}

export const MAX_ATTEMPTS = 6;
const FIRST_RETRY_DELAY_MS = 10_000;

// 10 s, 30 s, 90 s, 270 s, 810 s: short enough to watch the retries happen in the demo.
export const retryDelayMs = (failedAttempts: number): number =>
  FIRST_RETRY_DELAY_MS * 3 ** (failedAttempts - 1);
