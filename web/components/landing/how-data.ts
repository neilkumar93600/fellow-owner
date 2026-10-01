// Content for "How it works" (landing brief v2, part 7). Demo names and numbers come from demo-data.ts;
// the extra mini-UI content (join tiles, code, click history) lives here.

import { communities, creator, fan, messages, promoteDraft } from './demo-data';

export const HOW_HEADING = {
  eyebrow: 'How it works',
  titleLines: ['Three steps.', 'One link.'],
  lead: 'Set up in five minutes. Then the loop runs itself, and you step in where it matters.',
} as const;

export const HOW_STEPS = [
  {
    n: '01',
    id: 'how-share',
    title: 'Share your link',
    body: 'Put one link in your bio. Fans land on your page, pick their communities and join with a 6-digit email code.',
  },
  {
    n: '02',
    id: 'how-brief',
    title: 'Your AI briefs you',
    body: 'Every post and pitch is summarized, filtered for spam and scored against your taste profile, with a reason you can check.',
  },
  {
    n: '03',
    id: 'how-back',
    title: 'Back what they build',
    body: 'Pick a project, edit the drafts written in your voice, publish. You get a showcase page and a link that counts every click.',
  },
] as const;

export const HOST = 'fellowowners.app';

/* ---------- 01 Share your link ---------- */

export const BIO = {
  name: creator.name,
  handle: creator.handle,
  initials: 'MK',
  followers: creator.followers,
  platforms: creator.platforms,
  path: `/${creator.handle}`,
} as const;

const bySlug = (slug: string) => communities.find((c) => c.slug === slug)!;

/** Four of Mira's communities on her bio page; Arjun (a frontend dev who lifts) picks two. */
export const JOIN_TILES = [
  { community: bySlug('builders'), picked: true },
  { community: bySlug('fitness'), picked: true },
  { community: bySlug('designers'), picked: false },
  { community: bySlug('local-impact'), picked: false },
];

export const JOIN_CODE = '482917';

/* ---------- 02 Your AI briefs you ---------- */

export const TASTE = {
  promote: 'fitness tools I would use myself',
  never: 'crypto, gambling',
} as const;

const arjunPitch = messages.find((m) => m.id === 'm1')!;

export const PITCH = {
  from: fan.name,
  initials: 'AM',
  meta: 'Idea in Builders',
  title: 'Gym-log app for creators',
  fit: arjunPitch.fit ?? 88,
  reason: `Matches “${TASTE.promote}” in your taste profile.`,
} as const;

/* ---------- 03 Back what they build ---------- */

const hashtags = promoteDraft.hashtags.map((tag) => `#${tag}`).join(' ');
/** X counts every link as 23 characters, so the counter matches what X would show. */
const X_LINK_LENGTH = 23;

export const DRAFT = {
  platform: promoteDraft.platform,
  text: promoteDraft.text,
  link: `${HOST}${promoteDraft.shortLink}`,
  hashtags,
  count: promoteDraft.text.length + 1 + X_LINK_LENGTH + 1 + hashtags.length,
  limit: 280,
} as const;

/** Clicks per day over the last week; they add up to promoteDraft.clicks. */
export const CLICK_DAYS = [64, 118, 240, 310, 205, 188, 159] as const;
export const CLICKS = promoteDraft.clicks;

export function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}
