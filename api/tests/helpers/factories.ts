import type { CommunityIcon, PitchType, PostType, SignalKind, Tint } from '@fellow-owners/shared';
import type { Container } from '../../src/container.js';
import type { CommunityRow } from '../../src/db/schema/communities.js';
import type { InboundRow } from '../../src/db/schema/inbound.js';
import type { MembershipRow } from '../../src/db/schema/memberships.js';
import type { PostRow } from '../../src/db/schema/posts.js';
import { LEAD_ROLE } from '../../src/db/schema/social.js';
import type { SpaceRow } from '../../src/db/schema/spaces.js';
import { contentHash } from '../../src/lib/hash.js';

let sequence = 0;
const next = () => {
  sequence += 1;
  return `${Date.now().toString(36)}${sequence}`;
};

export interface TestUser {
  id: string;
  email: string;
  name: string;
}

export interface TestSpace {
  space: SpaceRow;
  owner: TestUser;
  ownerMembership: MembershipRow;
  communities: CommunityRow[];
}

/**
 * Database factories over the container's repositories (no HTTP). Each call creates fresh rows
 * with unique emails and handles. Pair with resetDatabase() from test-db.ts.
 */
export function createFactories(container: Container) {
  const { repos, auth } = container;

  async function user(overrides: { email?: string; name?: string } = {}): Promise<TestUser> {
    const ctx = await auth.$context;
    const id = next();
    const email = overrides.email ?? `user-${id}@example.com`;
    const name = overrides.name ?? `User ${id}`;
    const created = await ctx.internalAdapter.createUser(
      { email, name, emailVerified: true },
      { method: 'admin' },
    );
    return { id: created.id, email, name };
  }

  async function space(
    overrides: {
      owner?: TestUser;
      handle?: string;
      displayName?: string;
      communities?: Array<{ name: string; slug: string; tint?: Tint; icon?: CommunityIcon }>;
      tasteProfile?: SpaceRow['tasteProfile'];
      isDemo?: boolean;
    } = {},
  ): Promise<TestSpace> {
    const owner = overrides.owner ?? (await user());
    const created = await repos.spaces.insert({
      ownerUserId: owner.id,
      handle: overrides.handle ?? `space_${next()}`.slice(0, 30),
      displayName: overrides.displayName ?? owner.name,
      isDemo: overrides.isDemo ?? false,
      tasteProfile: overrides.tasteProfile ?? {
        promote: ['fitness apps for creators', 'design tools'],
        never: ['crypto schemes'],
        voice: [],
      },
    });
    const ownerMembership = await repos.memberships.insert({
      spaceId: created.id,
      userId: owner.id,
      role: 'owner',
    });
    const specs = overrides.communities ?? [
      {
        name: 'Budget Travel',
        slug: 'budget-travel',
        tint: 'lime' as const,
        icon: 'globe' as const,
      },
      {
        name: 'Solo Travelers',
        slug: 'solo-travelers',
        tint: 'peach' as const,
        icon: 'users' as const,
      },
    ];
    const communities = await repos.communities.insertMany(
      specs.map((spec, i) => ({
        spaceId: created.id,
        name: spec.name,
        slug: spec.slug,
        tint: spec.tint ?? 'white',
        icon: spec.icon ?? 'users',
        sortOrder: i,
      })),
    );
    return { space: created, owner, ownerMembership, communities };
  }

  /** A member of the space, joined to `communityIds` (member_count kept in sync). */
  async function member(
    spaceId: string,
    overrides: {
      user?: TestUser;
      communityIds?: string[];
      headline?: string;
      intro?: string;
      skills?: string[];
    } = {},
  ): Promise<{ user: TestUser; membership: MembershipRow }> {
    const memberUser = overrides.user ?? (await user());
    const membership = await repos.memberships.insert({
      spaceId,
      userId: memberUser.id,
      headline: overrides.headline ?? null,
      intro: overrides.intro ?? null,
      skills: overrides.skills ?? [],
    });
    if (overrides.communityIds?.length) {
      await repos.memberships.addCommunities(spaceId, membership.id, overrides.communityIds);
    }
    return { user: memberUser, membership };
  }

  /**
   * A post (analysis pending). Projects get the author as Lead, accepted. A null author is a
   * "Former member" post. `askId` makes it a challenge entry.
   */
  async function post(
    spaceId: string,
    communityId: string,
    authorMembershipId: string | null,
    overrides: {
      type?: PostType;
      title?: string;
      body?: string;
      rolesNeeded?: string[];
      createdAt?: Date;
      askId?: string;
    } = {},
  ): Promise<PostRow> {
    const title = overrides.title ?? `Post ${next()}`;
    const body =
      overrides.body ?? 'A gym log app for creators that turns lifts into shareable stats.';
    const type = overrides.type ?? 'idea';
    const row = await repos.posts.insert({
      spaceId,
      communityId,
      authorMembershipId,
      type,
      title,
      body,
      rolesNeeded: type === 'project' ? (overrides.rolesNeeded ?? ['Designer']) : [],
      contentHash: contentHash(title, body),
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
      ...(overrides.askId ? { askId: overrides.askId } : {}),
    });
    if (type === 'project' && authorMembershipId) {
      await repos.teams.insert({
        postId: row.id,
        membershipId: authorMembershipId,
        role: LEAD_ROLE,
        status: 'accepted',
        decidedAt: row.createdAt,
      });
    }
    return row;
  }

  /** A pitch (analysis pending). */
  async function pitch(
    spaceId: string,
    senderMembershipId: string,
    overrides: { type?: PitchType; subject?: string; body?: string; createdAt?: Date } = {},
  ): Promise<InboundRow> {
    const subject = overrides.subject ?? `Collab idea ${next()}`;
    const body =
      overrides.body ?? 'We would love to partner with you on a fitness campaign for creators.';
    return repos.pitches.insert({
      spaceId,
      senderMembershipId,
      type: overrides.type ?? 'collab',
      subject,
      body,
      contentHash: contentHash(subject, body),
      ...(overrides.createdAt ? { createdAt: overrides.createdAt } : {}),
    });
  }

  /** A signal on a post; use_count / build_count move with it (signals.repo). */
  async function signal(postId: string, membershipId: string, kind: SignalKind = 'use') {
    return repos.signals.add(postId, membershipId, kind);
  }

  return { user, space, member, post, pitch, signal };
}

export type Factories = ReturnType<typeof createFactories>;
