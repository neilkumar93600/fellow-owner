import { LIMITS, type SimilarPeople, type SimilarResult } from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import type { MembershipRow } from '../db/schema/memberships.js';
import type { PostRow } from '../db/schema/posts.js';
import type { SpaceRow } from '../db/schema/spaces.js';
import { notFound } from '../lib/errors.js';
import { memberRef } from '../lib/present.js';
import type { AccessService } from './access.service.js';
import type { PostsService } from './posts.service.js';

export type SimilarServiceDeps = Pick<CoreDeps, 'repos'> & {
  access: AccessService;
  posts: PostsService;
};

const EMPTY: SimilarResult = { posts: [], people: [] };

/** F17 similar ideas + people who could help: nearest posts and members to a post's embedding. */
export function createSimilarService(deps: SimilarServiceDeps) {
  const { repos, access, posts } = deps;

  /** Their headline, else the skill the post text mentions, else their first skill. */
  function reasonFor(member: MembershipRow, post: PostRow): string {
    if (member.headline) return member.headline;
    const skills = member.skills ?? [];
    const text = `${post.title} ${post.body}`.toLowerCase();
    return (
      skills.find((skill) => text.includes(skill.toLowerCase())) ??
      skills[0] ??
      'Member of this space'
    );
  }

  async function similarTo(
    space: SpaceRow,
    post: PostRow,
    viewer: MembershipRow | null,
  ): Promise<SimilarResult> {
    // ponytail: no on-the-fly embedding; the analyzer / db:embed fill it, until then nothing matches.
    if (!post.embedding) return EMPTY;
    const { maxDistance, postsMax, peopleMax } = LIMITS.similar;
    const [nearPosts, nearMembers] = await Promise.all([
      repos.search.nearestPosts(space.id, post.embedding, postsMax, {
        excludeId: post.id,
        maxDistance,
      }),
      repos.search.nearestMembers(space.id, post.embedding, peopleMax, {
        ...(post.authorMembershipId ? { excludeMembershipId: post.authorMembershipId } : {}),
      }),
    ]);

    const rows = await repos.posts.findManyByIds(
      space.id,
      nearPosts.map((hit) => hit.id),
    );
    const byId = new Map(rows.map((row) => [row.id, row]));
    const ordered = nearPosts.flatMap((hit) => {
      const row = byId.get(hit.id);
      return row ? [row] : [];
    });

    const closeMembers = nearMembers.filter((hit) => hit.distance <= maxDistance);
    const [cards, memberRows, refs] = await Promise.all([
      posts.buildCards(space, ordered, viewer),
      Promise.all(closeMembers.map((hit) => repos.memberships.findById(space.id, hit.id))),
      repos.memberships.refs(closeMembers.map((hit) => hit.id)),
    ]);
    const people = memberRows.flatMap((member): SimilarPeople[] => {
      if (!member || member.removedAt) return [];
      return [
        {
          membershipId: member.id,
          member: memberRef(refs.get(member.id)),
          headline: member.headline,
          reason: reasonFor(member, post),
        },
      ];
    });
    return { posts: cards, people };
  }

  return {
    /** GET /api/posts/:postId/similar: only posts the member can see. */
    async forMember(userId: string, postId: string): Promise<SimilarResult> {
      const ctx = await access.requirePostAccess(postId, userId);
      return similarTo(ctx.space, ctx.post, ctx.membership);
    },

    /** GET /api/studio/posts/:postId/similar: a post of the owner's own space (hidden too). */
    async forOwner(spaceId: string, postId: string): Promise<SimilarResult> {
      const [space, post] = await Promise.all([
        repos.spaces.findById(spaceId),
        repos.posts.findInSpace(spaceId, postId),
      ]);
      if (!space || !post || post.deletedAt) throw notFound('Post');
      return similarTo(space, post, null);
    },
  };
}

export type SimilarService = ReturnType<typeof createSimilarService>;
