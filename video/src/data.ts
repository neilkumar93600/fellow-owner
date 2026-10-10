// Demo space for the video: Mira Kapoor (@mira), six communities, the fan Arjun, 14 DMs.
// Copied and adapted from web/components/landing/*-data.ts (no imports from web/).
import type {LucideIcon} from 'lucide-react';
import {ChartLine, CodeXml, Dumbbell, Leaf, Music, PenTool} from 'lucide-react';

export type Tint = 'aqua' | 'lavender' | 'peach' | 'lime' | 'white';

/** hero-field.tsx PALETTES, in community order: strong tint first, then lighter and deeper variants. */
export const PALETTES: readonly (readonly string[])[] = [
  ['#76c3cf', '#98d3dc', '#b9e3e8', '#5bb0bd'], // Builders: aqua
  ['#c4a6ef', '#d4c0f4', '#b192e6', '#e2d5f8'], // Designers: lavender
  ['#eda266', '#f2b884', '#f6cba4', '#e48f51'], // Investors & Operators: light orange
  ['#f2b5a2', '#f7c8b8', '#eba390', '#fadccf'], // Music & Creators: peach
  ['#d9ea8c', '#cadf78', '#b8cf66', '#e6f1b1'], // Fitness Crew: lime
  ['#f0efeb', '#e6e4dd', '#f6f5f1', '#ddd5c2'], // Local Impact: soft white and sand
];

export type Community = {
  slug: string;
  name: string;
  icon: LucideIcon;
  tint: Tint;
  members: number;
  trend: string;
  color: string;
  palette: readonly string[];
};

export const communities: Community[] = [
  {slug: 'builders', name: 'Builders', icon: CodeXml, tint: 'aqua', members: 412, trend: '+18%', color: '#1FBFD0', palette: PALETTES[0]},
  {slug: 'designers', name: 'Designers', icon: PenTool, tint: 'lavender', members: 268, trend: '+11%', color: '#8B5CF6', palette: PALETTES[1]},
  {slug: 'investors', name: 'Investors & Operators', icon: ChartLine, tint: 'peach', members: 96, trend: '+6%', color: '#F2A93B', palette: PALETTES[2]},
  {slug: 'music', name: 'Music & Creators', icon: Music, tint: 'lavender', members: 187, trend: '+9%', color: '#B79CFF', palette: PALETTES[3]},
  {slug: 'fitness', name: 'Fitness Crew', icon: Dumbbell, tint: 'lime', members: 341, trend: '+21%', color: '#B8D94A', palette: PALETTES[4]},
  {slug: 'local-impact', name: 'Local Impact', icon: Leaf, tint: 'white', members: 129, trend: '+4%', color: '#7FB89A', palette: PALETTES[5]},
];

export const creator = {
  name: 'Mira Kapoor',
  firstName: 'Mira',
  handle: 'mira',
  initials: 'MK',
  bio: 'Building in public, lifting heavy, shipping weekly.',
  followers: '740K',
  followersCount: 740000,
  platforms: [
    {platform: 'YouTube', followers: '410K'},
    {platform: 'Instagram', followers: '260K'},
    {platform: 'X', followers: '70K'},
  ],
} as const;

export const FAN_INTRO = 'Frontend dev who lifts';

export const fan = {name: 'Arjun Mehta', firstName: 'Arjun', initials: 'AM', headline: FAN_INTRO} as const;

export const HOST = 'fellowowners.app';

export type PitchType = 'collab' | 'investment' | 'idea' | 'press' | 'fan_note' | 'other' | 'spam';

export type Message = {
  id: string;
  from: string;
  type: PitchType;
  typeLabel: string;
  text: string;
  fit: number | null;
  reason?: string;
  meta: string;
  summary: string;
  tag: string;
  status: 'new' | 'shortlisted' | 'filtered';
};

const TYPE_LABELS: Record<PitchType, string> = {
  collab: 'Collab',
  investment: 'Investment',
  idea: 'Idea',
  press: 'Press',
  fan_note: 'Fan note',
  other: 'Other',
  spam: 'Spam',
};

type Raw = {id: string; from: string; type: PitchType; text: string; fit: number | null; reason?: string; meta: string; summary: string; claim?: string};

const RAW: Raw[] = [
  {id: 'm1', from: 'Arjun Mehta', type: 'idea', text: 'Building a gym-log app for creators. 3 devs on board, need a designer.', fit: 88, reason: 'Matches “fitness tools I would use myself” in your taste profile.', meta: 'Instagram · 2m', summary: 'Gym-log app for creators. 3 devs, needs a designer'},
  {id: 'm2', from: 'Northwind Studio', type: 'collab', text: 'Would you co-host our build-in-public sprint in March? Paid, 4 episodes.', fit: 82, reason: 'A paid collab on building in public, which you said you promote.', meta: 'X · 9m', summary: 'Paid co-host for a 4-episode build-in-public sprint'},
  {id: 'm3', from: 'Leah Okafor', type: 'investment', text: 'Angel here. Your Builders community shipped 3 apps. Can we talk about a fund?', fit: 76, reason: 'Investment interest tied to your community, not a cold sales pitch.', meta: 'X · 14m', summary: 'Angel asking about a fund for Builders projects'},
  {id: 'm4', from: 'crypto_gains_4u', type: 'spam', text: 'DM me to 10x your followers overnight!!! limited spots', fit: null, meta: 'Instagram · 16m', summary: 'Follower growth offer', claim: 'Growth'},
  {id: 'm5', from: 'Sana Iqbal', type: 'fan_note', text: 'Your deadlift series got me back in the gym after two years. Thank you.', fit: 41, meta: 'YouTube · 21m', summary: 'Thank-you note on the deadlift series'},
  {id: 'm6', from: 'promo.bot', type: 'spam', text: 'Free followers. Click the link in bio. 100% real.', fit: null, meta: 'Instagram · 23m', summary: 'Paid followers', claim: 'Promo'},
  {id: 'm7', from: 'Tech Weekly', type: 'press', text: 'Feature request: 5 questions on creators who build products.', fit: 64, meta: 'X · 30m', summary: 'Interview request, 5 questions on creator products'},
  {id: 'm8', from: 'Dev Kapoor', type: 'idea', text: 'What if your community voted on the next video topic every week?', fit: 58, meta: 'YouTube · 34m', summary: 'Weekly community vote on the next video topic'},
  {id: 'm9', from: 'giveaway_hub', type: 'spam', text: 'You won an iPhone 17!! Claim within 24h', fit: null, meta: 'Instagram · 41m', summary: 'Prize scam', claim: 'Giveaway'},
  {id: 'm10', from: 'Maya Chen', type: 'collab', text: 'Designer here. Happy to make thumbnails for the Builders demo day.', fit: 71, meta: 'Instagram · 47m', summary: 'Offers thumbnails for the Builders demo day'},
  {id: 'm11', from: 'Rohan S.', type: 'fan_note', text: 'Love the channel. Any tips for staying consistent?', fit: 35, meta: 'YouTube · 52m', summary: 'Asks for tips on staying consistent'},
  {id: 'm12', from: 'brandsync.io', type: 'spam', text: 'Partner with 500 brands today. No experience needed.', fit: null, meta: 'X · 1h', summary: 'Mass brand-deal pitch', claim: 'Brand deal'},
  {id: 'm13', from: 'Ana Ruiz', type: 'other', text: 'Is the merch restock happening this month?', fit: 22, meta: 'Instagram · 1h', summary: 'Asks about the merch restock'},
  {id: 'm14', from: 'Kofi Mensah', type: 'idea', text: 'A local coding club for kids, run by your Builders on weekends.', fit: 69, meta: 'X · 1h', summary: 'Weekend coding club for kids, run by Builders'},
];

const SHORTLISTED = new Set(['m1', 'm10']);

export const messages: Message[] = RAW.map(({claim, ...m}) => ({
  ...m,
  typeLabel: TYPE_LABELS[m.type],
  tag: m.type === 'spam' ? (claim ?? 'Offer') : TYPE_LABELS[m.type],
  status: m.type === 'spam' ? 'filtered' : SHORTLISTED.has(m.id) ? 'shortlisted' : 'new',
}));

export const SPAM_IDS: readonly string[] = ['m4', 'm6', 'm9', 'm12'];
export const PICK_ORDER = ['m1', 'm2', 'm3'] as const;
/** Inbox order, newest first (no spam). The picks land on rows 2, 5 and 8 so they visibly rise. */
export const ROW_ORDER: readonly string[] = ['m8', 'm2', 'm11', 'm5', 'm1', 'm13', 'm10', 'm3', 'm14', 'm7'];

/** Pile slots (problem-data desk layout): region R right of the heading, L under it; u/v place the top-left, r is the tilt. */
export const PILE: readonly {id: string; desk: {region: 'R' | 'L'; u: number; v: number; r: number}}[] = [
  {id: 'm13', desk: {region: 'R', u: 1, v: 0.6, r: -3}},
  {id: 'm10', desk: {region: 'R', u: 0.02, v: 0.3, r: 6}},
  {id: 'm7', desk: {region: 'R', u: 0.12, v: 0, r: -5}},
  {id: 'm11', desk: {region: 'R', u: 0.98, v: 1, r: -4}},
  {id: 'm14', desk: {region: 'L', u: 0.96, v: 0.96, r: -3}},
  {id: 'm5', desk: {region: 'L', u: 0.04, v: 0.04, r: 4}},
  {id: 'm8', desk: {region: 'L', u: 0.3, v: 0.72, r: 3}},
  {id: 'm12', desk: {region: 'R', u: 0.86, v: 0.32, r: -6}},
  {id: 'm3', desk: {region: 'R', u: 0.62, v: 0.8, r: 5}},
  {id: 'm6', desk: {region: 'L', u: 0.8, v: 0.2, r: -5}},
  {id: 'm4', desk: {region: 'R', u: 0.96, v: 0.04, r: 4}},
  {id: 'm9', desk: {region: 'R', u: 0.08, v: 0.7, r: -7}},
  {id: 'm2', desk: {region: 'R', u: 0.42, v: 0.47, r: 3}},
  {id: 'm1', desk: {region: 'R', u: 0.5, v: 0.14, r: -2}},
];

/** Non-spam, fit descending: m1 88, m2 82, m3 76, m10 71, m14 69, m7 64, m8 58, m5 41, m11 35, m13 22. */
export const SORTED_INBOX: readonly Message[] = messages
  .filter((m) => m.type !== 'spam')
  .sort((a, b) => (b.fit ?? 0) - (a.fit ?? 0));

export const briefing = {
  headline: 'Three things are worth your time today. One project is ready to promote.',
  highlights: [
    {title: 'Gym-log app for creators, by Arjun', fit: 88, why: 'Fits "fitness tools I would use myself". 41 members said they would use it.'},
    {title: 'Northwind Studio wants a paid co-host', fit: 82, why: 'A paid build-in-public collab, the kind you said yes to last spring.'},
    {title: 'Sana is rising in Designers', fit: null, why: 'Joined 3 teams this fortnight and her designs got 120 signals.'},
  ],
} as const;

export const stats = [
  {label: 'Members', value: 1218, trend: '+18% this week', tint: 'peach' as const},
  {label: 'Ideas this week', value: 37, trend: '+12% on last week', tint: 'lavender' as const},
  {label: 'Opportunities waiting', value: 6, trend: '+2 since yesterday', tint: 'aqua' as const},
];

export const promoteDraft = {
  platform: 'X',
  text: "Arjun from my Builders community built a gym-log app for creators. I've used it for a week. It's good. Try it and tell them what's missing:",
  hashtags: ['buildinpublic', 'fitness'],
  shortLink: '/r/Gx7Lm2Qa',
  clicks: 1284,
} as const;

const HASHTAGS = '#buildinpublic #fitness';
/** X counts every link as 23 characters, so the count matches what X would show (creators-data). */
export const DRAFT: {text: string; link: 'fellowowners.app/r/Gx7Lm2Qa'; hashtags: '#buildinpublic #fitness'; count: number; limit: 280} = {
  text: promoteDraft.text,
  link: 'fellowowners.app/r/Gx7Lm2Qa',
  hashtags: HASHTAGS,
  count: promoteDraft.text.length + 1 + 23 + 2 + HASHTAGS.length,
  limit: 280,
};

export const showcase = [
  {title: 'Gym-log app for creators', community: 'Builders', tint: 'aqua' as Tint, team: 4, signals: 212},
  {title: 'Thumbnail kit for small channels', community: 'Designers', tint: 'lavender' as Tint, team: 3, signals: 164},
  {title: 'Saturday code club for kids', community: 'Local Impact', tint: 'white' as Tint, team: 6, signals: 98},
  {title: 'Lo-fi pack for study streams', community: 'Music & Creators', tint: 'lavender' as Tint, team: 2, signals: 141},
  {title: '12-week strength plan, open source', community: 'Fitness Crew', tint: 'lime' as Tint, team: 5, signals: 233},
  {title: 'Creator revenue calculator', community: 'Investors & Operators', tint: 'peach' as Tint, team: 3, signals: 87},
  {title: 'Habit tracker widget', community: 'Builders', tint: 'aqua' as Tint, team: 2, signals: 119},
  {title: 'Community-run park cleanup map', community: 'Local Impact', tint: 'white' as Tint, team: 7, signals: 76},
];

export const TEAM = {
  project: 'Gym-log app for creators',
  community: 'Builders',
  roles: [
    {role: 'Frontend', name: 'Arjun Mehta'},
    {role: 'Backend', name: 'Priya Nair'},
    {role: 'Mobile', name: 'Leo Brandt'},
  ],
  open: {role: 'Designer', applicant: 'Sana Iqbal'},
} as const;

/** Daily clicks on the short link over two weeks; Mira posted on day 9. */
export const CLICKS_BY_DAY: readonly number[] = [12, 18, 15, 22, 30, 26, 41, 120, 260, 198, 164, 140, 132, 106];
export const CLICKS_TOTAL = 1284;

/** Where the lifted card's face sits in the loop footage (fractions of the 1600 x 900 frame). */
export const LOOP_CARD_FACE = {left: 0.364, top: 0.157, right: 0.634, bottom: 0.811} as const;

/** Avatar tile tint by name hash: Apricot, Lavender or Pool tile (never lime). */
const AVATAR_TINTS = ['#FFE6C4', '#E3D9FF', '#C9F0F4'] as const;

export function avatarTint(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
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

/** en-US digit grouping without Intl, so every render machine prints the same. */
export function formatNumber(n: number): string {
  const sign = n < 0 ? '-' : '';
  return sign + String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
