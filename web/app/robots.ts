import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Signed-in surfaces, plus the auth screens: nothing to rank, and /verify-otp is per-visitor.
      disallow: [
        '/dashboard',
        '/onboarding',
        '/login',
        '/create-account',
        '/sign-up',
        '/verify-otp',
        '/forgot-password',
        '/reset-password',
        '/api/',
        '/r/',
      ],
    },
    sitemap: '/sitemap.xml',
  };
}
