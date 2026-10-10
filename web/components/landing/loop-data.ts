// "How it works: from follower to featured" (round 4 spec §2): five product steps, from a follower count
// to a fan-made guide you feature. Told on an example travel creator; every number comes from DEMO.

import type { CommunityIcon, Tint } from '@fellow-owners/shared';
import type { CreatorAsset } from '@/lib/creator-assets';
import { DEMO } from './demo-data';

export type StoryStepId = 'followers' | 'communities' | 'idea' | 'crew' | 'featured';

export interface StoryStep {
  id: StoryStepId;
  /** Optional small text: the day of the example week the step lands on. */
  day: string;
  /** The pipeline word (Followers → Communities → Ideas → Crews → Featured), for the rail chip. */
  name: string;
  /** The step as a product verb: the card's heading. */
  title: string;
  line: string;
  /** Backdrop still while the product recording is not wired, and its alt text. */
  still: CreatorAsset;
  alt: string;
}

const { idea, followers } = DEMO;

export const storySteps: StoryStep[] = [
  {
    id: 'followers',
    day: 'Mon',
    name: 'Followers',
    title: 'Your bio link gathers followers.',
    line: `Your ${followers.label} followers have been one number. Until now.`,
    still: 'vlog-van-coast',
    alt: 'A camper van parked above the Pacific coast at golden hour.',
  },
  {
    id: 'communities',
    day: 'Tue',
    name: 'Communities',
    title: 'AI sorts them into rooms.',
    line: 'One link in your bio. Each fan writes one line about themselves, and the AI suggests the rooms that fit.',
    still: 'vlog-hostel',
    alt: 'Travellers laughing around a table in a hostel common room.',
  },
  {
    id: 'idea',
    day: 'Wed',
    name: 'Ideas',
    title: 'Fans post ideas.',
    line: `In ${idea.community}, ${idea.author.split(' ')[0]} shares “${idea.title}”. ${idea.use} fans say they’d use it.`,
    still: 'vlog-cafe',
    alt: 'A café table by a window with a laptop, a notebook and a coffee.',
  },
  {
    id: 'crew',
    day: 'Thu',
    name: 'Crews',
    title: 'A crew forms.',
    line: 'Four fans take the open roles: a local guide, a photographer, a video editor and a planner.',
    still: 'vlog-lisbon',
    alt: 'A steep Lisbon street with a yellow tram in warm evening light.',
  },
  {
    id: 'featured',
    day: 'Sun',
    name: 'Featured',
    title: 'You feature it, crediting every maker.',
    line: 'You give it your spotlight, and every maker is credited by name.',
    still: 'vlog-mountain',
    alt: 'Sunrise over a mountain ridge, seen from a trail.',
  },
];

/** The one disclosure line for the section. */
export const storyDisclosure = 'Demo: the creator and fans are made up.';

export const storyFollowers = {
  total: followers.label,
  platforms: followers.platforms.map((entry) => ({
    name: entry.name,
    count: entry.label,
    share: entry.count / followers.total,
  })),
};

export type StoryIcon = CommunityIcon;

export const storyCommunities: {
  name: string;
  icon: StoryIcon;
  tint: Tint;
  fans: string;
}[] = DEMO.rooms.map((room) => ({
  name: room.name,
  icon: room.icon,
  tint: room.tint,
  fans: room.members.toLocaleString('en-US'),
}));

export const storyIdea = {
  title: idea.title,
  author: idea.author,
  avatar: DEMO.crew[0]?.avatar ?? 'fan-1',
  community: idea.community,
  prices: idea.prices,
  use: idea.use,
  join: idea.build,
};

export const storyCrew: { name: string; role: string; avatar: CreatorAsset }[] = DEMO.crew;

export const storyFeatured = {
  clicks: DEMO.clicks.total,
  /** Clicks per day since it was featured, oldest first; sums to `clicks`. */
  clicksByDay: DEMO.clicks.byDay,
};
