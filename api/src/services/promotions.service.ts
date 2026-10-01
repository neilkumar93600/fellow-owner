import {
  type ClickPlatform,
  type cursorQuerySchema,
  hasPublishableDraft,
  LIMITS,
  PROMOTION_PLATFORMS,
  type Promotion,
  type PromotionAction,
  type PromotionComposer,
  type PromotionDraft,
  type PromotionDrafts,
  type PromotionPlatform,
  type PromotionsPage,
  type Showcase,
} from '@fellow-owners/shared';
import type { z } from 'zod';
import type { AiServices, PromoteDraftsInput } from '../ai/types.js';
import { isAiUnavailable } from '../ai/types.js';
import type { Env } from '../config/env.js';
import type { Db } from '../db/client.js';
import type { PostRow } from '../db/schema/posts.js';
import type { PromotionRow } from '../db/schema/promotions.js';
import type { SpaceRow } from '../db/schema/spaces.js';
import { toIso, toIsoOrNull } from '../lib/dates.js';
import { uniqueViolation } from '../lib/db-errors.js';
import { conflict, notFound } from '../lib/errors.js';
import type { Logger } from '../lib/logger.js';
import { clampLimit, decodeTimeCursor } from '../lib/pagination.js';
import { displayName, excerpt, memberRef, openRoles, teamMember, unique } from '../lib/present.js';
import { generateUniqueShortCode } from '../lib/short-code.js';
import { slugify, uniqueSlug } from '../lib/slug.js';
import type { Repos } from '../repositories/index.js';
import { promotionState } from '../repositories/promotions.repo.js';
import type { AccessService, OwnerContext } from './access.service.js';
import type { LimitsService } from './limits.service.js';
import type { PostsService } from './posts.service.js';

export type CursorQuery = z.output<typeof cursorQuerySchema>;

export interface PromotionsServiceDeps {
  db: Db;
  env: Env;
  repos: Repos;
  access: AccessService;
  limits: LimitsService;
  posts: PostsService;
  ai: AiServices;
  logger: Logger;
}

/** Showcase slugs are cut to this many characters (unique per space). */
const SHOWCASE_SLUG_MAX = 60;
/** The composer waits at most this long for drafts (02-trd: < 20 s), then records failures. */
const DRAFTS_TIMEOUT_MS = 25_000;
/** Attempts when a concurrent publish takes the same slug or short code. */
const PUBLISH_ATTEMPTS = 3;

const emptyClicks = (): Record<ClickPlatform, number> => ({
  x: 0,
  instagram: 0,
  linkedin: 0,
  youtube: 0,
  other: 0,
});

/** A draft cut to the platform limits (hashtags without '#', max 5). */
export function cleanDraft(platform: PromotionPlatform, draft: PromotionDraft): PromotionDraft {
  const { hashtags } = LIMITS.promotion;
  return {
    text: (draft.text ?? '').slice(0, LIMITS.promotion.text[platform]),
    hashtags: unique(
      (draft.hashtags ?? [])
        .map((tag) => String(tag).trim().replace(/^#+/, '').slice(0, hashtags.itemMax))
        .filter(Boolean),
    ).slice(0, hashtags.max),
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Promotions (02-trd data flow 4): one per post. Creating one writes the draft row and asks the
 * smart model for X / Instagram / LinkedIn / YouTube drafts synchronously; platforms that fail go
 * to draftErrors (never a failed request). Publishing needs one non-empty draft and sets
 * published_at, the showcase slug (unique per space), the 8-char short code (global) and the
 * post's featured_at; unpublishing clears featured_at. Slug and code survive a republish.
 */
export function createPromotionsService(deps: PromotionsServiceDeps) {
  const { db, env, repos, access, limits, posts } = deps;
  const log = deps.logger.child({ module: 'promotions' });
  const webOrigin = env.WEB_ORIGIN.replace(/\/+$/, '');

  const showcasePath = (space: SpaceRow, slug: string) =>
    `/${encodeURIComponent(space.handle)}/s/${encodeURIComponent(slug)}`;

  /** Promotion responses for rows of one space (batch-loaded posts, authors, clicks). */
  async function toPromotions(space: SpaceRow, rows: PromotionRow[]): Promise<Promotion[]> {
    if (rows.length === 0) return [];
    const postRows = await repos.posts.findManyByIds(
      space.id,
      unique(rows.map((row) => row.postId)),
    );
    const [communities, authors, clicks] = await Promise.all([
      repos.communities.findByIds(space.id, unique(postRows.map((post) => post.communityId))),
      repos.memberships.refs(
        unique(
          postRows.flatMap((post) => (post.authorMembershipId ? [post.authorMembershipId] : [])),
        ),
      ),
      repos.clicks.byPlatform(rows.map((row) => row.id)),
    ]);
    const postById = new Map(postRows.map((post) => [post.id, post]));
    const communityById = new Map(communities.map((row) => [row.id, row]));

    return rows.map((row) => {
      const post = postById.get(row.postId);
      const community = post ? communityById.get(post.communityId) : undefined;
      const author = post?.authorMembershipId ? authors.get(post.authorMembershipId) : undefined;
      return {
        id: row.id,
        postId: row.postId,
        post: {
          title: post?.title ?? '',
          excerpt: post ? excerpt(post.body) : '',
          type: post?.type ?? 'idea',
          community: community
            ? { slug: community.slug, name: community.name, tint: community.tint }
            : { slug: '', name: 'Community', tint: 'white' },
          author: memberRef(author),
        },
        headline: row.headline,
        drafts: row.drafts ?? {},
        draftErrors: row.draftErrors ?? [],
        state: promotionState(row),
        showcaseSlug: row.showcaseSlug,
        shortCode: row.shortCode,
        shortPath: row.shortCode ? `/r/${row.shortCode}` : null,
        showcasePath: row.showcaseSlug ? showcasePath(space, row.showcaseSlug) : null,
        clickCount: row.clickCount,
        clicksByPlatform: { ...emptyClicks(), ...(clicks.get(row.id) ?? {}) },
        publishedAt: toIsoOrNull(row.publishedAt),
        unpublishedAt: toIsoOrNull(row.unpublishedAt),
        createdAt: toIso(row.createdAt),
        updatedAt: toIso(row.updatedAt),
      };
    });
  }

  async function toPromotion(space: SpaceRow, row: PromotionRow): Promise<Promotion> {
    const [promotion] = await toPromotions(space, [row]);
    if (!promotion) throw notFound('Promotion');
    return promotion;
  }

  /** The promoted post, which must still exist and be visible to fans. */
  async function promotablePost(space: SpaceRow, postId: string): Promise<PostRow> {
    const post = await repos.posts.findInSpace(space.id, postId);
    if (!post || post.deletedAt) throw notFound('Post');
    if (post.hiddenAt) throw conflict('Unhide this post before promoting it');
    return post;
  }

  /**
   * Runs promoteDrafts for `platforms` and stores the result: successful platforms replace their
   * drafts, failed ones (or all of them when the AI is unavailable) go to draftErrors.
   */
  async function generateDrafts(
    owner: OwnerContext,
    promotion: PromotionRow,
    post: PostRow,
    platforms: PromotionPlatform[],
  ): Promise<PromotionRow> {
    const { space } = owner;
    let produced: Partial<Record<PromotionPlatform, PromotionDraft>> = {};
    let failed: PromotionPlatform[] = [...platforms];
    let suggestedHeadline: string | null = null;
    try {
      const [community, authors, team] = await Promise.all([
        repos.communities.findById(space.id, post.communityId),
        repos.memberships.refs(post.authorMembershipId ? [post.authorMembershipId] : []),
        post.type === 'project'
          ? repos.teams.listByPost(post.id, { statuses: ['accepted'] })
          : Promise.resolve([]),
      ]);
      const input: PromoteDraftsInput = {
        post: {
          id: post.id,
          type: post.type,
          status: post.status,
          title: post.title,
          body: post.body,
          links: post.links ?? [],
          rolesNeeded: openRoles(
            post.rolesNeeded,
            team.map((member) => member.role),
          ),
          communityName: community?.name ?? 'the community',
          authorName: post.authorMembershipId
            ? displayName(authors.get(post.authorMembershipId)?.name)
            : 'a former member',
        },
        team: team.map((member) => ({ name: displayName(member.name), role: member.role })),
        tasteProfile: space.tasteProfile,
        voice: space.tasteProfile.voice ?? [],
        creatorName: space.displayName,
        showcaseUrl: promotion.showcaseSlug
          ? `${webOrigin}${showcasePath(space, promotion.showcaseSlug)}`
          : null,
        platforms,
      };
      const output = await withTimeout(
        deps.ai.promoteDrafts(input, {
          spaceId: space.id,
          userId: owner.userId,
          refType: 'promotion',
          refId: promotion.id,
        }),
        DRAFTS_TIMEOUT_MS,
        'promoteDrafts',
      );
      produced = {};
      for (const platform of platforms) {
        const draft = output.drafts[platform];
        if (draft && !output.failed.includes(platform) && draft.text?.trim()) {
          produced[platform] = cleanDraft(platform, draft);
        }
      }
      failed = platforms.filter((platform) => !produced[platform]);
      suggestedHeadline = output.headline?.trim()
        ? output.headline.trim().slice(0, LIMITS.promotion.headline.max)
        : null;
    } catch (error) {
      if (isAiUnavailable(error)) {
        log.info(
          { promotionId: promotion.id, reason: error.reason },
          'promotion drafts unavailable',
        );
      } else {
        log.error({ err: error, promotionId: promotion.id }, 'promotion drafts failed');
      }
    }

    const drafts: PromotionDrafts = { ...(promotion.drafts ?? {}), ...produced };
    const draftErrors = unique([
      ...(promotion.draftErrors ?? []).filter((platform) => !platforms.includes(platform)),
      ...failed,
    ]);
    const updated = await repos.promotions.update(space.id, promotion.id, {
      drafts,
      draftErrors,
      ...(promotion.headline === null && suggestedHeadline ? { headline: suggestedHeadline } : {}),
    });
    if (!updated) throw notFound('Promotion');
    return updated;
  }

  async function publish(owner: OwnerContext, promotion: PromotionRow): Promise<PromotionRow> {
    const { space } = owner;
    if (promotionState(promotion) === 'live') return promotion;
    const post = await promotablePost(space, promotion.postId);
    if (!hasPublishableDraft(promotion.drafts)) {
      throw conflict('Write at least one draft before publishing');
    }
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await db.transaction(async (tx) => {
          const slug =
            promotion.showcaseSlug ??
            uniqueSlug(
              slugify(post.title, SHOWCASE_SLUG_MAX, 'project'),
              await repos.promotions.listSlugs(space.id, tx),
              SHOWCASE_SLUG_MAX,
            );
          const code =
            promotion.shortCode ??
            (await generateUniqueShortCode((candidate) =>
              repos.promotions.shortCodeTaken(candidate, tx),
            ));
          const row = await repos.promotions.publish(
            space.id,
            promotion.id,
            { showcaseSlug: slug, shortCode: code },
            tx,
          );
          if (!row) throw notFound('Promotion');
          await repos.posts.setFeatured(space.id, post.id, true, tx);
          return row;
        });
      } catch (error) {
        if (attempt < PUBLISH_ATTEMPTS && uniqueViolation(error) !== null) continue;
        throw error;
      }
    }
  }

  async function unpublish(owner: OwnerContext, promotion: PromotionRow): Promise<PromotionRow> {
    const state = promotionState(promotion);
    if (state === 'draft') throw conflict('This promotion is not published');
    if (state === 'unpublished') return promotion;
    return db.transaction(async (tx) => {
      const row = await repos.promotions.unpublish(owner.space.id, promotion.id, tx);
      if (!row) throw notFound('Promotion');
      await repos.posts.setFeatured(owner.space.id, promotion.postId, false, tx);
      return row;
    });
  }

  return {
    toPromotions,

    /** GET /api/studio/promotions: newest first, (created_at, id) cursor, counts per state. */
    async list(owner: OwnerContext, query: CursorQuery): Promise<PromotionsPage> {
      const { space } = owner;
      const [page, totals] = await Promise.all([
        repos.promotions.list(space.id, {
          cursor: decodeTimeCursor(query.cursor),
          limit: clampLimit(query.limit),
        }),
        repos.promotions.stateCounts(space.id),
      ]);
      return {
        items: await toPromotions(space, page.items),
        nextCursor: page.nextCursor,
        counts: totals.counts,
        totalClicks: totals.totalClicks,
      };
    },

    /** GET /api/studio/promotions/post/:postId: the post (studio view) and its promotion. */
    async composer(owner: OwnerContext, postId: string): Promise<PromotionComposer> {
      const [post, promotion] = await Promise.all([
        posts.studioDetail(owner, postId),
        repos.promotions.findByPostId(owner.space.id, postId),
      ]);
      return { post, promotion: promotion ? await toPromotion(owner.space, promotion) : null };
    },

    /**
     * POST /api/studio/promotions: one per post. A new draft row gets AI drafts right away
     * (created = true, 201); an existing promotion is returned unchanged (created = false, 200).
     */
    async create(
      owner: OwnerContext,
      postId: string,
    ): Promise<{ promotion: Promotion; created: boolean }> {
      const post = await promotablePost(owner.space, postId);
      const { row, created } = await repos.promotions.insertDraft({
        spaceId: owner.space.id,
        postId: post.id,
        createdByUserId: owner.userId,
      });
      if (!created) return { promotion: await toPromotion(owner.space, row), created };
      log.info({ promotionId: row.id, postId: post.id }, 'promotion created');
      const withDrafts = await generateDrafts(owner, row, post, [...PROMOTION_PLATFORMS]);
      return { promotion: await toPromotion(owner.space, withDrafts), created };
    },

    /** PATCH /api/studio/promotions/:id: save, publish, unpublish, regenerate. */
    async act(owner: OwnerContext, id: string, action: PromotionAction): Promise<Promotion> {
      const { space } = owner;
      const promotion = await repos.promotions.findById(space.id, id);
      if (!promotion) throw notFound('Promotion');
      let updated: PromotionRow;
      switch (action.action) {
        case 'save': {
          const saved: PromotionDrafts = {};
          for (const platform of PROMOTION_PLATFORMS) {
            const draft = action.drafts[platform];
            if (draft) saved[platform] = cleanDraft(platform, draft);
          }
          const savedPlatforms = Object.keys(saved) as PromotionPlatform[];
          const row = await repos.promotions.update(space.id, promotion.id, {
            drafts: { ...(promotion.drafts ?? {}), ...saved },
            draftErrors: (promotion.draftErrors ?? []).filter(
              (platform) => !savedPlatforms.includes(platform),
            ),
            ...(action.headline !== undefined
              ? { headline: action.headline?.trim() ? action.headline.trim() : null }
              : {}),
          });
          if (!row) throw notFound('Promotion');
          updated = row;
          break;
        }
        case 'publish':
          updated = await publish(owner, promotion);
          log.info({ promotionId: id, slug: updated.showcaseSlug }, 'promotion published');
          break;
        case 'unpublish':
          updated = await unpublish(owner, promotion);
          break;
        case 'regenerate': {
          const post = await promotablePost(space, promotion.postId);
          await limits.assertPromoteDraftsAllowed(space.id);
          const platforms = action.platforms?.length
            ? unique(action.platforms)
            : [...PROMOTION_PLATFORMS];
          updated = await generateDrafts(owner, promotion, post, platforms);
          break;
        }
      }
      return toPromotion(space, updated);
    },

    /**
     * GET /api/spaces/:handle/showcase/:slug (public). A promotion that is no longer live (or
     * whose post was hidden or deleted) answers live=false, post=null, team=[] so the page can
     * show "No longer featured". Only the accepted team is public.
     */
    async showcase(handle: string, slug: string): Promise<Showcase> {
      const space = await access.spaceByHandle(handle);
      const promotion = await repos.promotions.findBySlug(space.id, slug);
      if (!promotion?.showcaseSlug) throw notFound('Showcase');
      const post = await repos.posts.findInSpace(space.id, promotion.postId);
      const live =
        promotionState(promotion) === 'live' &&
        post !== null &&
        post.deletedAt === null &&
        post.hiddenAt === null;
      const base = {
        space: { handle: space.handle, displayName: space.displayName, avatarUrl: space.avatarUrl },
        promotion: {
          showcaseSlug: promotion.showcaseSlug,
          headline: promotion.headline,
          publishedAt: toIsoOrNull(promotion.publishedAt),
          live,
        },
      };
      if (!live || !post) return { ...base, post: null, team: [] };

      const [community, authors, team] = await Promise.all([
        repos.communities.findById(space.id, post.communityId),
        repos.memberships.refs(post.authorMembershipId ? [post.authorMembershipId] : []),
        repos.teams.listByPost(post.id, { statuses: ['accepted'] }),
      ]);
      return {
        ...base,
        post: {
          id: post.id,
          type: post.type,
          title: post.title,
          body: post.body,
          status: post.status,
          links: post.links ?? [],
          rolesNeeded: post.rolesNeeded,
          openRoles: openRoles(
            post.rolesNeeded,
            team.map((member) => member.role),
          ),
          useCount: post.useCount,
          buildCount: post.buildCount,
          community: community
            ? {
                slug: community.slug,
                name: community.name,
                tint: community.tint,
                icon: community.icon,
              }
            : { slug: '', name: 'Community', tint: 'white', icon: 'users' },
          author: memberRef(
            post.authorMembershipId ? authors.get(post.authorMembershipId) : undefined,
          ),
        },
        team: team.map(teamMember),
      };
    },
  };
}

export type PromotionsService = ReturnType<typeof createPromotionsService>;
