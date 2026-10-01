import type { MetadataRoute } from 'next';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/privacy-policy', '/terms', '/cookies'].map((path) => ({
    url: `${appUrl}${path}`,
    changeFrequency: path === '' ? 'weekly' : 'yearly',
    priority: path === '' ? 1 : 0.3,
  }));
}
