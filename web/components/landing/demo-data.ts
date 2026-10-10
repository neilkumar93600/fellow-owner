// Demo content for the landing page. Mirrors the seeded demo space (GET /api/spaces/mira and
// api/src/db/seed/data): Mira Lane (@mira), a travel creator, six rooms and the fan Priya Shah. Every
// landing number comes from DEMO below, so no two sections disagree. Everything shown from it is labelled "Demo".

import type { CommunityIcon, PitchType, Platform, Tint } from '@fellow-owners/shared';
import type { CreatorAsset } from '@/lib/creator-assets';

export interface DemoCommunity {
  slug: string;
  name: string;
  icon: CommunityIcon;
  tint: Tint;
  /** Fans in the room (seed memberCount). A fan can be in several rooms, so these sum past DEMO.members. */
  members: number;
  trend: string;
  cover: CreatorAsset;
  description: string;
}

export interface DemoCrewMember {
  name: string;
  firstName: string;
  role: string;
  avatar: CreatorAsset;
}

/** Clicks on the featured guide's short link, oldest day first (seed: published 9 days ago, days 9..0). */
const clicksByDay = [47, 5, 13, 4, 8, 12, 10, 19, 1, 4] as const;

/** The canonical demo facts (spec round 4 §1). Every landing number imports from here. */
export const DEMO = {
  creator: {
    name: 'Mira Lane',
    firstName: 'Mira',
    handle: 'mira',
    niche: 'travel',
    bio: 'Slow travel, cheap flights, and the people I meet on the way.',
    avatarUrl: '/demo/mira.jpg',
  },
  followers: {
    total: 1_140_000,
    label: '1.14M',
    platforms: [
      {
        platform: 'youtube' as Platform,
        name: 'YouTube',
        count: 620_000,
        label: '620K',
        url: 'https://youtube.com/@miralane',
      },
      {
        platform: 'instagram' as Platform,
        name: 'Instagram',
        count: 380_000,
        label: '380K',
        url: 'https://instagram.com/miralane',
      },
      {
        platform: 'tiktok' as Platform,
        name: 'TikTok',
        count: 140_000,
        label: '140K',
        url: 'https://tiktok.com/@miralane',
      },
    ],
  },
  /** People in the space (each counted once). */
  members: 1200,
  rooms: [
    {
      slug: 'budget-travel',
      name: 'Budget Travel',
      icon: 'wallet',
      tint: 'peach',
      members: 502,
      trend: '+18%',
      cover: 'cover-budget-travel',
      description: 'Real prices, cheap flights and trips that do not cost a month of rent.',
    },
    {
      slug: 'solo-travelers',
      name: 'Solo Travelers',
      icon: 'backpack',
      tint: 'lavender',
      members: 385,
      trend: '+11%',
      cover: 'cover-solo-travelers',
      description: 'Going alone, safely, and meeting good people on the way.',
    },
    {
      slug: 'travel-photography',
      name: 'Travel Photography',
      icon: 'camera',
      tint: 'aqua',
      members: 283,
      trend: '+9%',
      cover: 'cover-travel-photography',
      description: 'Better trip photos, on a phone or a camera, and where the light falls.',
    },
    {
      slug: 'food-finds',
      name: 'Food Finds',
      icon: 'utensils',
      tint: 'peach',
      members: 278,
      trend: '+21%',
      cover: 'cover-food-finds',
      description: 'Small family-run spots, street food and the one dish to order.',
    },
    {
      slug: 'road-trips',
      name: 'Road Trips & Van Life',
      icon: 'car',
      tint: 'white',
      members: 213,
      trend: '+4%',
      cover: 'cover-road-trips',
      description: 'Long drives, cheap campsites and what the van really costs.',
    },
    {
      slug: 'slow-living',
      name: 'Slow Living',
      icon: 'sunrise',
      tint: 'lavender',
      members: 152,
      trend: '+6%',
      cover: 'cover-slow-living',
      description: 'Staying longer, going slower, and coming home rested.',
    },
  ] as DemoCommunity[],
  /** The one fan idea the story follows. */
  idea: {
    title: 'Lisbon on $60 a day',
    community: 'Budget Travel',
    communitySlug: 'budget-travel',
    author: 'Priya Shah',
    excerpt: 'Seven days in Lisbon for $420 all in, built by fans in Budget Travel.',
    prices: ['Hostel bed $24', 'Tram pass $7.50', 'Pastel de nata $1.50'],
    /** "I'd use this" signals. */
    use: 212,
    /** "Count me in" (want to help build) signals. */
    build: 38,
    /** The AI match, 0 to 100. Shown only as a label ("Strong match"), never as a number. */
    fit: 97,
    reason:
      'Matches “budget-honest travel”. Four roles filled, every price dated and checked by a local.',
  },
  /** The one crew, in role order. Priya posted the idea and plans the days. */
  crew: [
    {
      name: 'Priya Shah',
      firstName: 'Priya',
      role: 'Itinerary planner',
      avatar: 'fan-1',
    },
    {
      name: 'Inês Duarte',
      firstName: 'Inês',
      role: 'Local guide',
      avatar: 'fan-2',
    },
    {
      name: 'Maya Chen',
      firstName: 'Maya',
      role: 'Photographer',
      avatar: 'fan-4',
    },
    {
      name: 'Leo Brandt',
      firstName: 'Leo',
      role: 'Video editor',
      avatar: 'fan-3',
    },
  ] as DemoCrewMember[],
  clicks: {
    /** The one click count: every click on the featured guide's link since it was featured. */
    total: clicksByDay.reduce((sum, day) => sum + day, 0),
    byDay: clicksByDay,
  },
  /** The fan-mail pile in "The problem" (`messages` below): one count at every width. */
  inbox: { messages: 14, spam: 4 },
} as const;

export const creator = {
  name: DEMO.creator.name,
  firstName: DEMO.creator.firstName,
  handle: DEMO.creator.handle,
  bio: DEMO.creator.bio,
  followers: DEMO.followers.label,
  platforms: DEMO.followers.platforms.map((entry) => ({
    platform: entry.name,
    followers: entry.label,
  })),
} as const;

export const fan = {
  name: 'Priya Shah',
  firstName: 'Priya',
  headline: 'Solo traveler from Austin',
} as const;

/** Alias of DEMO.rooms, kept for the sections that import it. */
export const communities: DemoCommunity[] = DEMO.rooms;

export const totalMembers = DEMO.members.toLocaleString('en-US');

export interface DemoMessage {
  id: string;
  from: string;
  /** What the sender picked, or what the AI says it is. */
  type: PitchType | 'spam';
  text: string;
  /** The AI's match, 0 to 100. Landing screens show it as a label, never as a number. */
  fit: number | null;
  reason?: string;
}

/** The DM pile for "The problem": real-looking noise with a few messages that matter. */
export const messages: DemoMessage[] = [
  {
    id: 'm1',
    from: 'Priya Shah',
    type: 'idea',
    text: 'Made a Lisbon guide on $60 a day with a local guide and a photographer. Can you feature it?',
    fit: 88,
    reason: 'Matches “budget-honest travel”, and a real local helped make it.',
  },
  {
    id: 'm2',
    from: 'Inês Duarte',
    type: 'collab',
    text: 'Local guide in Porto. Would you walk the old town with me for a 4-episode series? Dates in October.',
    fit: 82,
    reason: 'A named local guide with dates: the kind of collab you say yes to.',
  },
  {
    id: 'm3',
    from: 'Casa Alfama Hotel',
    type: 'brand_deal',
    text: 'Four nights at our Lisbon hotel, no script. You tell the truth about the stay.',
    fit: 76,
    reason: 'A brand deal with no script and a named owner, which you have said yes to.',
  },
  {
    id: 'm4',
    from: 'growth_guru_77',
    type: 'spam',
    text: 'Buy 10K followers today!!! real accounts, DM me',
    fit: null,
  },
  {
    id: 'm5',
    from: 'Sana Iqbal',
    type: 'fan_note',
    text: 'Your Lisbon episode made me book my first solo trip. Thank you.',
    fit: 41,
  },
  {
    id: 'm6',
    from: 'pod_boost.co',
    type: 'spam',
    text: 'Join our engagement pod. Guaranteed likes on every post.',
    fit: null,
  },
  {
    id: 'm7',
    from: 'Travel Weekly',
    type: 'press',
    text: 'Feature request: 5 questions on budget travel for a Sunday column.',
    fit: 64,
  },
  {
    id: 'm8',
    from: 'Dev Rao',
    type: 'idea',
    text: 'What if fans voted on next month’s destination?',
    fit: 58,
  },
  {
    id: 'm9',
    from: 'cruise_giveaway',
    type: 'spam',
    text: 'FREE cruise giveaway! Claim in 24h',
    fit: null,
  },
  {
    id: 'm10',
    from: 'Maya Chen',
    type: 'collab',
    text: 'Photographer here. Happy to shoot the cover for the Lisbon guide.',
    fit: 71,
  },
  {
    id: 'm11',
    from: 'Rohan S.',
    type: 'fan_note',
    text: 'Love the vlogs. Any tips for filming on a phone?',
    fit: 35,
  },
  {
    id: 'm12',
    from: 'brandsync.io',
    type: 'spam',
    text: 'Be an ambassador for 500 brands. No experience needed.',
    fit: null,
  },
  {
    id: 'm13',
    from: 'Ana Ruiz',
    type: 'other',
    text: 'Is the packing list still available?',
    fit: 22,
  },
  {
    id: 'm14',
    from: 'Kofi Mensah',
    type: 'idea',
    text: 'A food map of Accra street stalls, made by people who live there.',
    fit: 69,
  },
];

export const briefing = {
  headline: 'Three things are worth your time today. One fan made something you can feature.',
  highlights: [
    {
      title: 'Lisbon on $60 a day, by Priya',
      fit: DEMO.idea.fit,
      why: `Matches “budget-honest travel”. ${DEMO.idea.use} fans said they would use it.`,
    },
    {
      title: 'Inês wants to walk Porto with you',
      fit: 82,
      why: 'A local guide with dates, the kind of collab you said yes to last spring.',
    },
    {
      title: 'Sana is rising in Solo Travelers',
      fit: null,
      why: 'Joined 3 crews this fortnight and her photos got 120 hearts.',
    },
  ],
} as const;

export const stats = [
  {
    label: 'Fans',
    value: DEMO.members,
    trend: '+18% this week',
    tint: 'peach' as const,
  },
  {
    label: 'Ideas this week',
    value: 37,
    trend: '+12% on last week',
    tint: 'lavender' as const,
  },
  {
    label: 'Offers waiting',
    value: 6,
    trend: '+2 since yesterday',
    tint: 'aqua' as const,
  },
];

export const promoteDraft = {
  platform: 'Instagram',
  text: 'Priya from my Budget Travel room made a whole Lisbon guide on $60 a day, with a local guide, a photographer and an editor. I used it on my own trip. Go tell her what’s missing:',
  hashtags: ['lisbon', 'budgettravel'],
  shortLink: '/r/Gx7Lm2Qa',
  clicks: DEMO.clicks.total,
} as const;

export interface ShowcaseProject {
  title: string;
  community: string;
  cover: CreatorAsset;
  team: number;
  hearts: number;
  /** Names for the avatar stack, in join order (demo names). */
  crew: readonly string[];
}

/** Projects shown in the showcase strip as "Made by Mira's fans" (demo data). */
export const showcase: readonly ShowcaseProject[] = [
  {
    title: 'Lisbon on $60 a day',
    community: 'Budget Travel',
    cover: 'vlog-lisbon',
    team: 4,
    hearts: 212,
    crew: DEMO.crew.map((member) => member.name),
  },
  {
    title: 'Tokyo cafés under $5',
    community: 'Food Finds',
    cover: 'vlog-cafe',
    team: 3,
    hearts: 164,
    crew: ['Yuki Sato', 'Priya Shah', 'Omar Farouk'],
  },
  {
    title: 'Solo-safe night markets map',
    community: 'Solo Travelers',
    cover: 'vlog-night-market',
    team: 6,
    hearts: 141,
    crew: ['Ama Owusu', 'Ben Carter', 'Ines Rocha', 'Raj Patel', 'Lena Fischer', 'Sana Iqbal'],
  },
  {
    title: 'Pacific Coast van-life route',
    community: 'Road Trips & Van Life',
    cover: 'vlog-van-coast',
    team: 5,
    hearts: 233,
    crew: ['Marcus Lee', 'Elif Kaya', 'Jonas Berg', 'Hana Kim', 'Sana Iqbal'],
  },
  {
    title: 'Film photo zine',
    community: 'Travel Photography',
    cover: 'vlog-mountain',
    team: 3,
    hearts: 98,
    crew: ['Maya Chen', 'Noor Haddad', 'Tomás Rivera'],
  },
  {
    title: 'Slow mornings playbook',
    community: 'Slow Living',
    cover: 'vlog-hostel',
    team: 2,
    hearts: 119,
    crew: ['Chloe Martin', 'Kofi Mensah'],
  },
];

/** The three-minute path through the demo. */
export const judgePath = [
  {
    step: 'Today',
    seconds: 30,
    detail: 'Your briefing: the fans and offers worth a look.',
  },
  {
    step: 'Fan mail',
    seconds: 30,
    detail: 'Spam held back. The best idea and why it stood out.',
  },
  {
    step: 'Ideas',
    seconds: 30,
    detail: 'What fans are making, by hearts and fresh ideas.',
  },
  {
    step: 'Spotlight',
    seconds: 45,
    detail: 'A post in your voice. Edit it, then publish.',
  },
  {
    step: 'Made it',
    seconds: 15,
    detail: 'The public page with every fan credited.',
  },
  {
    step: 'Join as a fan',
    seconds: 30,
    detail: 'One line about you, and the AI picks your rooms.',
  },
] as const;

export const faqs = [
  {
    q: 'Is it free?',
    a: 'Yes, during the pilot. There are no payments anywhere in version one: no paid DMs, no tips, no subscriptions.',
  },
  {
    q: 'Do my fans need an account?',
    a: 'Only to join, share an idea or send you something. They sign up with Google, Apple or Facebook, or with an email and password, confirming the email with a 6-digit code. It works inside the Instagram, TikTok and YouTube in-app browsers, so nobody has to switch apps.',
  },
  {
    q: 'How does the AI decide what to show me?',
    a: 'You write what you love to feature, what you never would, and a few lines in your own voice. Every idea and message gets a match label and a one-line reason that points back to your own words.',
  },
  {
    q: 'Do fans ever see how they are ranked?',
    a: 'Never. Match labels and reasons appear only in your studio. Fans see each other’s names, skills and work, never emails or rankings.',
  },
  {
    q: 'Does it post to Instagram or YouTube for me?',
    a: 'No. It drafts posts and replies in your voice. You edit, then copy or open the share window yourself. Nothing goes out to a fan without your click.',
  },
  {
    q: 'What happens to my DMs?',
    a: 'Nothing changes in your apps. Your bio link gives people a better door: an idea that arrives sorted, summarized and explained instead of buried.',
  },
  {
    q: 'Where is my data kept?',
    a: 'In one Postgres database in the US, and we never sell it. Email us to delete your account and we erase it, usually within a few working days. Posts other people already replied to stay, shown as from a former fan.',
  },
  {
    q: 'What is real and what is demo data?',
    a: 'The AI is real: sorting fan mail, matching ideas to your taste and drafting posts all run live. The creator, the fans, the rooms and every number are seeded demo data, and the demo resets every night.',
  },
  {
    q: 'How does the AI sort rooms and summarize discussions?',
    a: 'A new fan writes one line about themselves, and the AI suggests the rooms that fit, with a short reason. Fans can always pick rooms themselves. It also reads a room’s new ideas and writes a short digest: the themes people keep raising and up to three standout ideas.',
  },
  {
    q: 'Can I try it without signing up?',
    a: 'Yes. Enter as creator to see a demo studio, or as a fan to join a demo creator’s rooms. No email needed; the demo resets every night.',
  },
] as const;

/** Pastel tints for initials avatars, picked by hashing the name. */
const AVATAR_TINTS = ['#FFE0CC', '#E3D9FF', '#D3F1E6', '#CFE6FA', '#F2E9DF'] as const;

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
