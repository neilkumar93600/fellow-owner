// Static props for the real components in the loop's live layer (loop-live.tsx), built from EXAMPLE so the
// product UI says the same numbers as the cards. No queries, no router: fixtures only.

import type { MemberRef, PostCard, PublicCommunity, PublicSpace } from '@fellow-owners/shared';
import type { DecisionItem } from '@/components/dashboard/today/decision-items';
import { CREATOR_ASSETS, type CreatorAsset } from '@/lib/creator-assets';
import { EXAMPLE } from './example-data';

const SITE = 'fellowowners.app';

/** The browser's URL pill per step (followers, communities, idea, crew, featured). */
export const LIVE_URLS = [
  `${SITE}/${EXAMPLE.creator.handle}`,
  `${SITE}/${EXAMPLE.creator.handle}/join`,
  `${SITE}/${EXAMPLE.creator.handle}/c/${EXAMPLE.idea.communitySlug}`,
  `${SITE}/${EXAMPLE.creator.handle}/p/lisbon-on-60-a-day`,
  `${SITE}/dashboard`,
] as const;

/** The example creator's generated cover and portrait (real creators get the gradient and their avatar). */
export const LIVE_PHOTOS: { cover: CreatorAsset; portrait: CreatorAsset } = {
  cover: 'vlog-van-coast',
  portrait: 'mira-portrait',
};

export const LIVE_SPACE: PublicSpace = {
  id: 'example-space',
  handle: EXAMPLE.creator.handle,
  displayName: EXAMPLE.creator.name,
  bio: 'Slow travel and cheap flights.',
  avatarUrl: EXAMPLE.creator.avatarUrl,
  platforms: EXAMPLE.followers.platforms.map((entry) => ({
    platform: entry.platform,
    url: entry.url,
    followers: entry.count,
  })),
  totalFollowers: EXAMPLE.followers.total,
  memberCount: EXAMPLE.members,
  coverUrl: null,
  mediaKitEnabled: false,
};

const SHORT_ROOM: Record<string, string> = {
  'budget-travel': 'Real prices, cheap flights.',
  'solo-travelers': 'Going alone, safely.',
  'travel-photography': 'Better trip photos.',
  'food-finds': 'Street food and local spots.',
  'road-trips': 'Cheap campsites, van life.',
  'slow-living': 'Staying longer, going slower.',
};

export const LIVE_ROOMS: PublicCommunity[] = EXAMPLE.rooms.map((room, index) => ({
  id: room.slug,
  slug: room.slug,
  name: room.name,
  description: SHORT_ROOM[room.slug] ?? '',
  tint: room.tint,
  icon: room.icon,
  memberCount: room.members,
  sortOrder: index,
  coverUrl: null,
}));

const budgetTravel = LIVE_ROOMS.find((room) => room.slug === EXAMPLE.idea.communitySlug);
if (!budgetTravel) throw new Error('EXAMPLE.idea.communitySlug must name one of EXAMPLE.rooms');

/** The room the fan joins in step 2 (shown as Joined). */
export const LIVE_JOINED_ROOM = budgetTravel;

/** The fan's one line and the rooms the AI suggests for it (the join screen on the phone). */
export const LIVE_JOIN = {
  intro: 'Solo traveler from Austin. Real prices, street food.',
  picks: [
    { room: budgetTravel, why: 'You said real prices.' },
    { room: LIVE_ROOMS[1] ?? budgetTravel, why: 'You travel alone.' },
    { room: LIVE_ROOMS[3] ?? budgetTravel, why: 'You said street food.' },
  ],
};

function memberRef(name: string, avatar?: keyof typeof CREATOR_ASSETS): MemberRef {
  return {
    membershipId: name,
    name,
    headline: null,
    image: avatar ? CREATOR_ASSETS[avatar].src : null,
  };
}

/** The crew with photo URLs, for AvatarStack and AvatarInitials. */
export const LIVE_CREW = EXAMPLE.crew.map((member) => ({
  ...member,
  image: CREATOR_ASSETS[member.avatar].src,
}));

const author = LIVE_CREW[0] ?? { name: EXAMPLE.idea.author, image: null };
const room = {
  id: budgetTravel.id,
  slug: budgetTravel.slug,
  name: budgetTravel.name,
  tint: budgetTravel.tint,
  icon: budgetTravel.icon,
};

function post(fields: Partial<PostCard> & Pick<PostCard, 'id' | 'title' | 'excerpt'>): PostCard {
  return {
    type: 'idea',
    status: 'open',
    rolesNeeded: [],
    openRoles: [],
    community: room,
    author: memberRef(author.name),
    useCount: 0,
    buildCount: 0,
    commentCount: 0,
    teamPreview: [],
    teamSize: 0,
    featured: false,
    createdAt: '2026-10-07T09:00:00.000Z',
    viewerSignals: [],
    isAuthor: false,
    pinned: false,
    answerGroup: null,
    lovedAt: null,
    challenge: null,
    ...fields,
  };
}

/** The Budget Travel feed in step 3: the Lisbon idea, still looking for its crew, and one more idea. */
export const LIVE_FEED: PostCard[] = [
  post({
    id: 'lisbon',
    type: 'project',
    status: 'forming_team',
    title: EXAMPLE.idea.title,
    excerpt: 'Seven days for $420 all in.',
    author: { ...memberRef(author.name), image: author.image },
    rolesNeeded: EXAMPLE.crew.map((member) => member.role),
    openRoles: EXAMPLE.crew.slice(1).map((member) => member.role),
    useCount: EXAMPLE.idea.use,
    buildCount: EXAMPLE.idea.build,
    commentCount: 41,
    teamPreview: [{ ...memberRef(author.name), image: author.image }],
    teamSize: 1,
    viewerSignals: ['use'],
  }),
  post({
    id: 'montreal',
    title: 'Montreal from New York for under $250',
    excerpt: 'Bus, hostel and food for three days.',
    author: memberRef('Dev Rao'),
    useCount: 15,
    buildCount: 1,
    commentCount: 6,
  }),
];

/** Today's top card in step 5: the finished guide, ready to feature. */
export const LIVE_DECISION: DecisionItem = {
  id: 'post:lisbon',
  kind: 'post',
  refId: 'lisbon',
  name: author.name,
  avatarUrl: author.image,
  context: EXAMPLE.idea.community,
  title: EXAMPLE.idea.title,
  quote: 'Seven days in Lisbon for $420 all in.',
  reason: 'Matches “budget-honest travel”.',
  score: EXAMPLE.idea.fit,
  lovedAt: null,
  href: '#',
};

/** The stat beside it: the one click count. */
export const LIVE_STAT = {
  value: EXAMPLE.clicks.total,
  label: 'Clicks on the guide',
  descriptor: 'since you featured it',
} as const;
