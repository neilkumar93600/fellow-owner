import { createRequire } from 'node:module';
import pino, { type Logger, type LoggerOptions } from 'pino';
import { env } from '../config/env.js';

export type { Logger } from 'pino';

/**
 * Keys never written to logs. pino redaction paths are exact, so each key is listed at the top
 * level and up to two levels deep (`*.key`, `*.*.key`), plus request/response header shapes.
 */
const SENSITIVE_KEYS = ['email', 'cookie', 'authorization', 'password', 'otp'];

export const REDACT_PATHS = [
  ...SENSITIVE_KEYS.flatMap((key) => [key, `*.${key}`, `*.*.${key}`]),
  'req.headers.cookie',
  'req.headers.authorization',
  'headers["set-cookie"]',
  'res.headers["set-cookie"]',
];

function prettyTransport(): LoggerOptions['transport'] {
  if (!env.isDevelopment) return undefined;
  try {
    // pino-pretty is a dev dependency: only use it when installed.
    createRequire(import.meta.url).resolve('pino-pretty');
    return {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss.l', ignore: 'pid,hostname' },
    };
  } catch {
    return undefined;
  }
}

export function createLogger(options: LoggerOptions = {}): Logger {
  return pino({
    level: env.LOG_LEVEL,
    base: { service: 'api' },
    redact: { paths: REDACT_PATHS, censor: '[redacted]' },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: { level: (label) => ({ level: label }) },
    transport: prettyTransport(),
    ...options,
  });
}

/** The root logger. Requests get `req.log`, a child with the request id. */
export const logger: Logger = createLogger();

/** Masks an email for logs where the address must be hinted at: `ar***@example.com`. */
export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}
