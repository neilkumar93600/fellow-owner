import type {
  ChallengeResponseSummary,
  ChallengeShortlistItem,
  ChallengeSummary,
  challengeEntrySchema,
  createChallengeSchema,
  IdeaItem,
  PostDetail,
} from '@fellow-owners/shared';
import type { z } from 'zod';
import type { Analyzer, BackgroundRunner } from '../ai/types.js';
import type { Db } from '../db/client.js';
import type { PostRow } from '../db/schema/posts.js';
import type { SpaceRow } from '../db/schema/spaces.js';
import { DAY_MS, toIso } from '../lib/dates.js';
import { AppError, conflict, forbidden, notFound } from '../lib/errors.js';
import { contentHash } from '../lib/hash.js';
import type { Logger } from '../lib/logger.js';
import { displayName } from '../lib/present.js';
import { signalScore } from '../lib/ranking.js';
import type { AskWithCounts } from '../repositories/asks.repo.js';
import type { Repos } from '../repositories/index.js';
import type { MemberContext, OwnerContext } from './access.service.js';
import type { LimitsService } from './limits.service.js';
import type { NotificationsService } from './notifications.service.js';
import type { PostsService } from './posts.service.js';

export type CreateChallengeBody = z.output<typeof createChallengeSchema>;
export type ChallengeEntryBody = z.output<typeof challengeEntrySchema>;

export interface ChallengesServiceDeps {
  db: Db;
  repos: Repos;
  limits: LimitsService;
  posts: PostsService;
  analyzer: Analyzer;
  background: BackgroundRunner;
  notifications: NotificationsService;
  logger: Logger;
}

/** POST .../entries response: the new post plus the challenge it entered. */
export type ChallengeEntryResponse = PostDetail & {
  challenge: { id: string; title: string; status: 'open' };
};

/** How long a closed challenge stays on the fan list after its due date. */
const RECENTLY_CLOSED_DAYS = 30;
const SHORTLIST_MAX = 3;
const FIT_WEIGHT = 0.7;
const SIGNAL_WEIGHT = 0.3;

/** 422 for a well-formed request that breaks a rule (past due date, winner not an entry). */
function unprocessable(path: string, message: string): AppError {
  return new AppError('validation_error', 422, message, [
    { location: 'body', path: [path], message, code: 'custom' },
  ]);
}

function storedSummary(row: AskWithCounts): ChallengeResponseSummary | null {
  // ponytail: only this service writes response_summary, so the cast is trusted.
  return (row.ask.responseSummary ?? null) as ChallengeResponseSummary | null;
}

function summarize(row: AskWithCounts): ChallengeSummary {
  const { ask } = row;
  const stored = storedSummary(row);
  const closed = ask.status === 'closed';
  return {
    id: ask.id,
    title: ask.title,
    body: ask.body,
    communityId: ask.communityId,
    communityName: row.communityName,
    // due_at is nullable on the P1 table; every challenge made here has one.
    dueAt: toIso(ask.dueAt ?? ask.createdAt),
    status: ask.status,
    entryCount: row.entryCount,
    shortlist: closed ? (stored?.shortlist ?? []) : null,
    winnerPostId: stored?.winnerPostId ?? null,
    createdAt: toIso(ask.createdAt),
  };
}

function isPastDue(dueAt: Date | null, now: Date): boolean {
  return dueAt !== null && dueAt.getTime() <= now.getTime();
}

/** Open but past its due date: closed lazily the next time anyone reads it. */
function isOverdue(row: AskWithCounts): boolean {
  return row.ask.status === 'open' && isPastDue(row.ask.dueAt, new Date());
}

const fansSaid = (n: number) => `${n} ${n === 1 ? 'fan' : 'fans'} said they'd use this`;

/** AI fit as 0..1, or 0 while the entry has no score. */
function fitOf(row: PostRow): number {
  if (row.analysisStatus !== 'done' || row.aiFitScore === null) return 0;
  return Math.min(1, Math.max(0, row.aiFitScore / 100));
}

/**
 * The top entries: `fit * 0.7 + normalised signals * 0.3`, spam left out, ties to the earlier
 * entry. The reason is the entry's AI reason, else its "I'd use this" count. The AI reason is
 * the creator's private note: fans get fanSafeShortlists instead.
 */
function rankShortlist(
  rows: PostRow[],
  authorName: (membershipId: string | null) => string,
): ChallengeShortlistItem[] {
  return rows
    .filter((row) => row.aiIsSpam !== true)
    .map((row) => ({ row, score: fitOf(row) * FIT_WEIGHT + signalScore(row) * SIGNAL_WEIGHT }))
    .sort((a, b) => b.score - a.score || a.row.createdAt.getTime() - b.row.createdAt.getTime())
    .slice(0, SHORTLIST_MAX)
    .map(({ row }) => ({
      postId: row.id,
      title: row.title,
      authorName: authorName(row.authorMembershipId),
      reason: (row.analysisStatus === 'done' && row.aiFitReason?.trim()) || fansSaid(row.useCount),
    }));
}

/**
 * Creator challenges (F2) on the P1 `asks` table. Entries are ordinary `idea` posts with
 * `ask_id` set, so analysis, feeds and the ideas screen treat them like any other post.
 */
export function createChallengesService(deps: ChallengesServiceDeps) {
  const { db, repos, limits, notifications } = deps;
  const log = deps.logger.child({ module: 'challenges' });

  /** Ranks the visible entries, stores the top 3 and tells each shortlisted author. No-op once closed. */
  async function closeAsk(space: SpaceRow, id: string): Promise<void> {
    const shortlist = await db.transaction(async (tx) => {
      const ask = await repos.asks.lock(space.id, id, 'update', tx);
      if (!ask) throw notFound('Challenge');
      if (ask.status === 'closed') return null;
      const entries = await repos.asks.entries(ask.id, { visibleOnly: true }, tx);
      const authors = await repos.memberships.refs(
        entries.flatMap((row) => (row.authorMembershipId ? [row.authorMembershipId] : [])),
        tx,
      );
      const items = rankShortlist(entries, (membershipId) =>
        displayName(membershipId ? authors.get(membershipId)?.name : null),
      );
      await repos.asks.close(ask.id, { shortlist: items, winnerPostId: null }, tx);
      return items.map((item) => ({
        item,
        membershipId: entries.find((row) => row.id === item.postId)?.authorMembershipId ?? null,
      }));
    });
    if (!shortlist) return;
    log.info({ askId: id, spaceId: space.id, shortlisted: shortlist.length }, 'challenge closed');
    deps.background.run(`notify:challenge_shortlisted:${id}`, async () => {
      for (const { item, membershipId } of shortlist) {
        const author = await notifications.member(membershipId);
        if (!author.userId || author.userId === space.ownerUserId) continue;
        await notifications.notify({
          userId: author.userId,
          spaceId: space.id,
          kind: 'challenge_shortlisted',
          payload: { askId: id, postId: item.postId, title: item.title },
        });
      }
    });
  }

  /** One challenge; an overdue one is closed first, so it never reads as open past its date. */
  async function load(space: SpaceRow, id: string): Promise<AskWithCounts> {
    const row = await repos.asks.get(space.id, id);
    if (!row) throw notFound('Challenge');
    if (!isOverdue(row)) return row;
    await closeAsk(space, id);
    return (await repos.asks.get(space.id, id)) ?? row;
  }

  /** repos.asks.list, with any overdue challenge closed first. */
  async function listClosingOverdue(
    space: SpaceRow,
    filter?: { openOrDueSince?: Date; liveCommunityOnly?: boolean },
  ): Promise<AskWithCounts[]> {
    const rows = await repos.asks.list(space.id, filter);
    const overdue = rows.filter(isOverdue);
    if (overdue.length === 0) return rows;
    for (const row of overdue) {
      // One failed close must not break the list: that challenge just reads as open until the next read.
      try {
        await closeAsk(space, row.ask.id);
      } catch (err) {
        log.warn({ err, askId: row.ask.id, spaceId: space.id }, 'overdue challenge close failed');
      }
    }
    return repos.asks.list(space.id, filter);
  }

  /**
   * Fans never see the creator's private AI reasoning: each shortlisted entry's reason becomes
   * its "I'd use this" count, or "Picked by {creator}" when nobody has signalled it. Entries
   * hidden or deleted since the close drop out, and a hidden or deleted winner reads as none.
   */
  async function fanSafeShortlists(
    space: SpaceRow,
    items: ChallengeSummary[],
  ): Promise<ChallengeSummary[]> {
    const ids = items.flatMap((item) => [
      ...(item.shortlist?.map((s) => s.postId) ?? []),
      ...(item.winnerPostId ? [item.winnerPostId] : []),
    ]);
    const useCounts = new Map(
      (await repos.posts.findManyByIds(space.id, ids))
        .filter((row) => !row.deletedAt && !row.hiddenAt)
        .map((row) => [row.id, row.useCount]),
    );
    return items.map((item) => ({
      ...item,
      winnerPostId:
        item.winnerPostId && useCounts.has(item.winnerPostId) ? item.winnerPostId : null,
      shortlist:
        item.shortlist?.flatMap((s) => {
          const n = useCounts.get(s.postId);
          if (n === undefined) return [];
          return [{ ...s, reason: n > 0 ? fansSaid(n) : `Picked by ${space.displayName}` }];
        }) ?? null,
    }));
  }

  return {
    /** GET /api/studio/challenges: every challenge, open first, newest first. */
    async list(owner: OwnerContext): Promise<{ items: ChallengeSummary[] }> {
      return { items: (await listClosingOverdue(owner.space)).map(summarize) };
    },

    /** GET /api/studio/challenges/:id: the summary plus every entry as an IdeaItem. */
    async detail(
      owner: OwnerContext,
      id: string,
    ): Promise<ChallengeSummary & { entries: IdeaItem[] }> {
      const row = await load(owner.space, id);
      const entries = await repos.asks.entries(id, { visibleOnly: false });
      return { ...summarize(row), entries: await deps.posts.buildIdeaItems(owner, entries) };
    },

    /**
     * POST /api/studio/challenges (201). The due date must be in the future; the target
     * community (null = all) must be live. Its members hear about it in the background.
     */
    async create(owner: OwnerContext, input: CreateChallengeBody): Promise<ChallengeSummary> {
      const dueAt = new Date(input.dueAt);
      if (isPastDue(dueAt, new Date())) {
        throw unprocessable('dueAt', 'Pick a due date in the future');
      }
      let communityName: string | null = null;
      if (input.communityId) {
        const community = await repos.communities.findById(owner.space.id, input.communityId);
        if (!community || community.archivedAt) throw notFound('Community');
        communityName = community.name;
      }
      const ask = await repos.asks.insert({
        spaceId: owner.space.id,
        communityId: input.communityId,
        title: input.title,
        body: input.body?.trim() ? input.body.trim() : null,
        dueAt,
        status: 'open',
      });
      log.info({ askId: ask.id, spaceId: owner.space.id }, 'challenge created');

      const { space } = owner;
      deps.background.run(`notify:ask_posted:${ask.id}`, async () => {
        const userIds = await repos.asks.audienceUserIds(
          space.id,
          ask.communityId,
          space.ownerUserId,
        );
        // ponytail: one insert per fan, in order; a bulk insert if audiences reach the 10Ks.
        for (const userId of userIds) {
          await notifications.notify({
            userId,
            spaceId: space.id,
            kind: 'ask_posted',
            payload: { askId: ask.id, title: ask.title, communityName },
          });
        }
      });
      return summarize({ ask, communityName, entryCount: 0 });
    },

    /**
     * POST /api/studio/challenges/:id/close. Ranks the visible entries, stores the top 3 with
     * reasons in response_summary and tells each shortlisted author. Closing again is a no-op.
     */
    async close(owner: OwnerContext, id: string): Promise<ChallengeSummary> {
      await closeAsk(owner.space, id);
      return summarize(await load(owner.space, id));
    },

    /** POST /api/studio/challenges/:id/winner: a closed challenge, and one of its visible entries. */
    async setWinner(owner: OwnerContext, id: string, postId: string): Promise<ChallengeSummary> {
      const row = await load(owner.space, id);
      if (row.ask.status !== 'closed') {
        throw conflict('Close the challenge before you pick a winner');
      }
      const post = await repos.posts.findInSpace(owner.space.id, postId);
      if (!post || post.deletedAt || post.hiddenAt || post.askId !== id) {
        throw unprocessable('postId', 'The winner has to be an entry to this challenge');
      }
      await repos.asks.setWinner(owner.space.id, id, postId);
      return summarize(await load(owner.space, id));
    },

    /**
     * GET /api/spaces/:handle/challenges: open ones plus those closed in the last 30 days, with
     * fan-safe shortlist reasons.
     */
    async listForFans(ctx: MemberContext): Promise<{ items: ChallengeSummary[] }> {
      const since = new Date(Date.now() - RECENTLY_CLOSED_DAYS * DAY_MS);
      const rows = await listClosingOverdue(ctx.space, {
        openOrDueSince: since,
        liveCommunityOnly: true,
      });
      return { items: await fanSafeShortlists(ctx.space, rows.map(summarize)) };
    },

    /**
     * POST /api/spaces/:handle/challenges/:id/entries (201): an `idea` post linked to the ask, in
     * the challenge's community (or the fan's first joined one for an all-communities challenge).
     * 409 when closed, past due or its community is archived (the closed check is repeated under a
     * share lock so a close cannot slip in between). 403 when the fan has not joined that
     * community. Same daily cap and analysis as any post.
     */
    async enter(
      ctx: MemberContext,
      id: string,
      input: ChallengeEntryBody,
    ): Promise<ChallengeEntryResponse> {
      const { space, membership } = ctx;
      const row = await load(space, id);
      const closedToEntries = () => conflict('This challenge is closed to new entries');
      if (row.ask.status === 'closed') throw closedToEntries();
      if (row.ask.communityId) {
        const target = await repos.communities.findById(space.id, row.ask.communityId);
        if (!target || target.archivedAt) throw closedToEntries();
      }
      const joined = await repos.memberships.communityIds(membership.id);
      const targetIds = row.ask.communityId
        ? joined.filter((communityId) => communityId === row.ask.communityId)
        : joined;
      const byId = new Map(
        (await repos.communities.findByIds(space.id, targetIds)).map((c) => [c.id, c]),
      );
      const community = targetIds.map((cid) => byId.get(cid)).find((c) => c && !c.archivedAt);
      if (!community) {
        throw forbidden(
          row.communityName
            ? `Join ${row.communityName} to enter this challenge`
            : 'Join a community to enter this challenge',
        );
      }

      const title = input.title;
      const body = input.body;
      const { post, ask } = await db.transaction(async (tx) => {
        const locked = await repos.asks.lock(space.id, id, 'share', tx);
        if (!locked) throw notFound('Challenge');
        if (locked.status === 'closed' || isPastDue(locked.dueAt, new Date())) {
          throw closedToEntries();
        }
        await limits.lockWrites(space.id, ctx.userId, tx);
        await limits.assertDailyCap('posts', space, membership.id, tx);
        const inserted = await repos.posts.insert(
          {
            spaceId: space.id,
            communityId: community.id,
            authorMembershipId: membership.id,
            askId: locked.id,
            type: 'idea',
            title,
            body,
            rolesNeeded: [],
            links: input.links,
            contentHash: contentHash(title, body),
          },
          tx,
        );
        return { post: inserted, ask: locked };
      });
      log.info({ postId: post.id, askId: ask.id, spaceId: space.id }, 'challenge entry created');
      deps.background.run(`analyze:post:${post.id}`, () =>
        deps.analyzer.analyzeItem({ kind: 'post', id: post.id }),
      );
      if (ctx.userId !== space.ownerUserId) {
        await notifications.notify({
          userId: space.ownerUserId,
          spaceId: space.id,
          kind: 'idea_posted',
          payload: {
            postId: post.id,
            title: post.title,
            postType: post.type,
            actorName: (await notifications.member(membership.id)).name,
            communityName: community.name,
          },
        });
      }
      const detail = await deps.posts.buildDetail(space, post, membership);
      return { ...detail, challenge: { id: ask.id, title: ask.title, status: 'open' } };
    },
  };
}

export type ChallengesService = ReturnType<typeof createChallengesService>;
