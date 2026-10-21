import { z } from 'zod';

const bool = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform((v) => v === 'true' || v === '1');

const EnvSchema = z.object({
  APP_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SECRET_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  /** Expected JWT issuer. Defaults to `${SUPABASE_URL}/auth/v1`. */
  AUTH_JWT_ISSUER: z.string().optional(),
  MEDIA_BUCKET: z.string().default('case-media'),
  PUBLIC_SITE_URL: z.url().default('http://localhost:3000'),
  MIN_CLIENT_VERSION_WEB: z.string().default('0.1.0'),
  MIN_CLIENT_VERSION_IOS: z.string().default('0.1.0'),
  MIN_CLIENT_VERSION_ANDROID: z.string().default('0.1.0'),
  /** Synthetic demo data for UI development. Refused outside development. */
  DEMO_MODE: bool,
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
});

export type ServerEnv = z.infer<typeof EnvSchema>;

let cached: ServerEnv | null = null;

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export function getEnv(source: Record<string, string | undefined> = process.env): ServerEnv {
  if (cached && source === process.env) return cached;
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new ConfigError(`Server configuration is incomplete or invalid: ${fields}. See .env.example.`);
  }
  const env = parsed.data;
  assertDeployableConfig(env);
  if (source === process.env) cached = env;
  return env;
}

/** Prevents fixture/demo behavior from activating in a public deployment. */
export function assertDeployableConfig(env: ServerEnv): void {
  if (env.APP_ENV !== 'development' && env.DEMO_MODE) {
    throw new ConfigError('DEMO_MODE may only be enabled when APP_ENV=development.');
  }
  if (env.APP_ENV === 'production') {
    const local = /localhost|127\.0\.0\.1/;
    if (local.test(env.SUPABASE_URL) || local.test(env.PUBLIC_SITE_URL)) {
      throw new ConfigError('Production configuration points at a local service.');
    }
    if (env.SUPABASE_SECRET_KEY.startsWith('sb_secret_N7UND0UgjKTVK')) {
      throw new ConfigError('Production configuration is using the public local-development secret key.');
    }
  }
}

export function resetEnvCacheForTests(): void {
  cached = null;
}
