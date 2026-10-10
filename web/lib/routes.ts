import type { IdeasView, InboxSort, InboxTab, PitchStatus, PostType } from '@fellow-owners/shared';

// Typed paths for every screen in docs/03-app-flow.md. Query values that are empty or equal to the
// screen's default are left out, so each view has one URL.

type QueryValue = string | number | null | undefined;

/** `path` plus the query values that are set and differ from `defaults`, in the order given. */
export function withQuery(
  path: string,
  query: Record<string, QueryValue> = {},
  defaults: Record<string, QueryValue> = {},
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || String(value).trim() === '') continue;
    if (value === defaults[key]) continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

const seg = encodeURIComponent;
const space = (handle: string) => `/${seg(handle)}`;

export const routes = {
  home: () => '/',
  /**
   * The one "Get started" target (navbar + hero). app/start/route.ts decides on the server: signed in
   * with a space -> Today, signed in without one -> onboarding, signed out -> create account. `handle`
   * (from the hero's claim bar) is passed through to pre-fill the form.
   */
  start: (handle?: string | null) => withQuery('/start', { handle }),
  onboarding: () => '/onboarding',
  /** Promotion short link; the API records the click and redirects to the showcase. */
  shortLink: (code: string) => `/r/${seg(code)}`,

  dashboard: {
    today: () => '/dashboard',
    inbox: (
      q: {
        tab?: InboxTab;
        sort?: InboxSort;
        status?: PitchStatus;
        q?: string;
        item?: string;
        page?: number;
      } = {},
    ) => withQuery('/dashboard/inbox', q, { tab: 'all', sort: 'fit', page: 1 }),
    /** F32 Answer Once: repeated questions grouped from pitches. */
    questions: (q: { item?: string } = {}) => withQuery('/dashboard/inbox/questions', q),
    ideas: (q: { community?: string; view?: IdeasView; q?: string; item?: string } = {}) =>
      withQuery('/dashboard/ideas', q, { view: 'ranked' }),
    communities: () => '/dashboard/communities',
    community: (slug: string) => `/dashboard/communities/${seg(slug)}`,
    /** `spotlight`: a membership id; the Fans screen opens that fan's spotlight panel. */
    people: (q: { q?: string; community?: string; item?: string; spotlight?: string } = {}) =>
      withQuery('/dashboard/people', q),
    /** The follower roster (F23); `community` is a slug or `untagged`, `import` opens the import panel. */
    followers: ({
      import: openImport,
      ...q
    }: {
      q?: string;
      community?: string;
      item?: string;
      import?: boolean;
    } = {}) => withQuery('/dashboard/people/followers', { ...q, import: openImport ? 1 : null }),
    promote: () => '/dashboard/promote',
    promoteComposer: (postId: string) => `/dashboard/promote/${seg(postId)}`,
    challenges: () => '/dashboard/challenges',
    challenge: (id: string) => `/dashboard/challenges/${seg(id)}`,
    settings: (q: { tab?: string } = {}) => withQuery('/dashboard/settings', q, { tab: 'profile' }),
  },

  fan: {
    space: (handle: string) => space(handle),
    /** `returnTo`: where to land once joined (the post or form that asked for membership). */
    join: (handle: string, returnTo?: string | null) =>
      withQuery(`${space(handle)}/join`, { returnTo }),
    community: (handle: string, slug: string, q: { type?: PostType } = {}) =>
      withQuery(`${space(handle)}/c/${seg(slug)}`, q),
    post: (handle: string, postId: string) => `${space(handle)}/p/${seg(postId)}`,
    newPost: (handle: string, q: { community?: string; type?: PostType } = {}) =>
      withQuery(`${space(handle)}/new`, q),
    pitch: (handle: string) => `${space(handle)}/pitch`,
    me: (handle: string) => `${space(handle)}/me`,
    showcase: (handle: string, slug: string) => `${space(handle)}/s/${seg(slug)}`,
  },

  auth: {
    login: (returnTo?: string | null) => withQuery('/login', { returnTo }),
    createAccount: (returnTo?: string | null) => withQuery('/create-account', { returnTo }),
    verifyOtp: (returnTo?: string | null) => withQuery('/verify-otp', { returnTo }),
    forgotPassword: () => '/forgot-password',
    resetPassword: () => '/reset-password',
    /** Ends the session, then lands on /login. */
    signOut: () => '/sign-out',
  },

  legal: {
    privacyPolicy: () => '/privacy-policy',
    terms: () => '/terms',
    cookies: () => '/cookies',
    refunds: () => '/terms#refunds',
  },

  marketing: {
    about: () => '/about',
    contact: () => '/contact',
    pricing: () => '/pricing',
    blog: () => '/blog',
  },
} as const;
