import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// Standard Webhooks (standardwebhooks.com): any of its official libraries verifies these signatures.
const SECRET_PREFIX = 'whsec_';
const SIGNATURE_VERSION = 'v1';
const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

export interface WebhookHeaders {
  'webhook-id': string;
  'webhook-timestamp': string;
  'webhook-signature': string;
}

export const generateWebhookSecret = (): string =>
  `${SECRET_PREFIX}${randomBytes(32).toString('base64')}`;

function hmac(
  secret: string,
  id: string,
  timestamp: string,
  body: string | Buffer,
): Buffer {
  const key = Buffer.from(secret.slice(SECRET_PREFIX.length), 'base64');
  return createHmac('sha256', key)
    .update(`${id}.${timestamp}.`)
    .update(body)
    .digest();
}

export function signWebhook(
  secret: string,
  id: string,
  timestamp: number,
  body: string,
): WebhookHeaders {
  const signature = hmac(secret, id, String(timestamp), body).toString(
    'base64',
  );
  return {
    'webhook-id': id,
    'webhook-timestamp': String(timestamp),
    'webhook-signature': `${SIGNATURE_VERSION},${signature}`,
  };
}

export function verifyWebhook(
  secret: string,
  headers: Record<string, string | string[] | undefined>,
  // The raw bytes when available: a UTF-8 round trip would alter a body that is not valid UTF-8.
  body: string | Buffer,
  now = Math.floor(Date.now() / 1000),
): boolean {
  const id = headers['webhook-id'];
  const timestamp = headers['webhook-timestamp'];
  const signatures = headers['webhook-signature'];
  if (
    typeof id !== 'string' ||
    !id ||
    typeof timestamp !== 'string' ||
    !/^\d+$/.test(timestamp) ||
    typeof signatures !== 'string' ||
    Math.abs(now - Number(timestamp)) > TIMESTAMP_TOLERANCE_SECONDS
  ) {
    return false;
  }

  const expected = hmac(secret, id, timestamp, body);
  // Space-delimited: during a secret rotation a sender may sign with both keys.
  return signatures.split(' ').some((entry) => {
    const [version, value] = entry.split(',');
    const given = Buffer.from(value ?? '', 'base64');
    return (
      version === SIGNATURE_VERSION &&
      given.length === expected.length &&
      timingSafeEqual(given, expected)
    );
  });
}
