import { Client } from 'pg';

type DatabaseEnv = Partial<Record<'E2E_DATABASE_URL' | 'DATABASE_URL', string>>;

export function resolveE2eDatabaseUrl(env: DatabaseEnv): string {
  const url = env.E2E_DATABASE_URL ?? env.DATABASE_URL;
  if (!url) {
    throw new Error('Set E2E_DATABASE_URL to run the e2e suite');
  }
  const name = new URL(url).pathname.slice(1);
  if (!name.endsWith('_e2e')) {
    throw new Error(
      `Refusing to run e2e against database "${name}": point E2E_DATABASE_URL at one whose name ends with _e2e`,
    );
  }
  return url;
}

export async function truncateAllTables(env: DatabaseEnv): Promise<void> {
  const client = new Client({ connectionString: resolveE2eDatabaseUrl(env) });
  await client.connect();
  try {
    const { rows } = await client.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
    );
    const names = rows.map(({ tablename }) => `"${tablename}"`).join(', ');
    await client.query(`TRUNCATE ${names} CASCADE`);
  } finally {
    await client.end();
  }
}
