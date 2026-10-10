import type {
  CommentItem,
  createPostSchema,
  FeedPage,
  FeedQuery,
  IdeaItem,
  LinkItem,
  PostCard,
  PostDetail,
  RoleSlot,
  SignalKind,
  StudioPostAction,
  StudioPostDetail,
  TeamMember,
  updatePostSchema,
} from '@fellow-owners/shared';
import type { z } from 'zod';
import type { Analyzer, BackgroundRunner } from '../ai/types.js';
import type { Db } from '../db/client.js';
import type { CommunityRow } from '../db/schema/communities.js';
import type { MembershipRow } from '../db/schema/memberships.js';
import type { PostRow } from '../db/schema/posts.js';
import { LEAD_ROLE } from '../db/schema/social.js';
import type { SpaceRow } from '../db/schema/spaces.js';
import { toIso, toIsoOrNull } from '../lib/dates.js';
import { editWindowClosed, forbidden, notFound, validationError } from '../lib/errors.js';
import { contentHash } from '../lib/hash.js';
import type { Logger } from '../lib/logger.js';
import { clampLimit, decodeTimeCursor } from '../lib/pagination.js';
import {
  aiInsight,
  canEditContent,
  dedupeRoles,
  editableUntil,
  excerpt,
  isLeadRole,
  memberRef,
  openRoles,
  publicCommunity,
  roleKey,
  teamMember,
  unique,
} from '../lib/present.js';
import { ideaScore } from '../lib/ranking.js';
import type { Repos } from '../repositories/index.js';
import type { TeamMemberWithRef } from '../repositories/teams.repo.js';
import type { AccessService, MemberContext, OwnerContext, PostAccess } from './access.service.js';
import type { LimitsService } from './limits.service.js';
import type { NotificationsService } from './notifications.service.js';

export type CreatePostBody = z.output<typeof createPostSchema>;
export type UpdatePostBody = z.output<typeof updatePostSchema>;

export interface PostsServiceDeps {
  db: Db;
  repos: Repos;
  access: AccessService;
  limits: LimitsService;
  analyzer: Analyzer;
  background: BackgroundRunner;
  /** In-app notifications (notify after commit). */
  notifications: NotificationsService;
  logger: Logger;
}

/** Card preview stacks show at most this many accepted team members. */
const TEAM_PREVIEW_MAX = 4;

function issue(path: Array<string | number>, message: string) {
  return validationError([{ location: 'body', path, message, code: 'custom' }]);
}

/** Roles for a project: deduplicated; `Lead` is reserved for the author. */
function normalizeRolesNeeded(roles: readonly string[]): string[] {
  const deduped = dedupeRoles(roles);
  if (deduped.some(isLeadRole)) {
    throw issue(['rolesNeeded'], `"${LEAD_ROLE}" is reserved for the project author`);
  }
  return deduped;
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/** Field-wise: jsonb hands objects back with its own key order, so JSON text can't be compared. */
function sameLinks(a: readonly LinkItem[], b: readonly LinkItem[]): boolean {
  return (
    a.length === b.length &&
    a.every((link, index) => link.label === b[index]?.label && link.url === b[index]?.url)
  );
}

export function createPostsService(deps: PostsServiceDeps) {
  const { db, repos, access, limits } = deps;
  const log = deps.logger.child({ module: 'posts' });

  function analyzeLater(postId: string): void {
    deps.background.run(`analyze:post:${postId}`, () =>
      deps.analyzer.analyzeItem({ kind: 'post', id: postId }),
    );
  }

  // ------------------------------------------------------------ cards

  /**
   * PostCards for rows of one space, batch-loaded: communities, authors (MemberRef), accepted
   * teams (preview, size, open roles) and the viewer's own signals. Order follows `rows`.
   */
  async function buildCards(
    space: SpaceRow,
    rows: PostRow[],
    viewer: MembershipRow | null,
  ): Promise<PostCard[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const projectIds = rows.filter((row) => row.type === 'project').map((row) => row.id);
    const [communities, authors, teams, viewerSignals, challenges] = await Promise.all([
      repos.communities.findByIds(space.id, unique(rows.map((row) => row.communityId))),
      repos.memberships.refs(
        unique(rows.flatMap((row) => (row.authorMembershipId ? [row.authorMembershipId] : []))),
      ),
      repos.teams.listByPosts(projectIds, { statuses: ['accepted'] }),
      viewer
        ? repos.signals.viewerSignals(ids, viewer.id)
        : Promise.resolve(new Map<string, SignalKind[]>()),
      repos.posts.challengeRefs(unique(rows.flatMap((row) => (row.askId ? [row.askId] : [])))),
    ]);
    const communityById = new Map(communities.map((row) => [row.id, row]));

    return rows.map((row) => {
      const community = communityById.get(row.communityId);
      const accepted = teams.get(row.id) ?? [];
      const author = row.authorMembershipId ? authors.get(row.authorMembershipId) : undefined;
      return {
        id: row.id,
        type: row.type,
        status: row.status,
        title: row.title,
        excerpt: excerpt(row.body),
        rolesNeeded: row.rolesNeeded,
        openRoles: openRoles(
          row.rolesNeeded,
          accepted.map((member) => member.role),
        ),
        community: community
          ? {
              id: community.id,
              slug: community.slug,
              name: community.name,
              tint: community.tint,
              icon: community.icon,
            }
          : { id: row.communityId, slug: '', name: 'Community', tint: 'white', icon: 'users' },
        author: memberRef(author),
        useCount: row.useCount,
        buildCount: row.buildCount,
        commentCount: row.commentCount,
        teamPreview: accepted.slice(0, TEAM_PREVIEW_MAX).map((member) => memberRef(member)),
        teamSize: accepted.length,
        featured: row.featuredAt !== null,
        createdAt: toIso(row.createdAt),
        viewerSignals: viewerSignals.get(row.id) ?? [],
        isAuthor: viewer !== null && row.authorMembershipId === viewer.id,
        lovedAt: toIsoOrNull(row.lovedAt),
        challenge: row.askId ? (challenges.get(row.askId) ?? null) : null,
      };
    });
  }

  // ------------------------------------------------------------ detail parts

  interface DetailParts {
    roles: RoleSlot[];
    team: TeamMember[];
    viewerTeam: PostDetail['viewerTeam'];
    comments: CommentItem[];
  }

  /**
   * Roles, team and comments of one post. `fullTeam`: requested and declined rows too (the
   * author, and the owner in the studio); everyone else sees the accepted team only.
   */
  async function detailParts(
    post: PostRow,
    viewer: MembershipRow | null,
    { fullTeam }: { fullTeam: boolean },
  ): Promise<DetailParts> {
    const [teamRows, commentRows] = await Promise.all([
      post.type === 'project'
        ? repos.teams.listByPost(post.id)
        : Promise.resolve([] as TeamMemberWithRef[]),
      repos.comments.listByPost(post.id),
    ]);

    const roles: RoleSlot[] = post.rolesNeeded.map((role) => {
      const key = roleKey(role);
      const holder = teamRows.find((row) => row.status === 'accepted' && roleKey(row.role) === key);
      return {
        role,
        filled: Boolean(holder),
        filledBy: holder ? memberRef(holder) : null,
        requestCount: teamRows.filter(
          (row) => row.status === 'requested' && roleKey(row.role) === key,
        ).length,
      };
    });

    const visibleTeam = fullTeam ? teamRows : teamRows.filter((row) => row.status === 'accepted');
    const own = viewer ? teamRows.find((row) => row.membershipId === viewer.id) : undefined;

    const comments: CommentItem[] = commentRows.map((row) => ({
      id: row.id,
      body: row.body,
      author: row.authorMembershipId
        ? memberRef({
            membershipId: row.authorMembershipId,
            name: row.authorName,
            headline: row.authorHeadline,
            image: row.authorImage,
          })
        : memberRef(null),
      createdAt: toIso(row.createdAt),
      isOwn: viewer !== null && row.authorMembershipId === viewer.id,
    }));

    return {
      roles,
      team: visibleTeam.map(teamMember),
      viewerTeam: own ? { role: own.role, status: own.status } : null,
      comments,
    };
  }

  /** PostDetail for a member (no AI fields). The author also sees requested/declined team rows. */
  async function buildDetail(
    space: SpaceRow,
    post: PostRow,
    viewer: MembershipRow | null,
  ): Promise<PostDetail> {
    const isAuthor = viewer !== null && post.authorMembershipId === viewer.id;
    const [[card], parts] = await Promise.all([
      buildCards(space, [post], viewer),
      detailParts(post, viewer, { fullTeam: isAuthor }),
    ]);
    if (!card) throw notFound('Post');
    return {
      ...card,
      body: post.body,
      links: post.links ?? [],
      updatedAt: toIso(post.updatedAt),
      canEdit: isAuthor && canEditContent(post.createdAt),
      editableUntil: toIso(editableUntil(post.createdAt)),
      ...parts,
    };
  }

  // ------------------------------------------------------------ studio (owner) views

  /** IdeaItems (cards + AI fields + idea score + promotion state) in the order of `rows`. */
  async function buildIdeaItems(
    owner: OwnerContext,
    rows: PostRow[],
    now: Date = new Date(),
  ): Promise<IdeaItem[]> {
    if (rows.length === 0) return [];
    const [cards, promotions] = await Promise.all([
      buildCards(owner.space, rows, owner.membership),
      repos.promotions.byPostIds(
        owner.space.id,
        rows.map((row) => row.id),
      ),
    ]);
    return rows.map((row, index) => {
      const card = cards[index] as PostCard;
      return {
        ...card,
        ai: aiInsight(row, owner.space.tasteVersion),
        score: Math.round(ideaScore(row, now) * 10_000) / 10_000,
        hidden: row.hiddenAt !== null,
        promotion: promotions.get(row.id) ?? null,
      };
    });
  }

  async function buildStudioDetail(owner: OwnerContext, post: PostRow): Promise<StudioPostDetail> {
    const [[item], parts, feedback] = await Promise.all([
      buildIdeaItems(owner, [post]),
      detailParts(post, owner.membership, { fullTeam: true }),
      repos.feedback.find({
        spaceId: owner.space.id,
        refType: 'post',
        refId: post.id,
        userId: owner.userId,
      }),
    ]);
    if (!item) throw notFound('Post');
    return {
      ...item,
      body: post.body,
      links: post.links ?? [],
      roles: parts.roles,
      team: parts.team,
      comments: parts.comments,
      feedback,
    };
  }

  /** A post of the owner's space for the studio (hidden included, deleted 404). */
  async function studioPost(owner: OwnerContext, postId: string): Promise<PostRow> {
    const post = await repos.posts.findInSpace(owner.space.id, postId);
    if (!post || post.deletedAt) throw notFound('Post');
    return post;
  }

  // ------------------------------------------------------------ member: author checks

  function assertAuthor(ctx: PostAccess): void {
    if (ctx.post.authorMembershipId !== ctx.membership.id) {
      throw forbidden('Only the author can change this post');
    }
  }

  /** The joined, non-archived community a member posts in; 404 unknown, 403 not joined. */
  async function postableCommunity(ctx: MemberContext, communityId: string): Promise<CommunityRow> {
    const community = await repos.communities.findById(ctx.space.id, communityId);
    if (!community || community.archivedAt) throw notFound('Community');
    const joined = await repos.memberships.communityIds(ctx.membership.id);
    if (!joined.includes(community.id)) {
      throw forbidden(`Join ${community.name} to post in it`);
    }
    return community;
  }

  return {
    buildCards,
    buildDetail,
    buildIdeaItems,
    buildStudioDetail,

    /**
     * GET /api/spaces/:handle/communities/:slug/posts. Signed-in non-members get a locked page
     * (3 preview titles); members get the newest visible posts with a (created_at, id) cursor.
     */
    async feed(space: SpaceRow, slug: string, userId: string, query: FeedQuery): Promise<FeedPage> {
      const community = await repos.communities.findBySlug(space.id, slug);
      if (!community || community.archivedAt) throw notFound('Community');
      const membership = await access.activeMembership(space.id, userId);
      const counts = await repos.posts.countByType(space.id, community.id);
      if (!membership) {
        const preview = await repos.posts.previewTitles(space.id, community.id, 3);
        return {
          items: [],
          nextCursor: null,
          community: publicCommunity(community),
          counts,
          locked: true,
          preview,
          viewerJoinedCommunity: false,
        };
      }
      const [page, joined] = await Promise.all([
        repos.posts.listFeed({
          spaceId: space.id,
          communityId: community.id,
          type: query.type,
          cursor: decodeTimeCursor(query.cursor),
          limit: clampLimit(query.limit),
        }),
        repos.memberships.communityIds(membership.id),
      ]);
      return {
        items: await buildCards(space, page.items, membership),
        nextCursor: page.nextCursor,
        community: publicCommunity(community),
        counts,
        locked: false,
        preview: [],
        viewerJoinedCommunity: joined.includes(community.id),
      };
    },

    /**
     * POST /api/spaces/:handle/posts. Joined community only; 20/day cap checked in the insert's
     * transaction; projects get the author as Lead (accepted). Analysis runs in the background.
     */
    async create(ctx: MemberContext, input: CreatePostBody): Promise<PostDetail> {
      const community = await postableCommunity(ctx, input.communityId);
      const rolesNeeded = input.type === 'project' ? normalizeRolesNeeded(input.rolesNeeded) : [];
      const post = await db.transaction(async (tx) => {
        await limits.lockWrites(ctx.space.id, ctx.userId, tx);
        await limits.assertDailyCap('posts', ctx.space, ctx.membership.id, tx);
        const row = await repos.posts.insert(
          {
            spaceId: ctx.space.id,
            communityId: community.id,
            authorMembershipId: ctx.membership.id,
            type: input.type,
            title: input.title,
            body: input.body,
            rolesNeeded,
            links: input.links,
            contentHash: contentHash(input.title, input.body),
          },
          tx,
        );
        if (row.type === 'project') {
          await repos.teams.insert(
            {
              postId: row.id,
              membershipId: ctx.membership.id,
              role: LEAD_ROLE,
              status: 'accepted',
              decidedAt: row.createdAt,
            },
            tx,
          );
        }
        return row;
      });
      log.info({ postId: post.id, spaceId: ctx.space.id, type: post.type }, 'post created');
      analyzeLater(post.id);
      if (ctx.userId !== ctx.space.ownerUserId) {
        await deps.notifications.notify({
          userId: ctx.space.ownerUserId,
          spaceId: ctx.space.id,
          kind: 'idea_posted',
          payload: {
            postId: post.id,
            title: post.title,
            postType: post.type,
            actorName: (await deps.notifications.member(ctx.membership.id)).name,
            communityName: community.name,
          },
        });
      }
      return buildDetail(ctx.space, post, ctx.membership);
    },

    /** GET /api/posts/:id (member). */
    async detail(postId: string, userId: string): Promise<PostDetail> {
      const ctx = await access.requirePostAccess(postId, userId);
      return buildDetail(ctx.space, ctx.post, ctx.membership);
    },

    /**
     * PATCH /api/posts/:id (author). Content (title, body, roles, links) only within 24 hours of
     * creation; status any time. Fields equal to the stored value do not count as edits. A new
     * title/body means a new content_hash, analysis back to pending and a background re-run.
     */
    async update(postId: string, userId: string, input: UpdatePostBody): Promise<PostDetail> {
      const ctx = await access.requirePostAccess(postId, userId);
      assertAuthor(ctx);
      const { post } = ctx;

      const title = input.title ?? post.title;
      const body = input.body ?? post.body;
      let rolesNeeded = post.rolesNeeded;
      if (input.rolesNeeded !== undefined) {
        if (post.type !== 'project' && input.rolesNeeded.length > 0) {
          throw issue(['rolesNeeded'], 'Only projects can list roles');
        }
        rolesNeeded = post.type === 'project' ? normalizeRolesNeeded(input.rolesNeeded) : [];
      }
      const links = input.links ?? post.links;

      const contentEdited =
        title !== post.title ||
        body !== post.body ||
        !sameList(rolesNeeded, post.rolesNeeded) ||
        !sameLinks(links, post.links ?? []);
      if (contentEdited && !canEditContent(post.createdAt)) throw editWindowClosed();

      const statusChanged = input.status !== undefined && input.status !== post.status;
      if (!contentEdited && !statusChanged) return buildDetail(ctx.space, post, ctx.membership);

      const newHash = contentHash(title, body);
      const reanalyze = newHash !== post.contentHash;
      const updated = await db.transaction(async (tx) => {
        const row = await repos.posts.update(
          ctx.space.id,
          post.id,
          {
            ...(contentEdited ? { title, body, rolesNeeded, links } : {}),
            ...(statusChanged ? { status: input.status } : {}),
            ...(reanalyze ? { contentHash: newHash } : {}),
          },
          tx,
        );
        if (reanalyze) {
          return repos.posts.resetAnalysis(ctx.space.id, post.id, { clearEmbedding: true }, tx);
        }
        return row;
      });
      if (!updated) throw notFound('Post');
      if (reanalyze) analyzeLater(post.id);
      return buildDetail(ctx.space, updated, ctx.membership);
    },

    /** DELETE /api/posts/:id (author): soft delete. Hidden posts can still be deleted. */
    async remove(postId: string, userId: string): Promise<void> {
      const ctx = await access.requirePostAccess(postId, userId, { allowHidden: true });
      assertAuthor(ctx);
      await repos.posts.softDelete(ctx.space.id, ctx.post.id);
      log.info({ postId, spaceId: ctx.space.id }, 'post deleted');
    },

    /** GET /api/studio/posts/:id: hidden posts included. */
    async studioDetail(owner: OwnerContext, postId: string): Promise<StudioPostDetail> {
      return buildStudioDetail(owner, await studioPost(owner, postId));
    },

    /**
     * POST/DELETE /api/studio/posts/:id/love: "Loved by {creator}". Idempotent; the author hears
     * about it (post_loved) once per post: re-loving after an unlove sends nothing new.
     */
    async love(
      owner: OwnerContext,
      postId: string,
      loved: boolean,
    ): Promise<{ lovedAt: string | null }> {
      const post = await studioPost(owner, postId);
      const result = await repos.posts.setLoved(owner.space.id, post.id, loved);
      if (!result) throw notFound('Post');
      if (result.changed && loved) {
        const author = await deps.notifications.member(post.authorMembershipId);
        if (
          author.userId &&
          author.userId !== owner.userId &&
          // ponytail: check-then-insert; setLoved's flip already serialises concurrent loves.
          !(await repos.notifications.existsForPost(author.userId, 'post_loved', post.id))
        ) {
          await deps.notifications.notify({
            userId: author.userId,
            spaceId: owner.space.id,
            kind: 'post_loved',
            payload: { postId: post.id, title: post.title },
          });
        }
      }
      return { lovedAt: toIsoOrNull(result.lovedAt) };
    },

    /** PATCH /api/studio/posts/:id: hide, unhide, rescore (analysis reset + background). */
    async studioAction(
      owner: OwnerContext,
      postId: string,
      action: StudioPostAction['action'],
    ): Promise<StudioPostDetail> {
      const post = await studioPost(owner, postId);
      let updated: PostRow | null = post;
      if (action === 'hide' || action === 'unhide') {
        const hidden = action === 'hide';
        if (hidden !== (post.hiddenAt !== null)) {
          updated = await repos.posts.setHidden(owner.space.id, post.id, hidden);
        }
      } else {
        updated = await repos.posts.resetAnalysis(owner.space.id, post.id);
        analyzeLater(post.id);
      }
      if (!updated) throw notFound('Post');
      return buildStudioDetail(owner, updated);
    },
  };
}

export type PostsService = ReturnType<typeof createPostsService>;
