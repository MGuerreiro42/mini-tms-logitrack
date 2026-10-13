import { resolveE2eDatabaseUrl } from './support/e2e-database';

const DEV = 'postgresql://tms:tms@localhost:5432/tms?schema=public';
const E2E = 'postgresql://tms:tms@localhost:5432/tms_e2e?schema=public';

describe('resolveE2eDatabaseUrl', () => {
  it('accepts a database whose name ends with _e2e', () => {
    expect(resolveE2eDatabaseUrl({ DATABASE_URL: E2E })).toBe(E2E);
  });

  it('prefers E2E_DATABASE_URL over DATABASE_URL', () => {
    expect(
      resolveE2eDatabaseUrl({ E2E_DATABASE_URL: E2E, DATABASE_URL: DEV }),
    ).toBe(E2E);
  });

  it('refuses any other database', () => {
    expect(() => resolveE2eDatabaseUrl({ DATABASE_URL: DEV })).toThrow(
      'Refusing to run e2e against database "tms"',
    );
  });

  it('refuses to run with no url at all', () => {
    expect(() => resolveE2eDatabaseUrl({})).toThrow('E2E_DATABASE_URL');
  });
});
