// Handles no creator can claim, because /{handle} would collide with a page or a backend path.
// Keep in sync with the top-level routes in web/src/app (07-file-structure, note 5).

export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  // top-level web routes
  'about',
  'blog',
  'contact',
  'cookies',
  'create-account',
  'dashboard',
  'forgot-password',
  'login',
  'onboarding',
  'pricing',
  'privacy-policy',
  'refunds',
  'reset-password',
  'sign-up',
  'sign-out',
  'start',
  'terms',
  'verify-otp',
  'account',
  'kit',
  'newsletter',
  'email-preferences',
  // backend paths and platform words
  'api',
  'r',
  'admin',
  'help',
  'settings',
  // Next.js and static files
  '_next',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'logo.svg',
  'demo',
  'opengraph-image',
  // generic words that would confuse fans
  'support',
  'status',
  'www',
  'mail',
  'app',
  'static',
  'public',
  'assets',
  'auth',
  'signin',
  'signup',
  'logout',
  'me',
  'new',
  'fellowowners',
  'fellow.owners',
  'fellow_owners',
]);

export function isReservedHandle(handle: string): boolean {
  return RESERVED_HANDLES.has(handle.trim().toLowerCase());
}
