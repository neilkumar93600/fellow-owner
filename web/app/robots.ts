import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/env';

// Public pages are open. Disallowed: the signed-in surfaces (studio, onboarding, account, the member
// pages under a creator: /{handle}/c/ and /{handle}/p/), the auth screens, the API and short links, and
// /start (a redirect). Every one of them also sends noindex or a redirect, which is what keeps it out
// of results; this only saves crawl budget. /{handle}/new, /pitch and /me are left to their noindex, a
// prefix rule would also catch blog or creator paths that start the same way.
const PRIVATE = [
  '/dashboard',
  '/onboarding',
  '/account',
  '/*/c/',
  '/*/p/',
  '/login',
  '/create-account',
  '/sign-up',
  '/sign-out',
  '/verify-otp',
  '/forgot-password',
  '/reset-password',
  '/email-preferences',
  '/newsletter/',
  '/start',
  '/api/',
  '/r/',
];

// AI assistants and answer engines, named so the welcome is explicit (the owner wants to be cited by
// ChatGPT, Claude, Gemini, Perplexity, Copilot and the rest). A crawler obeys only its most specific
// group, so they repeat the same private paths. Google-Extended and Applebot-Extended are opt-in tokens
// for Gemini and Apple Intelligence, not crawlers; Gemini and Copilot answers come from Google and Bing.
const AI_AGENTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'Google-Extended',
  'PerplexityBot',
  'Perplexity-User',
  'Applebot-Extended',
  'Meta-ExternalAgent',
  'DuckAssistBot',
  'MistralAI-User',
  'Amazonbot',
  'CCBot',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      { userAgent: AI_AGENTS, allow: '/', disallow: PRIVATE },
    ],
    sitemap: appUrl('/sitemap.xml'),
  };
}
