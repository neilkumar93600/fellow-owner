// Static props for the real components in the loop's live layer (loop-live.tsx), built from DEMO so the
// product UI says the same numbers as the cards. No queries, no router: fixtures only.

import type { MemberRef, PostCard, PublicCommunity, PublicSpace } from '@fellow-owners/shared';
import type { DecisionItem } from '@/components/dashboard/today/decision-items';
import { CREATOR_ASSETS } from '@/lib/creator-assets';
import { DEMO } from './demo-data';

const SITE = 'fellowowners.app';

/** The browser's URL pill per step (followers, communities, idea, crew, featured). */
export const LIVE_URLS = [
  `${SITE}/${DEMO.creator.handle}`,
  `${SITE}/${DEMO.creator.handle}/join`,
  `${SITE}/${DEMO.creator.handle}/c/${DEMO.idea.communitySlug}`,
  `${SITE}/${DEMO.creator.handle}/p/lisbon-on-60-a-day`,
  `${SITE}/dashboard`,
] as const;

export const LIVE_SPACE: PublicSpace = {
  id: 'demo-space',
  handle: DEMO.creator.handle,
  displayName: DEMO.creator.name,
  bio: DEMO.creator.bio,
  avatarUrl: DEMO.creator.avatarUrl,
  platforms: DEMO.followers.platforms.map((entry) => ({
    platform: entry.platform,
    url: entry.url,
    followers: entry.count,
  })),
  totalFollowers: DEMO.followers.total,
  memberCount: DEMO.members,
  isDemo: true,
};

export const LIVE_ROOMS: PublicCommunity[] = DEMO.rooms.map((room, index) => ({
  id: room.slug,
  slug: room.slug,
  name: room.name,
  description: room.description,
  tint: room.tint,
  icon: room.icon,
  memberCount: room.members,
  sortOrder: index,
}));

const budgetTravel = LIVE_ROOMS.find((room) => room.slug === DEMO.idea.communitySlug);
if (!budgetTravel) throw new Error('DEMO.idea.communitySlug must name one of DEMO.rooms');

/** The room the fan joins in step 2 (shown as Joined). */
export const LIVE_JOINED_ROOM = budgetTravel;

/** The fan's one line and the rooms the AI suggests for it (the join screen on the phone). */
export const LIVE_JOIN = {
  intro: 'Solo traveler from Austin. Cheap flights, street food, real prices.',
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
export const LIVE_CREW = DEMO.crew.map((member) => ({
  ...member,
  image: CREATOR_ASSETS[member.avatar].src,
}));

const author = LIVE_CREW[0] ?? { name: DEMO.idea.author, image: null };
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
    title: DEMO.idea.title,
    excerpt: DEMO.idea.excerpt,
    author: { ...memberRef(author.name), image: author.image },
    rolesNeeded: DEMO.crew.map((member) => member.role),
    openRoles: DEMO.crew.slice(1).map((member) => member.role),
    useCount: DEMO.idea.use,
    buildCount: DEMO.idea.build,
    commentCount: 41,
    teamPreview: [{ ...memberRef(author.name), image: author.image }],
    teamSize: 1,
    viewerSignals: ['use'],
  }),
  post({
    id: 'montreal',
    title: 'A long weekend from New York to Montreal and back for under $250',
    excerpt: 'Bus, hostel and food for three days, with every price dated.',
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
  context: DEMO.idea.community,
  title: DEMO.idea.title,
  quote: DEMO.idea.excerpt,
  reason: DEMO.idea.reason,
  score: DEMO.idea.fit,
  lovedAt: null,
  href: '#',
};

/** The stat beside it: the one click count. */
export const LIVE_STAT = {
  value: DEMO.clicks.total,
  label: 'Clicks on the guide',
  descriptor: 'since you featured it',
} as const;
