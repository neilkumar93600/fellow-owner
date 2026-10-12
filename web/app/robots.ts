import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/env';

// Public pages are open. Disallowed: the signed-in surfaces (studio, onboarding, account, the member
// pages under a creator: /{handle}/c/ and /{handle}/p/), the auth screens, the API and short links, and
// /start (a redirect). Every one of them also sends noindex or a redirect, which is what keeps it out
// of results; this only saves crawl budget. /{handle}/new, /pitch and /me are left to their noindex, a
// prefix rule would also catch blog or creator paths that start the same way.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/onboarding',
        '/account',
        '/*/c/',
        '/*/p/',
        '/login',
        '/create-account',
        '/sign-up',
        '/sign-out',
        '/verify-otp',
        '/forgot-password',
        '/reset-password',
        '/email-preferences',
        '/newsletter/',
        '/start',
        '/api/',
        '/r/',
      ],
    },
    sitemap: appUrl('/sitemap.xml'),
  };
}
