import { createHash, randomBytes } from 'node:crypto';

export const API_KEY_PREFIX = 'tms_';
const VISIBLE_LENGTH = API_KEY_PREFIX.length + 8;

// 256 random bits make a fast hash enough; a slow password hash would only add latency to every request.
export const hashApiKey = (key: string): string =>
  createHash('sha256').update(key).digest('hex');

export function generateApiKey(): {
  key: string;
  prefix: string;
  hash: string;
} {
  const key = `${API_KEY_PREFIX}${randomBytes(32).toString('base64url')}`;
  return { key, prefix: key.slice(0, VISIBLE_LENGTH), hash: hashApiKey(key) };
}
