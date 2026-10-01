/** Paths that show the marketing navbar and footer. Everything else under (public) has its own chrome. */
export const MARKETING_PATHS = ['/', '/about', '/contact', '/pricing', '/blog'] as const;

export function isMarketingPath(pathname: string): boolean {
  if (pathname === '/') return true;
  return MARKETING_PATHS.some(
    (path) => path !== '/' && (pathname === path || pathname.startsWith(`${path}/`)),
  );
}

/** In-page anchors on the landing page, in scroll order. */
export const LANDING_NAV = [
  { href: '/#problem', label: 'The problem' },
  { href: '/#creators', label: 'For creators' },
  { href: '/#fans', label: 'For fans' },
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#faq', label: 'FAQ' },
] as const;

export const SITE = {
  name: 'Fellow Owners',
  tagline: 'Turn followers into fellow owners.',
  description:
    'One link in your bio sorts your audience into communities, surfaces the ideas and people worth your time, and lets you back what they build.',
} as const;
