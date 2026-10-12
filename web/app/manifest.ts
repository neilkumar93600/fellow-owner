import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/constants';

// The web app manifest (served at /manifest.webmanifest): parchment theme, the two-circle mark.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE.name,
    short_name: SITE.name,
    description: SITE.description,
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f3f1',
    theme_color: '#f6f3f1',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
