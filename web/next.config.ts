import type { NextConfig } from 'next';

// The browser only talks to the web origin; /api/* and /r/* are rewritten to the Express API
// so cookies stay first-party (07-file-structure, note 2).
const apiUrl =
  process.env.API_URL ??
  (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : undefined);

const nextConfig: NextConfig = {
  // Old and commonly typed paths, permanent (308, which search engines treat as 301). Next keeps the
  // query string, so `returnTo` survives the hop, and strips a trailing slash first (/tos/ -> /tos).
  // Redirects run before routes, so a source that is a valid handle (privacy, tos) must also be in
  // shared RESERVED_HANDLES or it would shadow a creator's page.
  async redirects() {
    return [
      // /sign-up became /create-account.
      { source: '/sign-up', destination: '/create-account', permanent: true },
      { source: '/signup', destination: '/create-account', permanent: true },
      { source: '/signin', destination: '/login', permanent: true },
      { source: '/sign-in', destination: '/login', permanent: true },
      { source: '/privacy', destination: '/privacy-policy', permanent: true },
      { source: '/tos', destination: '/terms', permanent: true },
      { source: '/terms-of-service', destination: '/terms', permanent: true },
      { source: '/cookie-policy', destination: '/cookies', permanent: true },
      // The refund policy is now a section of the terms.
      { source: '/refunds', destination: '/terms#refunds', permanent: true },
      { source: '/refund-policy', destination: '/terms#refunds', permanent: true },
      // Asks became Challenges (creator pivot).
      { source: '/dashboard/asks', destination: '/dashboard/challenges', permanent: true },
    ];
  },
  async rewrites() {
    if (!apiUrl) return [];
    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
      { source: '/r/:code', destination: `${apiUrl}/r/:code` },
    ];
  },
};

export default nextConfig;
