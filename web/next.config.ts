import type { NextConfig } from 'next';

// The browser only talks to the web origin; /api/* and /r/* are rewritten to the Express API
// so cookies stay first-party (07-file-structure, note 2).
const apiUrl =
  process.env.API_URL ??
  (process.env.NODE_ENV === 'development' ? 'http://localhost:4000' : undefined);

const nextConfig: NextConfig = {
  async rewrites() {
    if (!apiUrl) return [];
    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
      { source: '/r/:code', destination: `${apiUrl}/r/:code` },
    ];
  },
};

export default nextConfig;
