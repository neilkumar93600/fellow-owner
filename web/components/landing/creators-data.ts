// Content for "For creators" (landing brief v2, part 5). Built from the seeded demo in demo-data.ts;
// the extra lines here (inbox summaries, statuses, preview meta) describe the same demo space.

import { creator, messages, promoteDraft } from './demo-data';

export interface CreatorsStep {
  id: string;
  /** Anchor of the panel this step describes. */
  target: string;
  title: string;
  detail: string;
}

export const STEPS: CreatorsStep[] = [
  {
    id: 'briefing',
    target: 'creators-briefing',
    title: 'The briefing',
    detail: '3 to 5 picks a day, each with its reason.',
  },
  {
    id: 'inbox',
    target: 'creators-inbox',
    title: 'The inbox',
    detail: 'Pitches sorted by fit. Spam goes to Filtered.',
  },
  {
    id: 'promote',
    target: 'creators-promote',
    title: 'Promote',
    detail: 'Drafts in your voice, a showcase page and a tracked link.',
  },
];

export type InboxStatus = 'new' | 'shortlisted';

export interface InboxRow {
  id: string;
  from: string;
  type: string;
  summary: string;
  fit: number;
  status: InboxStatus;
}

/** One-line AI summaries for the five best non-spam pitches in the demo inbox. */
const SUMMARIES: Record<string, { summary: string; status: InboxStatus }> = {
  m1: { summary: 'Gym-log app, needs a designer', status: 'shortlisted' },
  m2: { summary: 'Paid co-host, 4 episodes', status: 'new' },
  m3: { summary: 'Angel asking about a fund', status: 'new' },
  m10: { summary: 'Thumbnails for demo day', status: 'shortlisted' },
  m14: { summary: 'Weekend code club for kids', status: 'new' },
};

const TYPE_LABELS: Record<string, string> = {
  idea: 'Idea',
  collab: 'Collab',
  investment: 'Investment',
  press: 'Press',
  fan_note: 'Fan note',
  other: 'Other',
};

export const INBOX_ROWS: InboxRow[] = messages
  .filter((m) => m.type !== 'spam' && m.fit !== null && SUMMARIES[m.id])
  .sort((a, b) => (b.fit ?? 0) - (a.fit ?? 0))
  .slice(0, 5)
  .map((m) => ({
    id: m.id,
    from: m.from,
    type: TYPE_LABELS[m.type] ?? 'Other',
    summary: SUMMARIES[m.id]!.summary,
    fit: m.fit ?? 0,
    status: SUMMARIES[m.id]!.status,
  }));

export const FILTERED_COUNT = messages.filter((m) => m.type === 'spam').length;
export const OPEN_PITCHES = messages.filter((m) => m.type !== 'spam').length;

export const INBOX_TABS = [
  { label: 'All', active: true },
  { label: 'Collabs' },
  { label: 'Investment', wideOnly: true },
  { label: 'Ideas' },
  { label: 'Press', wideOnly: true },
  { label: 'Fan notes', wideOnly: true },
] as const;

export const PLATFORM_TABS = ['X', 'Instagram', 'LinkedIn', 'YouTube'] as const;

/** X counts every link as 23 characters, so the counter matches what X would show. */
const X_LINK_LENGTH = 23;
const hashtagLine = promoteDraft.hashtags.map((tag) => `#${tag}`).join(' ');

export const DRAFT = {
  text: promoteDraft.text,
  link: `fellowowners.app${promoteDraft.shortLink}`,
  hashtags: hashtagLine,
  count: promoteDraft.text.length + 1 + X_LINK_LENGTH + 2 + hashtagLine.length,
  limit: 280,
};

export const SHOWCASE_PAGE = {
  path: `fellowowners.app/${creator.handle}/gym-log`,
  status: 'Live',
};

export const PREVIEW = {
  title: 'Gym-log app for creators',
  meta: 'Builders · Team of 4',
  author: creator.name,
  handle: `@${creator.handle}`,
};

/** Clicks per day for the tracked link, Monday to Sunday (sums to promoteDraft.clicks). */
export const CLICKS_BY_DAY = [96, 148, 171, 203, 236, 212, 218];
export const CLICKS_TODAY = CLICKS_BY_DAY[CLICKS_BY_DAY.length - 1]!;

/** Pastel tint for initials avatars, picked by hashing the name (04 §5). */
const AVATAR_TINTS = ['#FFE6C4', '#E3D9FF', '#C9F0F4', '#E8FA8B', '#E9E9EB'] as const;

export function avatarTint(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TINTS[hash % AVATAR_TINTS.length] ?? AVATAR_TINTS[0];
}

export function initials(name: string): string {
  const parts = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? '?';
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : (parts[0]?.[1] ?? '');
  return (first + second).toUpperCase();
}

export function formatNumber(value: number): string {
  return value.toLocaleString('en-US');
}
