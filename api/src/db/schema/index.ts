import { relations } from 'drizzle-orm';
import { aiFeedback, aiRuns, digests } from './ai.js';
import { account, session, user } from './auth.js';
import { communities, communityMembers } from './communities.js';
import { followerCommunities, followers } from './followers.js';
import { inbound } from './inbound.js';
import { asks, imports, notifications } from './later.js';
import { memberships } from './memberships.js';
import { posts } from './posts.js';
import { clickEvents, promotions } from './promotions.js';
import { comments, signals, teamMembers } from './social.js';
import { spaces } from './spaces.js';

export * from './ai.js';
export * from './auth.js';
export * from './columns.js';
export * from './communities.js';
export * from './enums.js';
export * from './followers.js';
export * from './inbound.js';
export * from './later.js';
export * from './memberships.js';
export * from './newsletter.js';
export * from './posts.js';
export * from './promotions.js';
export * from './social.js';
export * from './spaces.js';

// relations() for drizzle's relational query builder (db.query.*). They add no SQL constraints.

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  memberships: many(memberships),
  ownedSpace: one(spaces, { fields: [user.id], references: [spaces.ownerUserId] }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const spacesRelations = relations(spaces, ({ one, many }) => ({
  owner: one(user, { fields: [spaces.ownerUserId], references: [user.id] }),
  communities: many(communities),
  memberships: many(memberships),
  posts: many(posts),
  inbound: many(inbound),
  promotions: many(promotions),
  digests: many(digests),
}));

export const communitiesRelations = relations(communities, ({ one, many }) => ({
  space: one(spaces, { fields: [communities.spaceId], references: [spaces.id] }),
  members: many(communityMembers),
  posts: many(posts),
}));

export const communityMembersRelations = relations(communityMembers, ({ one }) => ({
  community: one(communities, {
    fields: [communityMembers.communityId],
    references: [communities.id],
  }),
  membership: one(memberships, {
    fields: [communityMembers.membershipId],
    references: [memberships.id],
  }),
}));

export const membershipsRelations = relations(memberships, ({ one, many }) => ({
  space: one(spaces, { fields: [memberships.spaceId], references: [spaces.id] }),
  user: one(user, { fields: [memberships.userId], references: [user.id] }),
  communities: many(communityMembers),
  posts: many(posts),
  comments: many(comments),
  signals: many(signals),
  teams: many(teamMembers),
  pitches: many(inbound),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  space: one(spaces, { fields: [posts.spaceId], references: [spaces.id] }),
  community: one(communities, { fields: [posts.communityId], references: [communities.id] }),
  author: one(memberships, {
    fields: [posts.authorMembershipId],
    references: [memberships.id],
  }),
  ask: one(asks, { fields: [posts.askId], references: [asks.id] }),
  comments: many(comments),
  signals: many(signals),
  team: many(teamMembers),
  promotion: one(promotions),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, { fields: [comments.postId], references: [posts.id] }),
  space: one(spaces, { fields: [comments.spaceId], references: [spaces.id] }),
  author: one(memberships, {
    fields: [comments.authorMembershipId],
    references: [memberships.id],
  }),
}));

export const signalsRelations = relations(signals, ({ one }) => ({
  post: one(posts, { fields: [signals.postId], references: [posts.id] }),
  membership: one(memberships, {
    fields: [signals.membershipId],
    references: [memberships.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  post: one(posts, { fields: [teamMembers.postId], references: [posts.id] }),
  membership: one(memberships, {
    fields: [teamMembers.membershipId],
    references: [memberships.id],
  }),
}));

export const inboundRelations = relations(inbound, ({ one }) => ({
  space: one(spaces, { fields: [inbound.spaceId], references: [spaces.id] }),
  sender: one(memberships, {
    fields: [inbound.senderMembershipId],
    references: [memberships.id],
  }),
}));

export const promotionsRelations = relations(promotions, ({ one, many }) => ({
  space: one(spaces, { fields: [promotions.spaceId], references: [spaces.id] }),
  post: one(posts, { fields: [promotions.postId], references: [posts.id] }),
  createdBy: one(user, { fields: [promotions.createdByUserId], references: [user.id] }),
  clicks: many(clickEvents),
}));

export const clickEventsRelations = relations(clickEvents, ({ one }) => ({
  promotion: one(promotions, {
    fields: [clickEvents.promotionId],
    references: [promotions.id],
  }),
}));

export const digestsRelations = relations(digests, ({ one }) => ({
  space: one(spaces, { fields: [digests.spaceId], references: [spaces.id] }),
  community: one(communities, {
    fields: [digests.communityId],
    references: [communities.id],
  }),
}));

export const aiRunsRelations = relations(aiRuns, ({ one }) => ({
  space: one(spaces, { fields: [aiRuns.spaceId], references: [spaces.id] }),
}));

export const aiFeedbackRelations = relations(aiFeedback, ({ one }) => ({
  space: one(spaces, { fields: [aiFeedback.spaceId], references: [spaces.id] }),
}));

export const asksRelations = relations(asks, ({ one, many }) => ({
  space: one(spaces, { fields: [asks.spaceId], references: [spaces.id] }),
  community: one(communities, { fields: [asks.communityId], references: [communities.id] }),
  posts: many(posts),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(user, { fields: [notifications.userId], references: [user.id] }),
  space: one(spaces, { fields: [notifications.spaceId], references: [spaces.id] }),
}));

export const importsRelations = relations(imports, ({ one }) => ({
  space: one(spaces, { fields: [imports.spaceId], references: [spaces.id] }),
}));

export const followersRelations = relations(followers, ({ one, many }) => ({
  space: one(spaces, { fields: [followers.spaceId], references: [spaces.id] }),
  import: one(imports, { fields: [followers.importId], references: [imports.id] }),
  membership: one(memberships, {
    fields: [followers.membershipId],
    references: [memberships.id],
  }),
  communities: many(followerCommunities),
}));

export const followerCommunitiesRelations = relations(followerCommunities, ({ one }) => ({
  follower: one(followers, {
    fields: [followerCommunities.followerId],
    references: [followers.id],
  }),
  community: one(communities, {
    fields: [followerCommunities.communityId],
    references: [communities.id],
  }),
}));
