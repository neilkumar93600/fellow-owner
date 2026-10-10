import type { NextConfig } from 'next';

// The browser only talks to the web origin; /api/* and /r/* are rewritten to the Express API
// so cookies stay first-party (07-file-structure, note 2).
const apiUrl =
  process.env.API_URL ??
  (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : undefined);

const nextConfig: NextConfig = {
  // /sign-up became /create-account. Next keeps the query string, so `returnTo` survives the hop.
  async redirects() {
    return [
      { source: '/sign-up', destination: '/create-account', permanent: true },
      // The refund policy is now a section of the terms.
      { source: '/refunds', destination: '/terms#refunds', permanent: true },
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
