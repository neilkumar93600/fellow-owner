import { CONTACT, MIN_AGE, OPERATOR } from '@fellow-owners/shared';

/**
 * The legal copy that only the web app needs: the cookie table, the processor list, the retention
 * table and the dates on the pages. Who we are and how to reach us lives in
 * `shared/src/operator.ts`, because the API needs it for the footer of every email it sends.
 *
 * FILL BEFORE LAUNCH: the five placeholders are over there, not here.
 */

export { CONTACT, MIN_AGE, OPERATOR };

/** Shown at the top of every legal page. Bump when the meaning changes, not when a typo is fixed. */
export const LEGAL_UPDATED = '2026-10-02';

/** How long we take to answer a privacy or deletion request. Quoted on the pages; keep it true. */
export const RESPONSE_DAYS = 30;

const READING_WPM = 220;
/** Props that carry visible text: Section/Callout titles, Table head and rows, and children. */
const TEXT_KEYS = ['children', 'title', 'head', 'rows', 'cells'] as const;

function countWords(node: unknown): number {
  if (typeof node === 'string') return node.split(/\s+/).filter(Boolean).length;
  if (typeof node === 'number') return 1;
  if (Array.isArray(node)) return node.reduce((sum: number, item) => sum + countWords(item), 0);
  if (node && typeof node === 'object') {
    // A React element keeps its text under `props`; a Table row is a plain { key, cells } object.
    const source = ((node as { props?: unknown }).props ?? node) as Record<string, unknown>;
    return TEXT_KEYS.reduce((sum, key) => sum + countWords(source[key]), 0);
  }
  return 0;
}

/**
 * Whole minutes to read a page, from the JSX the page passes to the shell (about 220 words a minute).
 * ponytail: walks element props, so text inside a client component such as DataRequest is not counted.
 */
export function readingMinutes(...nodes: unknown[]): number {
  return Math.max(1, Math.ceil(countWords(nodes) / READING_WPM));
}

export const LEGAL_PAGES = [
  { href: '/privacy-policy', label: 'Privacy policy' },
  { href: '/terms', label: 'Terms of service' },
  { href: '/cookies', label: 'Cookie policy' },
] as const;

// ---------------------------------------------------------------- cookies and storage

export interface CookieRow {
  name: string;
  purpose: string;
  life: string;
}

/**
 * Every cookie the product sets. All four are first-party, httpOnly and strictly necessary:
 * without them nobody can sign in. There is no analytics, advertising or third-party cookie
 * anywhere in the product, which is why the banner is a notice and not a consent gate
 * (ePrivacy Art. 5(3) exempts strictly necessary cookies from consent).
 *
 * Names come from Better Auth (api/src/auth/index.ts). In production `useSecureCookies` adds the
 * `__Secure-` prefix, so the live names read `__Secure-better-auth.session_token` and so on.
 */
export const COOKIES: readonly CookieRow[] = [
  {
    name: 'better-auth.session_token',
    purpose: 'Keeps you logged in. Without it every page would ask you to log in again.',
    life: '7 days, refreshed daily while you use the product',
  },
  {
    name: 'better-auth.session_data',
    purpose: 'A short signed copy of your session, so most screens load without a database read.',
    life: '5 minutes',
  },
  {
    name: 'better-auth.state',
    purpose:
      'Ties a Google, Apple or Facebook sign-in back to the tab that started it. Only set if you use one of them.',
    life: 'Until that sign-in finishes, about 10 minutes',
  },
  {
    name: 'better-auth.pkce_code_verifier',
    purpose:
      'Stops anyone intercepting a Google, Apple or Facebook sign-in. Only set if you use one of them.',
    life: 'Until that sign-in finishes, about 10 minutes',
  },
];

export interface StorageRow {
  key: string;
  where: 'sessionStorage' | 'localStorage';
  purpose: string;
  life: string;
}

/**
 * Browser storage, which is not a cookie: it never travels to our servers and never leaves the
 * device. Each entry exists because you typed something and we would rather not lose it.
 */
export const STORAGE: readonly StorageRow[] = [
  {
    key: 'fo:otp-email, fo:reset-email',
    where: 'sessionStorage',
    purpose:
      'Carries the email you typed to the next screen: from Create account or Log in to the confirmation code, and from "Forgot password?" to the reset screens.',
    life: 'Until you close the tab',
  },
  {
    key: 'fo:otp-sent-at, fo:reset-sent-at',
    where: 'sessionStorage',
    purpose: 'Keeps the "resend code" countdown honest across a refresh.',
    life: 'Until you close the tab',
  },
  {
    key: 'fo:intro-play',
    where: 'sessionStorage',
    purpose: 'Remembers that you have seen the home page intro, so it plays once.',
    life: 'Until you close the tab',
  },
  {
    key: 'fo:onboarding-draft:v1',
    where: 'localStorage',
    purpose: 'Your unfinished space setup, so a closed laptop does not cost you the work.',
    life: 'Until setup finishes, or you clear site data',
  },
  {
    key: 'fo:cookie-notice',
    where: 'localStorage',
    purpose: 'Remembers that you closed the cookie notice, so it does not come back.',
    life: 'Until you clear site data',
  },
];

// ---------------------------------------------------------------- processors

export interface ProcessorRow {
  name: string;
  does: string;
  data: string;
  where: string;
  policy: string;
}

/**
 * Everyone who touches personal data on our behalf. Audited against the code, not against a wish
 * list: fal.ai is configured in `api/src/config/env.ts` but no v1 route calls it (see the note in
 * `api/src/ai/types.ts`), so it is deliberately absent. Add it here the day a route does.
 */
export const PROCESSORS: readonly ProcessorRow[] = [
  {
    name: 'Supabase',
    does: 'Hosts the one Postgres database everything lives in, and its daily backups.',
    data: 'Everything you give us: account, profile, posts, ideas, community joins.',
    where: 'United States',
    policy: 'https://supabase.com/privacy',
  },
  {
    name: 'Vercel',
    does: 'Serves the website and runs the API.',
    data: 'Request metadata: IP address, user agent, URL. In logs, not in our database.',
    where: 'United States and the EU',
    policy: 'https://vercel.com/legal/privacy-policy',
  },
  {
    name: 'Resend',
    does: 'Delivers your email confirmation and password reset codes. The only email we send.',
    data: 'Your email address and the code.',
    where: 'United States',
    policy: 'https://resend.com/legal/privacy-policy',
  },
  {
    name: 'OpenRouter',
    does: 'Routes our AI calls to the model providers below.',
    data: 'The text of the item being read: a post, an idea, what a creator loves. Never your email.',
    where: 'United States',
    policy: 'https://openrouter.ai/privacy',
  },
  {
    name: 'OpenAI and Anthropic',
    does: 'Run the models that summarize, rate and draft. Reached through OpenRouter.',
    data: 'The same text, for the length of the call. Not used to train their models.',
    where: 'United States',
    policy: 'https://openai.com/policies/privacy-policy',
  },
  {
    name: 'Google',
    does: 'Optional "Continue with Google" sign-in, only if you choose it.',
    data: 'Your name, email address and profile picture, passed from Google to us.',
    where: 'Global',
    policy: 'https://policies.google.com/privacy',
  },
  {
    name: 'Apple',
    does: 'Optional "Continue with Apple" sign-in, only if you choose it.',
    data: 'Your name and email address (or a private relay address, if you hide yours), passed from Apple to us.',
    where: 'Global',
    policy: 'https://www.apple.com/legal/privacy/',
  },
  {
    name: 'Meta (Facebook)',
    does: 'Optional "Continue with Facebook" sign-in, only if you choose it.',
    data: 'Your name, email address and profile picture, passed from Facebook to us.',
    where: 'Global',
    policy: 'https://www.facebook.com/privacy/policy/',
  },
];

/** The models behind the AI features, named because a match rating is a judgment about someone's work. */
export const AI_MODELS = [
  'OpenAI GPT-5.6 Luna, for fast first reads of the DM pile',
  'Anthropic Claude Sonnet 5.5, for briefings and drafts',
  'OpenAI text-embedding-3-small, for finding similar ideas',
] as const;

// ---------------------------------------------------------------- retention

export interface RetentionRow {
  what: string;
  how: string;
}

/** Mirrors docs/05-backend-schema.md §8 and the nightly purge job (api/src/workers/purge.ts). */
export const RETENTION: readonly RetentionRow[] = [
  { what: 'Your account and profile', how: 'Until you ask us to delete it.' },
  {
    what: 'Posts and comments you delete',
    how: 'Hidden at once, erased 30 days later. The gap is for moderation appeals.',
  },
  {
    what: 'Ideas you send a creator',
    how: 'Until the creator deletes their space, or you delete your account.',
  },
  { what: 'Link clicks', how: '180 days, then deleted. Never tied to a name.' },
  { what: 'Records of AI runs', how: '90 days.' },
  { what: 'AI community digests', how: '30 days.' },
  { what: 'Sign-in sessions', how: '7 days from last use. Signing out deletes them at once.' },
  { what: 'Server logs', how: 'Up to 30 days at Vercel. Email addresses are redacted in them.' },
];
