// Content and choreography data for "The problem" (landing brief v2, part 3).
// Messages come from demo-data; everything added here (AI summaries, platforms, pile slots) is demo-only.

import type { PitchType } from '@fellow-owners/shared';
import { avatarTint, DEMO, type DemoMessage, initials, messages } from './demo-data';

export { avatarTint, initials };

/** Mirrors PITCH_TYPE_LABELS in @fellow-owners/shared without pulling the shared runtime (zod) into the client scene. */
const TYPE_LABELS: Record<PitchType, string> = {
  collab: 'Collab',
  brand_deal: 'Brand deal',
  idea: 'Idea',
  press: 'Press',
  fan_note: 'Fan note',
  other: 'Other',
};

export type ProblemMessage = DemoMessage & {
  /** Where the DM arrived and how long ago, shown on the pile bubble. */
  meta: string;
  /** Small tag on the bubble. Spam shows what it claims to be; the AI sees through it. */
  tag: string;
  /** One-line AI summary shown in the inbox table. */
  summary: string;
  /** Hidden below 768px, where the scene uses 8 messages instead of 14. */
  wideOnly: boolean;
};

const EXTRA: Record<string, { meta: string; summary: string; claim?: string }> = {
  m1: {
    meta: 'Instagram · 2m',
    summary: 'Lisbon guide made with a local guide and a photographer',
  },
  m2: { meta: 'YouTube · 9m', summary: 'Porto old-town series with a local guide, October dates' },
  m3: { meta: 'Instagram · 14m', summary: 'Four unscripted nights at a Lisbon hotel' },
  m4: { meta: 'Instagram · 16m', summary: 'Follower growth offer', claim: 'Growth' },
  m5: { meta: 'YouTube · 21m', summary: 'Thank-you note: booked a first solo trip' },
  m6: { meta: 'Instagram · 23m', summary: 'Engagement pod', claim: 'Promo' },
  m7: { meta: 'Email · 30m', summary: 'Interview request, 5 questions on budget travel' },
  m8: { meta: 'YouTube · 34m', summary: 'Fans vote on next month’s destination' },
  m9: { meta: 'Instagram · 41m', summary: 'Prize scam', claim: 'Giveaway' },
  m10: { meta: 'Instagram · 47m', summary: 'Offers to shoot the Lisbon guide cover' },
  m11: { meta: 'YouTube · 52m', summary: 'Asks for tips on filming with a phone' },
  m12: { meta: 'Instagram · 1h', summary: 'Mass brand-ambassador offer', claim: 'Brand deal' },
  m13: { meta: 'Instagram · 1h', summary: 'Asks about the packing list' },
  m14: { meta: 'Instagram · 1h', summary: 'Accra street-food map, made by locals' },
};

/** The 8 messages the phone scene keeps: the 3 picks, 2 spam and 3 ordinary ones. */
const PHONE_SET = new Set(['m1', 'm2', 'm3', 'm4', 'm7', 'm8', 'm9', 'm11']);

export const problemMessages: Record<string, ProblemMessage> = Object.fromEntries(
  messages.map((m) => {
    const extra = EXTRA[m.id];
    const tag = m.type === 'spam' ? (extra?.claim ?? 'Offer') : TYPE_LABELS[m.type];
    return [
      m.id,
      {
        ...m,
        meta: extra?.meta ?? '',
        summary: extra?.summary ?? m.text,
        tag,
        wideOnly: !PHONE_SET.has(m.id),
      },
    ];
  }),
);

export function typeLabel(message: ProblemMessage): string {
  return message.type === 'spam' ? 'Spam' : TYPE_LABELS[message.type];
}

/** Inbox order, newest first. The picks land on rows 2, 5 and 8 so they visibly rise out of the table. */
export const ROW_ORDER = ['m8', 'm2', 'm11', 'm5', 'm1', 'm13', 'm10', 'm3', 'm14', 'm7'] as const;

/** The three best matches, in stack order. */
export const PICK_ORDER = ['m1', 'm2', 'm3'] as const;

export const PICK_SET = new Set<string>(PICK_ORDER);

/** Counts per breakpoint, so the closing line always matches what the scene showed. */
export const COUNTS = {
  wide: { total: DEMO.inbox.messages, filtered: DEMO.inbox.spam },
  phone: { total: DEMO.inbox.messages, filtered: 2 },
} as const;

/*
 * The pile. DOM order is stacking order (last on top). Each bubble has a slot per layout:
 *   desk:  region 'R' (right of the heading, full height) or 'L' (under the heading, left).
 *   tab:   one region under the heading, full width.
 *   phone: one region under the heading, full width; u may run past 0..1 to bleed off the edge.
 * u/v place the bubble's top-left inside its region (0..1 of the free space), r is the resting tilt.
 */
export interface PileSlot {
  u: number;
  v: number;
  r: number;
}

export interface PileBubble {
  id: string;
  desk: PileSlot & { region: 'R' | 'L' };
  tab: PileSlot;
  phone?: PileSlot;
}

export const PILE: PileBubble[] = [
  {
    id: 'm13',
    desk: { region: 'R', u: 1, v: 0.6, r: -3 },
    tab: { u: 1, v: 0.56, r: 5 },
  },
  {
    id: 'm10',
    desk: { region: 'R', u: 0.02, v: 0.3, r: 6 },
    tab: { u: 0.97, v: 0.04, r: -3 },
  },
  {
    id: 'm7',
    desk: { region: 'R', u: 0.12, v: 0, r: -5 },
    tab: { u: 0, v: 0, r: -5 },
    phone: { u: -0.04, v: 0, r: -5 },
  },
  {
    id: 'm11',
    desk: { region: 'R', u: 0.98, v: 1, r: -4 },
    tab: { u: 1, v: 1, r: -3 },
    phone: { u: -0.05, v: 0.44, r: 4 },
  },
  {
    id: 'm14',
    desk: { region: 'L', u: 0.96, v: 0.96, r: -3 },
    tab: { u: 0.5, v: 1, r: 2 },
  },
  {
    id: 'm5',
    desk: { region: 'L', u: 0.04, v: 0.04, r: 4 },
    tab: { u: 0.02, v: 0.5, r: 3 },
  },
  {
    id: 'm8',
    desk: { region: 'L', u: 0.3, v: 0.72, r: 3 },
    tab: { u: 0.03, v: 0.98, r: 5 },
    phone: { u: 1.05, v: 0.84, r: -4 },
  },
  {
    id: 'm12',
    desk: { region: 'R', u: 0.86, v: 0.32, r: -6 },
    tab: { u: 0.99, v: 0.3, r: -6 },
  },
  {
    id: 'm3',
    desk: { region: 'R', u: 0.62, v: 0.8, r: 5 },
    tab: { u: 0.5, v: 0.78, r: 3 },
    phone: { u: -0.02, v: 1, r: 5 },
  },
  {
    id: 'm6',
    desk: { region: 'L', u: 0.8, v: 0.2, r: -5 },
    tab: { u: 0.04, v: 0.25, r: -4 },
  },
  {
    id: 'm4',
    desk: { region: 'R', u: 0.96, v: 0.04, r: 4 },
    tab: { u: 0.5, v: 0.08, r: 4 },
    phone: { u: 1.05, v: 0.08, r: 5 },
  },
  {
    id: 'm9',
    desk: { region: 'R', u: 0.08, v: 0.7, r: -7 },
    tab: { u: 0, v: 0.74, r: -5 },
    phone: { u: 1.04, v: 0.46, r: -6 },
  },
  {
    id: 'm2',
    desk: { region: 'R', u: 0.42, v: 0.47, r: 3 },
    tab: { u: 0.47, v: 0.54, r: -2 },
    phone: { u: 0.32, v: 0.63, r: 3 },
  },
  {
    id: 'm1',
    desk: { region: 'R', u: 0.5, v: 0.14, r: -2 },
    tab: { u: 0.53, v: 0.31, r: 5 },
    phone: { u: 0.36, v: 0.22, r: -3 },
  },
];
