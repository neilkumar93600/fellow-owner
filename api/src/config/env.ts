import { z } from 'zod';

/**
 * Environment for the API, checked with zod when this module is first imported.
 * A bad or missing value stops the process on boot with a list of what to fix.
 *
 * Development and test get sensible defaults so `pnpm dev` works with only Docker Postgres.
 * Production requires every secret explicitly (see api/.env.example for the full list).
 */

const DEV_DATABASE_URL = 'postgres://fellow:fellow@localhost:5432/fellow_owners';
const TEST_DATABASE_URL = 'postgres://fellow:fellow@localhost:5432/fellow_owners_test';
const DEV_SECRET = 'dev-only-better-auth-secret-change-me-0123456789';

const NODE_ENVS = ['development', 'test', 'production'] as const;
const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

/** Empty strings in .env files mean "not set". */
const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined));

const commaList = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

const booleanFlag = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : undefined))
  .pipe(z.stringbool().optional());

const originSchema = z
  .url()
  .transform((value) => new URL(value).origin)
  .refine((value) => value.startsWith('http://') || value.startsWith('https://'), 'Use http(s)');

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(NODE_ENVS).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(LOG_LEVELS).optional(),

  DATABASE_URL: optionalString,
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).optional(),

  WEB_ORIGIN: originSchema.default('http://localhost:3000'),
  TRUSTED_ORIGINS: commaList,

  BETTER_AUTH_SECRET: optionalString,
  BETTER_AUTH_URL: optionalString.pipe(originSchema.optional()),

  RESEND_API_KEY: optionalString,
  EMAIL_FROM: optionalString,

  GOOGLE_CLIENT_ID: optionalString,
  GOOGLE_CLIENT_SECRET: optionalString,

  OPENROUTER_API_KEY: optionalString,
  AI_MODEL_FAST: optionalString,
  AI_MODEL_SMART: optionalString,
  AI_EMBEDDING_MODEL: optionalString,
  AI_ENABLED: booleanFlag,

  FAL_KEY: optionalString,

  DEMO_ENABLED: booleanFlag,
  DEMO_CREATOR_EMAIL: optionalString.pipe(z.email().optional()),
  DEMO_FAN_EMAIL: optionalString.pipe(z.email().optional()),
  DEMO_PASSWORD: optionalString,

  ADMIN_EMAILS: commaList,
  CRON_SECRET: optionalString,
  CLICK_SALT: optionalString,

  VERCEL_GIT_COMMIT_SHA: optionalString,
  npm_package_version: optionalString,
});

type RawEnv = z.output<typeof rawEnvSchema>;

export interface Env {
  NODE_ENV: (typeof NODE_ENVS)[number];
  isProduction: boolean;
  isDevelopment: boolean;
  isTest: boolean;
  PORT: number;
  LOG_LEVEL: (typeof LOG_LEVELS)[number];
  /** Short build identifier for GET /api/health. */
  APP_VERSION: string;

  DATABASE_URL: string;
  /** postgres.js pool size: small on serverless, larger for a long-lived local process. */
  DATABASE_POOL_MAX: number;

  /** The web origin, e.g. http://localhost:3000. Showcase and short links point here. */
  WEB_ORIGIN: string;
  /** Extra origins Better Auth trusts (previews, localhost variants). */
  TRUSTED_ORIGINS: string[];

  BETTER_AUTH_SECRET: string;
  /** The WEB origin: /api/auth is reached through the web rewrite. */
  BETTER_AUTH_URL: string;

  RESEND_API_KEY: string | undefined;
  EMAIL_FROM: string;

  GOOGLE_CLIENT_ID: string | undefined;
  GOOGLE_CLIENT_SECRET: string | undefined;
  /** True when both Google credentials are present. */
  GOOGLE_ENABLED: boolean;

  OPENROUTER_API_KEY: string | undefined;
  AI_MODEL_FAST: string;
  AI_MODEL_SMART: string;
  AI_EMBEDDING_MODEL: string;
  /** Live AI calls. Defaults to "an OpenRouter key is present"; the fake AI is used otherwise. */
  AI_ENABLED: boolean;

  FAL_KEY: string | undefined;

  DEMO_ENABLED: boolean;
  DEMO_CREATOR_EMAIL: string;
  DEMO_FAN_EMAIL: string;
  DEMO_PASSWORD: string;

  /** Lowercased platform admin allowlist. */
  ADMIN_EMAILS: string[];
  CRON_SECRET: string;
  CLICK_SALT: string;
}

export class EnvError extends Error {
  constructor(readonly issues: string[]) {
    super(
      `Invalid environment for @fellow-owners/api:\n${issues.map((issue) => `  - ${issue}`).join('\n')}\nSee api/.env.example.`,
    );
    this.name = 'EnvError';
  }
}

function required(
  issues: string[],
  raw: RawEnv,
  key: keyof RawEnv,
  devDefault: string,
  why = 'required in production',
): string {
  const value = raw[key];
  if (typeof value === 'string' && value.length > 0) return value;
  if (raw.NODE_ENV === 'production') {
    issues.push(`${String(key)} is ${why}`);
    return '';
  }
  return devDefault;
}

/** Parses and checks an env source. Throws EnvError listing every problem at once. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = rawEnvSchema.safeParse(source);
  if (!parsed.success) {
    throw new EnvError(
      parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
    );
  }
  const raw = parsed.data;
  const issues: string[] = [];
  const isProduction = raw.NODE_ENV === 'production';
  const isTest = raw.NODE_ENV === 'test';

  const databaseUrl = required(
    issues,
    raw,
    'DATABASE_URL',
    isTest ? TEST_DATABASE_URL : DEV_DATABASE_URL,
  );
  if (databaseUrl && !/^postgres(ql)?:\/\//.test(databaseUrl)) {
    issues.push('DATABASE_URL must be a postgres:// connection string');
  }

  const secret = required(issues, raw, 'BETTER_AUTH_SECRET', DEV_SECRET);
  if (isProduction && secret && secret.length < 32) {
    issues.push('BETTER_AUTH_SECRET must be at least 32 characters (openssl rand -base64 32)');
  }

  const demoEnabled = raw.DEMO_ENABLED ?? true;
  const demoPassword = demoEnabled
    ? required(issues, raw, 'DEMO_PASSWORD', 'demo-password-123', 'required when DEMO_ENABLED')
    : (raw.DEMO_PASSWORD ?? '');
  if (demoEnabled && demoPassword && demoPassword.length < 8) {
    issues.push('DEMO_PASSWORD must be at least 8 characters');
  }
  const demoCreatorEmail = demoEnabled
    ? required(issues, raw, 'DEMO_CREATOR_EMAIL', 'mira@example.com', 'required when DEMO_ENABLED')
    : (raw.DEMO_CREATOR_EMAIL ?? 'mira@example.com');
  const demoFanEmail = demoEnabled
    ? required(issues, raw, 'DEMO_FAN_EMAIL', 'arjun@example.com', 'required when DEMO_ENABLED')
    : (raw.DEMO_FAN_EMAIL ?? 'arjun@example.com');
  if (demoEnabled && demoCreatorEmail.toLowerCase() === demoFanEmail.toLowerCase()) {
    issues.push('DEMO_CREATOR_EMAIL and DEMO_FAN_EMAIL must differ');
  }

  const cronSecret = required(issues, raw, 'CRON_SECRET', 'dev-cron-secret');
  const clickSalt = required(issues, raw, 'CLICK_SALT', 'dev-click-salt');

  if (isProduction && raw.RESEND_API_KEY && !raw.EMAIL_FROM) {
    issues.push('EMAIL_FROM is required when RESEND_API_KEY is set');
  }
  if (isProduction && !raw.RESEND_API_KEY) {
    issues.push('RESEND_API_KEY is required in production (sign-in codes are emailed)');
  }

  const googleEnabled = Boolean(raw.GOOGLE_CLIENT_ID && raw.GOOGLE_CLIENT_SECRET);
  if (Boolean(raw.GOOGLE_CLIENT_ID) !== Boolean(raw.GOOGLE_CLIENT_SECRET)) {
    issues.push('Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or neither');
  }

  const aiEnabled = raw.AI_ENABLED ?? Boolean(raw.OPENROUTER_API_KEY);
  if (aiEnabled && !raw.OPENROUTER_API_KEY) {
    issues.push('AI_ENABLED=true needs OPENROUTER_API_KEY');
  }

  if (issues.length > 0) throw new EnvError(issues);

  const webOrigin = raw.WEB_ORIGIN;
  const trustedOrigins = raw.TRUSTED_ORIGINS.map((origin) => {
    try {
      return origin.includes('*') ? origin : new URL(origin).origin;
    } catch {
      return origin;
    }
  });

  return {
    NODE_ENV: raw.NODE_ENV,
    isProduction,
    isDevelopment: raw.NODE_ENV === 'development',
    isTest,
    PORT: raw.PORT,
    LOG_LEVEL: raw.LOG_LEVEL ?? (isTest ? 'silent' : isProduction ? 'info' : 'debug'),
    APP_VERSION: raw.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? raw.npm_package_version ?? '0.1.0',

    DATABASE_URL: databaseUrl,
    DATABASE_POOL_MAX: raw.DATABASE_POOL_MAX ?? (isProduction ? 5 : 10),

    WEB_ORIGIN: webOrigin,
    TRUSTED_ORIGINS: [...new Set([webOrigin, ...trustedOrigins])],

    BETTER_AUTH_SECRET: secret,
    BETTER_AUTH_URL: raw.BETTER_AUTH_URL ?? webOrigin,

    RESEND_API_KEY: raw.RESEND_API_KEY,
    EMAIL_FROM: raw.EMAIL_FROM ?? 'Fellow Owners <onboarding@resend.dev>',

    GOOGLE_CLIENT_ID: raw.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: raw.GOOGLE_CLIENT_SECRET,
    GOOGLE_ENABLED: googleEnabled,

    OPENROUTER_API_KEY: raw.OPENROUTER_API_KEY,
    AI_MODEL_FAST: raw.AI_MODEL_FAST ?? 'openai/gpt-5.6-luna',
    AI_MODEL_SMART: raw.AI_MODEL_SMART ?? 'anthropic/claude-sonnet-5.5',
    AI_EMBEDDING_MODEL: raw.AI_EMBEDDING_MODEL ?? 'openai/text-embedding-3-small',
    AI_ENABLED: aiEnabled,

    FAL_KEY: raw.FAL_KEY,

    DEMO_ENABLED: demoEnabled,
    DEMO_CREATOR_EMAIL: demoCreatorEmail.toLowerCase(),
    DEMO_FAN_EMAIL: demoFanEmail.toLowerCase(),
    DEMO_PASSWORD: demoPassword,

    ADMIN_EMAILS: raw.ADMIN_EMAILS.map((email) => email.toLowerCase()),
    CRON_SECRET: cronSecret,
    CLICK_SALT: clickSalt,
  };
}

/** The process environment, checked once on import (fails fast on boot). */
export const env: Env = loadEnv();
