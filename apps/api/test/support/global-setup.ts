import 'dotenv/config';
import { execSync } from 'node:child_process';
import { resolveE2eDatabaseUrl, truncateAllTables } from './e2e-database';

export default function setup(): () => Promise<void> {
  const url = resolveE2eDatabaseUrl(process.env);
  process.env.DATABASE_URL = url;
  process.env.TRUST_PROXY ??= '1';
  // A Redis database of its own: a dev API running alongside must not take the suite's queue jobs.
  const redis = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
  redis.pathname = '/15';
  process.env.REDIS_URL = redis.href;
  execSync('pnpm exec prisma migrate deploy', { stdio: 'inherit' });

  return () => truncateAllTables({ DATABASE_URL: url });
}
