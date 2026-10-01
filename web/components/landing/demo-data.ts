// Demo content for the landing page. Mirrors the seeded demo space (05-backend-schema §9):
// creator Mira Kapoor (@mira), six communities, the fan Arjun. Anything shown from it is labelled "Demo".

import type { CommunityIcon, PitchType, Tint } from '@fellow-owners/shared';

export const creator = {
  name: 'Mira Kapoor',
  firstName: 'Mira',
  handle: 'mira',
  bio: 'Building in public, lifting heavy, shipping weekly.',
  followers: '740K',
  platforms: [
    { platform: 'YouTube', followers: '410K' },
    { platform: 'Instagram', followers: '260K' },
    { platform: 'X', followers: '70K' },
  ],
} as const;

export const fan = {
  name: 'Arjun Mehta',
  firstName: 'Arjun',
  headline: 'Frontend dev who lifts',
} as const;

export interface DemoCommunity {
  slug: string;
  name: string;
  icon: CommunityIcon;
  tint: Tint;
  members: number;
  trend: string;
  /** Canvas colour for scenes (the tint's stronger tile/accent). */
  color: string;
}

export const communities: DemoCommunity[] = [
  {
    slug: 'builders',
    name: 'Builders',
    icon: 'code-2',
    tint: 'aqua',
    members: 412,
    trend: '+18%',
    color: '#1FBFD0',
  },
  {
    slug: 'designers',
    name: 'Designers',
    icon: 'pen-tool',
    tint: 'lavender',
    members: 268,
    trend: '+11%',
    color: '#8B5CF6',
  },
  {
    slug: 'investors',
    name: 'Investors & Operators',
    icon: 'line-chart',
    tint: 'peach',
    members: 96,
    trend: '+6%',
    color: '#F2A93B',
  },
  {
    slug: 'music',
    name: 'Music & Creators',
    icon: 'music',
    tint: 'lavender',
    members: 187,
    trend: '+9%',
    color: '#B79CFF',
  },
  {
    slug: 'fitness',
    name: 'Fitness Crew',
    icon: 'dumbbell',
    tint: 'lime',
    members: 341,
    trend: '+21%',
    color: '#B8D94A',
  },
  {
    slug: 'local-impact',
    name: 'Local Impact',
    icon: 'leaf',
    tint: 'white',
    members: 129,
    trend: '+4%',
    color: '#7FB89A',
  },
];

export const totalMembers = '1,218';

export interface DemoMessage {
  id: string;
  from: string;
  /** What the sender picked, or what the AI says it is. */
  type: PitchType | 'spam';
  text: string;
  fit: number | null;
  reason?: string;
}

/** The DM pile for "The problem": real-looking noise with a few messages that matter. */
export const messages: DemoMessage[] = [
  {
    id: 'm1',
    from: 'Arjun Mehta',
    type: 'idea',
    text: 'Building a gym-log app for creators. 3 devs on board, need a designer.',
    fit: 88,
    reason: 'Matches "fitness tools I would use myself" in your taste profile.',
  },
  {
    id: 'm2',
    from: 'Northwind Studio',
    type: 'collab',
    text: 'Would you co-host our build-in-public sprint in March? Paid, 4 episodes.',
    fit: 82,
    reason: 'A paid collab on building in public, which you said you promote.',
  },
  {
    id: 'm3',
    from: 'Leah Okafor',
    type: 'investment',
    text: 'Angel here. Your Builders community shipped 3 apps. Can we talk about a fund?',
    fit: 76,
    reason: 'Investment interest tied to your community, not a cold sales pitch.',
  },
  {
    id: 'm4',
    from: 'crypto_gains_4u',
    type: 'spam',
    text: 'DM me to 10x your followers overnight!!! limited spots',
    fit: null,
  },
  {
    id: 'm5',
    from: 'Sana Iqbal',
    type: 'fan_note',
    text: 'Your deadlift series got me back in the gym after two years. Thank you.',
    fit: 41,
  },
  {
    id: 'm6',
    from: 'promo.bot',
    type: 'spam',
    text: 'Free followers. Click the link in bio. 100% real.',
    fit: null,
  },
  {
    id: 'm7',
    from: 'Tech Weekly',
    type: 'press',
    text: 'Feature request: 5 questions on creators who build products.',
    fit: 64,
  },
  {
    id: 'm8',
    from: 'Dev Kapoor',
    type: 'idea',
    text: 'What if your community voted on the next video topic every week?',
    fit: 58,
  },
  {
    id: 'm9',
    from: 'giveaway_hub',
    type: 'spam',
    text: 'You won an iPhone 17!! Claim within 24h',
    fit: null,
  },
  {
    id: 'm10',
    from: 'Maya Chen',
    type: 'collab',
    text: 'Designer here. Happy to make thumbnails for the Builders demo day.',
    fit: 71,
  },
  {
    id: 'm11',
    from: 'Rohan S.',
    type: 'fan_note',
    text: 'Love the channel. Any tips for staying consistent?',
    fit: 35,
  },
  {
    id: 'm12',
    from: 'brandsync.io',
    type: 'spam',
    text: 'Partner with 500 brands today. No experience needed.',
    fit: null,
  },
  {
    id: 'm13',
    from: 'Ana Ruiz',
    type: 'other',
    text: 'Is the merch restock happening this month?',
    fit: 22,
  },
  {
    id: 'm14',
    from: 'Kofi Mensah',
    type: 'idea',
    text: 'A local coding club for kids, run by your Builders on weekends.',
    fit: 69,
  },
];

export const briefing = {
  headline: 'Three things are worth your time today. One project is ready to promote.',
  highlights: [
    {
      title: 'Gym-log app for creators, by Arjun',
      fit: 88,
      why: 'Fits "fitness tools I would use myself". 41 members said they would use it.',
    },
    {
      title: 'Northwind Studio wants a paid co-host',
      fit: 82,
      why: 'A paid build-in-public collab, the kind you said yes to last spring.',
    },
    {
      title: 'Sana is rising in Designers',
      fit: null,
      why: 'Joined 3 teams this fortnight and her designs got 120 signals.',
    },
  ],
} as const;

export const stats = [
  { label: 'Members', value: 1218, trend: '+18% this week', tint: 'peach' as const },
  { label: 'Ideas this week', value: 37, trend: '+12% on last week', tint: 'lavender' as const },
  { label: 'Opportunities waiting', value: 6, trend: '+2 since yesterday', tint: 'aqua' as const },
];

export const promoteDraft = {
  platform: 'X',
  text: "Arjun from my Builders community built a gym-log app for creators. I've used it for a week. It's good. Try it and tell them what's missing:",
  hashtags: ['buildinpublic', 'fitness'],
  shortLink: '/r/Gx7Lm2Qa',
  clicks: 1284,
} as const;

/** Projects shown in the showcase strip as "Featured by Mira" (demo data). */
export const showcase = [
  {
    title: 'Gym-log app for creators',
    community: 'Builders',
    tint: 'aqua' as Tint,
    team: 4,
    signals: 212,
  },
  {
    title: 'Thumbnail kit for small channels',
    community: 'Designers',
    tint: 'lavender' as Tint,
    team: 3,
    signals: 164,
  },
  {
    title: 'Saturday code club for kids',
    community: 'Local Impact',
    tint: 'white' as Tint,
    team: 6,
    signals: 98,
  },
  {
    title: 'Lo-fi pack for study streams',
    community: 'Music & Creators',
    tint: 'lavender' as Tint,
    team: 2,
    signals: 141,
  },
  {
    title: '12-week strength plan, open source',
    community: 'Fitness Crew',
    tint: 'lime' as Tint,
    team: 5,
    signals: 233,
  },
  {
    title: 'Creator revenue calculator',
    community: 'Investors & Operators',
    tint: 'peach' as Tint,
    team: 3,
    signals: 87,
  },
  {
    title: 'Habit tracker widget',
    community: 'Builders',
    tint: 'aqua' as Tint,
    team: 2,
    signals: 119,
  },
  {
    title: 'Community-run park cleanup map',
    community: 'Local Impact',
    tint: 'white' as Tint,
    team: 7,
    signals: 76,
  },
];

/** The 3-minute judge path (03-app-flow J7). */
export const judgePath = [
  { step: 'Today', seconds: 30, detail: 'The AI briefing and the numbers that moved.' },
  { step: 'Inbox', seconds: 30, detail: 'Spam in Filtered. The top collab and its reason.' },
  { step: 'Ideas', seconds: 30, detail: 'Ranked by fit, signals and recency.' },
  { step: 'Promote', seconds: 45, detail: 'Drafts in Mira’s voice. Publish.' },
  { step: 'Showcase', seconds: 15, detail: 'The public page and its short link.' },
  { step: 'Join as a fan', seconds: 30, detail: 'AI suggests communities from one line.' },
] as const;

export const faqs = [
  {
    q: 'Is it free?',
    a: 'Yes, during the pilot. There are no payments anywhere in version one: no paid DMs, no tips, no subscriptions.',
  },
  {
    q: 'Do my fans need an account?',
    a: 'Only to join, post or pitch. They sign in with a 6-digit email code that works inside Instagram, TikTok and YouTube’s in-app browsers, so nobody has to switch apps.',
  },
  {
    q: 'How does the AI decide what fits?',
    a: 'You write what you would promote, what you never would, and a few lines in your own voice. Every idea and pitch gets a fit score from 0 to 100 with a one-line reason that points back to those words.',
  },
  {
    q: 'Do fans ever see their scores?',
    a: 'Never. Fit scores and reasons only appear in your dashboard. Members see each other’s names, skills and work, never emails or scores.',
  },
  {
    q: 'Does it post to Instagram or X for me?',
    a: 'No. It drafts posts in your voice for X, Instagram, LinkedIn and YouTube. You edit, then copy or open the share window yourself. Nothing goes out without your click.',
  },
  {
    q: 'What happens to my DMs?',
    a: 'Nothing changes in your apps. Your bio link gives people a better door: a structured pitch that arrives sorted, summarized and scored instead of buried.',
  },
  {
    q: 'Where is my data kept?',
    a: 'In one Postgres database in the US. We never sell it, and members can delete their account at any time; their posts then show as from a former member.',
  },
  {
    q: 'Can I try it without signing up?',
    a: 'Yes. Enter as creator to see Mira’s dashboard, or as a fan to join her communities. No email needed; the demo resets every night.',
  },
] as const;
