import { validateEnv } from './env.validation';

const validConfig = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/tms',
  PORT: '3333',
  JWT_SECRET: 'a'.repeat(16),
  CORS_ORIGIN: 'http://localhost:3000',
};

describe('validateEnv', () => {
  it('returns the parsed config when everything is valid', () => {
    const result = validateEnv(validConfig);

    expect(result).toEqual({
      NODE_ENV: 'development',
      DATABASE_URL: validConfig.DATABASE_URL,
      PORT: 3333,
      JWT_SECRET: validConfig.JWT_SECRET,
      CORS_ORIGIN: 'http://localhost:3000',
    });
  });

  it('coerces PORT from a string to a number', () => {
    const result = validateEnv({ ...validConfig, PORT: '8080' });

    expect(result.PORT).toBe(8080);
  });

  it('defaults NODE_ENV, PORT, and CORS_ORIGIN when omitted', () => {
    const { NODE_ENV, PORT, CORS_ORIGIN, ...rest } = validConfig;

    const result = validateEnv(rest);

    expect(result.NODE_ENV).toBe('development');
    expect(result.PORT).toBe(3333);
    expect(result.CORS_ORIGIN).toBe('http://localhost:3000');
  });

  it('throws when JWT_SECRET is shorter than 16 characters', () => {
    expect(() =>
      validateEnv({ ...validConfig, JWT_SECRET: 'tooshort' }),
    ).toThrow(/JWT_SECRET/);
  });

  it('throws when DATABASE_URL is missing', () => {
    const { DATABASE_URL, ...rest } = validConfig;

    expect(() => validateEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it('throws when NODE_ENV is not one of the allowed values', () => {
    expect(() => validateEnv({ ...validConfig, NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV/,
    );
  });

  it('throws when CORS_ORIGIN is not a valid URL', () => {
    expect(() =>
      validateEnv({ ...validConfig, CORS_ORIGIN: 'not-a-url' }),
    ).toThrow(/CORS_ORIGIN/);
  });
});
