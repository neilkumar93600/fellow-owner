import { z } from 'zod';

// Public env, checked once on import. NEXT_PUBLIC_* values are inlined at build time, so each one is read
// by its full name (process.env[key] would come back empty in the browser).
const schema = z.object({
  NEXT_PUBLIC_APP_URL: z.url().optional(),
});

export const env = schema.parse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || undefined,
});

/**
 * Absolute URL on the web origin, for links people copy or scan (bio link, short link, QR codes).
 * Without NEXT_PUBLIC_APP_URL it falls back like the root layout's metadataBase on the server and to the
 * page's own origin in the browser.
 */
export function appUrl(path = '/'): string {
  const origin =
    env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== 'undefined'
      ? window.location.origin
      : process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : 'http://localhost:3000');
  return new URL(path, origin).toString();
}
