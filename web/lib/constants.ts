/**
 * Paths that show the marketing navbar and footer. Everything else under (public) has its own chrome.
 * The four legal routes are here so a clause is never a dead end: the footer's legal column and a way
 * back to the site stay one tap away.
 */
export const MARKETING_PATHS = [
  '/',
  '/about',
  '/contact',
  '/pricing',
  '/blog',
  '/privacy-policy',
  '/terms',
  '/cookies',
] as const;

export function isMarketingPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return MARKETING_PATHS.some(
    (path) => path !== '/' && (pathname === path || pathname.startsWith(`${path}/`)),
  );
}

/** The serif display H1 for marketing and legal pages (the landing hero sets its own, larger one). */
export const DISPLAY_H1 =
  'font-display text-[2.5rem] leading-[1.05] tracking-[-0.01em] text-ink md:text-[3.25rem]';

export const SITE = {
  name: 'Fellow Owners',
  tagline: 'Turn followers into fellow owners.',
  description:
    'One link in your bio that gathers your followers into communities, surfaces the best ideas and people, and lets you give fans your spotlight.',
} as const;

/** Fellow Owners' own social accounts (footer "Follow us"). Change a handle here and it updates everywhere. */
export const SOCIAL_LINKS = [
  { name: 'Instagram', href: 'https://www.instagram.com/fellowowners' },
  { name: 'TikTok', href: 'https://www.tiktok.com/@fellowowners' },
  { name: 'YouTube', href: 'https://www.youtube.com/@fellowowners' },
  { name: 'X', href: 'https://x.com/fellowowners' },
  { name: 'LinkedIn', href: 'https://www.linkedin.com/company/fellowowners' },
] as const;
