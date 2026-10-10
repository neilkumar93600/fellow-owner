import type {
  createPitchSchema,
  InboxDetail,
  InboxItem,
  InboxPage,
  InboxQuery,
  Pitch,
  StudioPitchAction,
} from '@fellow-owners/shared';
import type { z } from 'zod';
import type { Analyzer, BackgroundRunner } from '../ai/types.js';
import type { Db } from '../db/client.js';
import type { InboundRow } from '../db/schema/inbound.js';
import { toIso, toIsoOrNull } from '../lib/dates.js';
import { conflict, forbidden, notFound } from '../lib/errors.js';
import { contentHash } from '../lib/hash.js';
import type { Logger } from '../lib/logger.js';
import { clampLimit } from '../lib/pagination.js';
import { aiInsight, excerpt, memberRef, pitchView } from '../lib/present.js';
import type { Repos } from '../repositories/index.js';
import type { InboxRow } from '../repositories/pitches.repo.js';
import type { AccessService, OwnerContext } from './access.service.js';
import type { LimitsService } from './limits.service.js';
import type { NotificationsService } from './notifications.service.js';

export type CreatePitchBody = z.output<typeof createPitchSchema>;

export interface PitchesServiceDeps {
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

export function inboxItem(row: InboxRow, tasteVersion: number): InboxItem {
  return {
    id: row.id,
    type: row.type,
    subject: row.subject,
    excerpt: excerpt(row.body),
    status: row.status,
    isFiltered: row.isFiltered,
    sender: memberRef({
      membershipId: row.senderMembershipId,
      name: row.senderName,
      headline: row.senderHeadline,
      image: row.senderImage,
    }),
    createdAt: toIso(row.createdAt),
    ai: aiInsight(row, tasteVersion),
    recategorized:
      row.analysisStatus === 'done' && row.aiCategory !== null && row.aiCategory !== row.type,
  };
}

/**
 * Pitches (UI word for `inbound`): fans send them (5 a day per space; the first pitch creates a
 * membership with no communities, 05 §5), withdraw them while `new`, and read the creator's reply
 * in My space. The owner works them in the studio inbox (tabs, Fit/Newest sort, actions).
 */
export function createPitchesService(deps: PitchesServiceDeps) {
  const { db, repos, access, limits } = deps;
  const log = deps.logger.child({ module: 'pitches' });

  function analyzeLater(id: string): void {
    deps.background.run(`analyze:inbound:${id}`, () =>
      deps.analyzer.analyzeItem({ kind: 'inbound', id }),
    );
  }

  async function loadDetail(owner: OwnerContext, id: string): Promise<InboxDetail> {
    const { space } = owner;
    const row = await repos.pitches.findDetail(space.id, id);
    if (!row) throw notFound('Pitch');
    const [sender, communities, counts, feedback] = await Promise.all([
      repos.memberships.findById(space.id, row.senderMembershipId),
      repos.memberships.communitiesFor([row.senderMembershipId]),
      repos.memberships.senderCounts(space.id, row.senderMembershipId),
      repos.feedback.find({
        spaceId: space.id,
        refType: 'inbound',
        refId: row.id,
        userId: owner.userId,
      }),
    ]);
    return {
      ...inboxItem(row, space.tasteVersion),
      body: row.body,
      links: row.links ?? [],
      creatorReply: row.creatorReply,
      repliedAt: toIsoOrNull(row.repliedAt),
      senderProfile: {
        skills: sender?.skills ?? [],
        links: sender?.links ?? [],
        joinedAt: toIso(sender?.joinedAt ?? row.createdAt),
        communities: (communities.get(row.senderMembershipId) ?? []).map(
          ({ slug, name, tint }) => ({ slug, name, tint }),
        ),
        pitchCount: counts.pitchCount,
        postCount: counts.postCount,
      },
      feedback,
    };
  }

  /** null from a status/reply update: 404 when the pitch is gone, 409 when it was withdrawn. */
  async function explainMissedUpdate(owner: OwnerContext, id: string): Promise<never> {
    const current = await repos.pitches.findById(owner.space.id, id);
    if (!current) throw notFound('Pitch');
    throw conflict('This pitch was withdrawn by the sender');
  }

  return {
    /** GET /api/studio/inbox/:id: the only path that stamps read_at (F31); PATCH does not. */
    async inboxDetail(owner: OwnerContext, id: string): Promise<InboxDetail> {
      await repos.pitches.markRead(owner.space.id, id);
      return loadDetail(owner, id);
    },

    /**
     * POST /api/spaces/:handle/pitches (signed in). Creates a membership without communities when
     * the sender has none; 5 a day per space (429). Analysis runs in the background.
     */
    async create(handle: string, userId: string, input: CreatePitchBody): Promise<Pitch> {
      const space = await access.spaceByHandle(handle);
      if (space.ownerUserId === userId) throw forbidden("You can't send a pitch to your own space");
      const pitch: InboundRow = await db.transaction(async (tx) => {
        await limits.lockWrites(space.id, userId, tx);
        const { row: membership, created } = await repos.memberships.insertOrGet(
          { spaceId: space.id, userId, role: 'member' },
          tx,
        );
        if (membership.removedAt) throw forbidden('You were removed from this space');
        if (!created) await limits.assertDailyCap('pitches', space, membership.id, tx);
        return repos.pitches.insert(
          {
            spaceId: space.id,
            senderMembershipId: membership.id,
            type: input.type,
            subject: input.subject,
            body: input.body,
            links: input.links,
            contentHash: contentHash(input.subject, input.body),
          },
          tx,
        );
      });
      log.info({ spaceId: space.id, pitchId: pitch.id, type: pitch.type }, 'pitch sent');
      analyzeLater(pitch.id);
      await deps.notifications.notify({
        userId: space.ownerUserId,
        spaceId: space.id,
        kind: 'pitch_received',
        payload: {
          inboundId: pitch.id,
          subject: pitch.subject,
          pitchType: pitch.type,
          actorName: (await deps.notifications.member(pitch.senderMembershipId)).name,
        },
      });
      return pitchView(pitch);
    },

    /** PATCH /api/pitches/:id { status: 'withdrawn' }: the sender, only while `new` (409). */
    async withdraw(pitchId: string, userId: string): Promise<Pitch> {
      const pitch = await repos.pitches.findByIdAnySpace(pitchId);
      if (!pitch) throw notFound('Pitch');
      const membership = await repos.memberships.findByUser(pitch.spaceId, userId);
      if (!membership || membership.id !== pitch.senderMembershipId) {
        throw forbidden('Only the sender can withdraw this pitch');
      }
      if (pitch.status !== 'new') throw conflict('Only new pitches can be withdrawn');
      const updated = await repos.pitches.withdraw(pitch.id, membership.id);
      if (!updated) throw conflict('Only new pitches can be withdrawn');
      return pitchView(updated);
    },

    /** GET /api/studio/inbox: one tab, Fit or Newest, optional status and search, tab counts. */
    async inbox(owner: OwnerContext, query: InboxQuery): Promise<InboxPage> {
      const { space } = owner;
      const snoozed = query.hideSnoozed
        ? [...(await repos.snoozes.activeIds(space.id, 'pitch'))]
        : undefined;
      const [page, counts] = await Promise.all([
        repos.pitches.listInbox(space.id, {
          tab: query.tab,
          sort: query.sort,
          status: query.status,
          q: query.q,
          cursor: query.cursor,
          limit: clampLimit(query.limit),
          excludeIds: snoozed,
        }),
        repos.pitches.tabCounts(space.id, { status: query.status, q: query.q }),
      ]);
      return {
        items: page.items.map((row) => inboxItem(row, space.tasteVersion)),
        nextCursor: page.nextCursor,
        counts,
      };
    },

    /** PATCH /api/studio/inbox/:id: set_status, restore, reply, rescore. */
    async act(owner: OwnerContext, id: string, action: StudioPitchAction): Promise<InboxDetail> {
      const { space } = owner;
      switch (action.action) {
        case 'set_status': {
          const row = await repos.pitches.setStatus(space.id, id, action.status);
          if (!row) await explainMissedUpdate(owner, id);
          break;
        }
        case 'restore': {
          const row = await repos.pitches.restore(space.id, id);
          if (!row) throw notFound('Pitch');
          break;
        }
        case 'reply': {
          const row = await repos.pitches.reply(space.id, id, action.reply.trim());
          if (!row) await explainMissedUpdate(owner, id);
          const sender = await deps.notifications.member(row?.senderMembershipId ?? null);
          if (row && sender.userId && sender.userId !== owner.userId) {
            await deps.notifications.notify({
              userId: sender.userId,
              spaceId: space.id,
              kind: 'reply_received',
              payload: { inboundId: row.id, subject: row.subject },
            });
          }
          break;
        }
        case 'rescore': {
          const row = await repos.pitches.resetAnalysis(space.id, id);
          if (!row) throw notFound('Pitch');
          analyzeLater(row.id);
          break;
        }
      }
      return loadDetail(owner, id);
    },
  };
}

export type PitchesService = ReturnType<typeof createPitchesService>;
