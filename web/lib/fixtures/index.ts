import type {
  Briefing,
  CoachResult,
  FeedPage,
  IdeasPage,
  InboxDetail,
  InboxPage,
  MySpace,
  Overview,
  PeoplePage,
  PostDetail,
  PromotionComposer,
  PromotionsPage,
  QuestionGroup,
  Showcase,
  SpacePage,
  StudioCommunity,
  StudioCommunityDetail,
  StudioPostDetail,
  StudioSpace,
  ViewerMembership,
} from '@fellow-owners/shared';
import briefing from './briefing.json';
import coach from './coach.json';
import communities from './communities.json';
import communityDetail from './community-detail.json';
import composer from './composer.json';
import feed from './feed.json';
import ideaDetail from './idea-detail.json';
import ideas from './ideas.json';
import inbox from './inbox.json';
import inboxDetail from './inbox-detail.json';
import inboxFiltered from './inbox-filtered.json';
import me from './me.json';
import membership from './membership.json';
import overview from './overview.json';
import people from './people.json';
import post from './post.json';
import promotions from './promotions.json';
import questionGroups from './question-groups.json';
import showcase from './showcase.json';
import spacePage from './space-page.json';
import studioSpace from './studio-space.json';

/**
 * Design fixtures: real responses captured from the seeded travel demo API (Mira's space, signed in as the
 * creator or as the demo fan Priya Shah) on 2026-10-09. Screens render from these until the data layer
 * (web/api + web/hooks/queries) is wired in; swap a fixture for its hook and the props stay the same.
 * JSON imports widen string unions, hence the casts.
 */
export const fixtures = {
  studioSpace: studioSpace as unknown as StudioSpace,
  overview: overview as unknown as Overview,
  briefing: briefing as unknown as Briefing,
  inbox: inbox as unknown as InboxPage,
  inboxFiltered: inboxFiltered as unknown as InboxPage,
  inboxDetail: inboxDetail as unknown as InboxDetail,
  ideas: ideas as unknown as IdeasPage,
  ideaDetail: ideaDetail as unknown as StudioPostDetail,
  people: people as unknown as PeoplePage,
  communities: communities as unknown as StudioCommunity[],
  communityDetail: communityDetail as unknown as StudioCommunityDetail,
  promotions: promotions as unknown as PromotionsPage,
  composer: composer as unknown as PromotionComposer,
  spacePage: spacePage as unknown as SpacePage,
  membership: membership as unknown as ViewerMembership,
  me: me as unknown as MySpace,
  feed: feed as unknown as FeedPage,
  post: post as unknown as PostDetail,
  showcase: showcase as unknown as Showcase,
  /** Design-only (2026-10-03, idea loop spec): no API yet, so these were written by hand. */
  coach: coach as unknown as { pitch: CoachResult; post: CoachResult },
  questionGroups: questionGroups as unknown as QuestionGroup[],
} as const;
