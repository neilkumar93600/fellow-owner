import type { MetadataRoute } from 'next';
import { POSTS } from '@/lib/blog';
import { LEGAL_PAGES } from '@/lib/legal';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    '',
    '/about',
    '/pricing',
    '/contact',
    '/blog',
    ...LEGAL_PAGES.map((page) => page.href),
    ...POSTS.map((post) => `/blog/${post.slug}`),
  ];
  return paths.map((path) => ({
    url: `${appUrl}${path}`,
    changeFrequency: path === '' ? 'weekly' : 'yearly',
    priority: path === '' ? 1 : 0.3,
  }));
}
