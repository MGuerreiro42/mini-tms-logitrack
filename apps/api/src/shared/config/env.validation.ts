import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    DATABASE_URL: z.url(),
    PORT: z.coerce.number().int().positive().default(3333),
    JWT_SECRET: z.string().min(16),
    CORS_ORIGIN: z.url().default('http://localhost:3000'),
    REDIS_URL: z.url().default('redis://localhost:6379'),
    TRUST_PROXY: z.coerce.number().int().min(0).max(8).optional(),
  })
  .refine(
    (env) => env.NODE_ENV !== 'production' || env.TRUST_PROXY !== undefined,
    {
      path: ['TRUST_PROXY'],
      message:
        'required in production: the number of reverse proxies in front of the API (0 if none)',
    },
  )
  .transform((env) => ({ ...env, TRUST_PROXY: env.TRUST_PROXY ?? 0 }));

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  return result.data;
}
