import {
  type AnswerQuestionGroupInput,
  LIMITS,
  type PublicCommunity,
  type QuestionAsker,
  type QuestionGroup,
  type QuestionGroupsPage,
  type RedraftResult,
} from '@fellow-owners/shared';
import { isAiUnavailable, type QuestionGroupInput } from '../ai/types.js';
import type { CoreDeps } from '../container.js';
import type { CommunityRow } from '../db/schema/communities.js';
import type { QuestionGroupRow } from '../db/schema/question-groups.js';
import type { SpaceRow } from '../db/schema/spaces.js';
import { toIso, toIsoOrNull, utcDayString } from '../lib/dates.js';
import {
  aiUnavailable,
  badRequest,
  conflict,
  dailyCapReached,
  notFound,
  validationError,
} from '../lib/errors.js';
import { contentHash } from '../lib/hash.js';
import { excerpt, memberRef, unique } from '../lib/present.js';
import type { GroupMemberRow } from '../repositories/question-groups.repo.js';
import { createNotificationsService, type NotificationsService } from './notifications.service.js';

/**
 * `notifications` is the container's (the bag carries every base service at runtime). It is
 * optional only because container.ts types the bag as a bare generic; the fallback is an
 * equivalent stateless instance over the same repos and pub/sub.
 */
export type QuestionGroupsServiceDeps = Pick<
  CoreDeps,
  'db' | 'repos' | 'ai' | 'logger' | 'background' | 'analyzer' | 'pubsub'
> & { notifications?: NotificationsService };

/** The studio shows at most this many askers per group ("See the N latest"). */
const ASKERS_SHOWN = 50;
const A = LIMITS.answerOnce;

/** The first sentence of a pitch body, cut to LIMITS.answerOnce.quoteMax (asker quotes). */
export function askerQuote(body: string): string {
  const clean = body.replace(/\s+/g, ' ').trim();
  const first = clean.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? clean;
  return excerpt(first, A.quoteMax);
}

/** AI input for naming or redrafting a group from its askers' words. */
export function namingInput(
  space: Pick<SpaceRow, 'displayName' | 'tasteProfile'>,
  bodies: string[],
  previousDraft?: string | null,
): QuestionGroupInput {
  const voice = space.tasteProfile.voice ?? [];
  return {
    creatorName: space.displayName,
    voice: voice.length > 0 ? voice.join('\n\n') : null,
    quotes: bodies.slice(0, 20).map(askerQuote),
    ...(previousDraft ? { previousDraft } : {}),
  };
}

const redraftsLeft = (row: QuestionGroupRow, today: string) =>
  Math.max(0, A.redraftsPerDay - (row.redraftsDate === today ? row.redraftsUsed : 0));

/** A pinned post's title: the question, kept within the post title limits. */
function postTitle(question: string): string {
  const title = question.trim().slice(0, LIMITS.post.title.max);
  return title.length >= LIMITS.post.title.min ? title : 'An answer for everyone who asked';
}

type CommunityPick = Pick<PublicCommunity, 'id' | 'slug' | 'name' | 'tint' | 'icon'>;

/**
 * F32 Answer Once: the owner's question groups (grouped by workers/group-questions.ts). Every
 * query is scoped by the owner's space, so another space's ids are 404.
 */
export function createQuestionGroupsService(deps: QuestionGroupsServiceDeps) {
  const { db, repos, ai } = deps;
  const log = deps.logger.child({ module: 'question-groups' });
  const notifications = deps.notifications ?? createNotificationsService(deps);

  /** QuestionGroups for rows of one space, batch-loaded (askers, their communities). */
  async function present(spaceId: string, rows: QuestionGroupRow[]): Promise<QuestionGroup[]> {
    if (rows.length === 0) return [];
    const members = await repos.questionGroups.members(rows.map((row) => row.id));
    const senders = unique(members.map((member) => member.senderMembershipId));
    const [refs, badges] = await Promise.all([
      repos.memberships.refs(senders),
      repos.memberships.communitiesFor(senders),
    ]);
    const communityIds = unique([
      ...[...badges.values()].flatMap((list) => list.map((badge) => badge.id)),
      ...rows.flatMap((row) => row.pinnedCommunityIds),
    ]);
    const communities = new Map<string, CommunityRow>(
      (await repos.communities.findByIds(spaceId, communityIds)).map((row) => [row.id, row]),
    );
    const byGroup = new Map<string, GroupMemberRow[]>();
    for (const member of members) {
      const list = byGroup.get(member.questionGroupId) ?? [];
      list.push(member);
      byGroup.set(member.questionGroupId, list);
    }
    const today = utcDayString();

    return rows.map((row) => {
      const groupMembers = byGroup.get(row.id) ?? [];
      const picks = new Map<string, CommunityPick>();
      const askers: QuestionAsker[] = groupMembers.slice(0, ASKERS_SHOWN).map((member) => {
        const badge = badges.get(member.senderMembershipId)?.[0];
        const community = badge ? communities.get(badge.id) : undefined;
        if (community) {
          picks.set(community.id, {
            id: community.id,
            slug: community.slug,
            name: community.name,
            tint: community.tint,
            icon: community.icon,
          });
        }
        return {
          pitchId: member.id,
          member: memberRef(refs.get(member.senderMembershipId)),
          community: community
            ? { slug: community.slug, name: community.name, tint: community.tint }
            : { slug: '', name: 'Fan mail', tint: 'white' },
          quote: askerQuote(member.body),
          createdAt: toIso(member.createdAt),
        };
      });
      return {
        id: row.id,
        question: row.question,
        askedCount: row.askedCount,
        askers,
        communities: [...picks.values()],
        draft: row.draft,
        status: row.status,
        firstAskedAt: toIso(row.firstAskedAt),
        answeredAt: toIsoOrNull(row.answeredAt),
        answer: row.answer,
        pinnedIn: row.pinnedCommunityIds.flatMap((id) => {
          const community = communities.get(id);
          return community ? [community.name] : [];
        }),
        postId: row.postId,
        redraftsLeft: redraftsLeft(row, today),
      };
    });
  }

  async function presentOne(spaceId: string, row: QuestionGroupRow): Promise<QuestionGroup> {
    const [group] = await present(spaceId, [row]);
    if (!group) throw notFound('Question group');
    return group;
  }

  /** 404 when the group is not in the space, else 409 (it exists but is no longer open). */
  async function explainNotOpen(spaceId: string, id: string): Promise<never> {
    const row = await repos.questionGroups.findById(spaceId, id);
    if (!row) throw notFound('Question group');
    throw conflict(`This group is already ${row.status}`);
  }

  function analyzeLater(postId: string): void {
    deps.background.run(`analyze:post:${postId}`, () =>
      deps.analyzer.analyzeItem({ kind: 'post', id: postId }),
    );
  }

  return {
    present,

    /** Open groups first (last_asked_at desc), then answered; dismissed hidden. */
    async list(spaceId: string): Promise<QuestionGroupsPage> {
      const rows = await repos.questionGroups.listVisible(spaceId, A.minGroupSize);
      return { items: await present(spaceId, rows) };
    },

    /**
     * One transaction: marks the group answered (the 409 guard), replies to every asker still
     * waiting (status replied, creator_reply, replied_at), and posts the answer, pinned, in each
     * chosen community. Notifications go out after commit.
     */
    async answer(
      spaceId: string,
      userId: string,
      groupId: string,
      input: AnswerQuestionGroupInput,
    ): Promise<QuestionGroup> {
      const answer = input.answer.trim();
      const pinIds = unique(input.pinCommunityIds ?? []);
      if (!input.replyAll && pinIds.length === 0) {
        throw badRequest('Reply to everyone who asked, or pin the answer in a community');
      }
      if (pinIds.length > 0 && answer.length < LIMITS.post.body.min) {
        throw validationError(
          [
            {
              location: 'body',
              path: ['answer'],
              message: `A pinned answer needs at least ${LIMITS.post.body.min} characters`,
              code: 'too_small',
            },
          ],
          'The answer is too short to pin',
        );
      }
      const pins = await repos.communities.findByIds(spaceId, pinIds);
      if (pins.length !== pinIds.length || pins.some((community) => community.archivedAt)) {
        throw notFound('Community');
      }
      // Keep the order the creator chose: the first one is question_groups.post_id.
      const pinned = pinIds.flatMap((id) => pins.find((community) => community.id === id) ?? []);

      const result = await db.transaction(async (tx) => {
        const claimed = await repos.questionGroups.claimAnswer(
          spaceId,
          groupId,
          { answer, pinnedCommunityIds: pinIds, now: new Date() },
          tx,
        );
        if (!claimed) return null;
        const replied: GroupMemberRow[] = [];
        if (input.replyAll) {
          for (const member of await repos.questionGroups.unreplied(groupId, tx)) {
            if (await repos.pitches.reply(spaceId, member.id, answer, tx)) replied.push(member);
          }
        }
        const postIds: string[] = [];
        if (pinned.length > 0) {
          const author = await repos.memberships.findOwner(spaceId, tx);
          const title = postTitle(claimed.question);
          for (const community of pinned) {
            const post = await repos.posts.insert(
              {
                spaceId,
                communityId: community.id,
                authorMembershipId: author?.id ?? null,
                questionGroupId: groupId,
                type: 'discussion',
                title,
                body: answer,
                rolesNeeded: [],
                contentHash: contentHash(title, answer),
              },
              tx,
            );
            postIds.push(post.id);
          }
        }
        const row = postIds[0]
          ? await repos.questionGroups.setPost(groupId, postIds[0], tx)
          : claimed;
        return { row: row ?? claimed, replied, postIds };
      });
      if (!result) return explainNotOpen(spaceId, groupId);

      log.info(
        { spaceId, groupId, replied: result.replied.length, pinned: result.postIds.length },
        'question group answered',
      );
      for (const postId of result.postIds) analyzeLater(postId);
      for (const member of result.replied) {
        const sender = await notifications.member(member.senderMembershipId);
        if (!sender.userId || sender.userId === userId) continue;
        await notifications.notify({
          userId: sender.userId,
          spaceId,
          kind: 'reply_received',
          payload: { inboundId: member.id, subject: member.subject, questionGroupId: groupId },
        });
      }
      return presentOne(spaceId, result.row);
    },

    /** A fresh AI draft; 429 after LIMITS.answerOnce.redraftsPerDay per group per UTC day. */
    async redraft(spaceId: string, groupId: string): Promise<RedraftResult> {
      const today = utcDayString();
      const row = await repos.questionGroups.useRedraft(spaceId, groupId, today);
      if (!row) {
        const existing = await repos.questionGroups.findById(spaceId, groupId);
        if (!existing) throw notFound('Question group');
        if (existing.status !== 'open') throw conflict(`This group is already ${existing.status}`);
        throw dailyCapReached('No redrafts left for this question today');
      }
      const [space, members] = await Promise.all([
        repos.questionGroups.space(spaceId),
        repos.questionGroups.members([groupId]),
      ]);
      if (!space) throw notFound('Space');
      try {
        const output = await ai.questionGroup(
          namingInput(
            space,
            members.map((member) => member.body),
            row.draft,
          ),
          { spaceId, userId: space.ownerUserId, refType: 'question_group', refId: groupId },
        );
        if (!output.isQuestion || !output.draft) throw new Error('no draft returned');
        await repos.questionGroups.setNaming(groupId, { draft: output.draft });
        return { draft: output.draft, redraftsLeft: redraftsLeft(row, today) };
      } catch (error) {
        await repos.questionGroups.refundRedraft(groupId, today);
        if (isAiUnavailable(error)) {
          log.info({ groupId, reason: error.reason }, 'redraft unavailable');
        } else {
          log.warn({ err: error, groupId }, 'redraft failed');
        }
        throw aiUnavailable("Couldn't draft a new answer right now. Try again in a moment.");
      }
    },

    async dismiss(spaceId: string, groupId: string): Promise<QuestionGroup> {
      const row = await repos.questionGroups.dismiss(spaceId, groupId);
      if (!row) return explainNotOpen(spaceId, groupId);
      return presentOne(spaceId, row);
    },

    /** Takes the pitch out for good (grouping never re-adds it); 404 when it is not in the group. */
    async removeAsker(spaceId: string, groupId: string, pitchId: string): Promise<QuestionGroup> {
      const row = await db.transaction(async (tx) => {
        const group = await repos.questionGroups.findById(spaceId, groupId, tx);
        if (!group) throw notFound('Question group');
        if (group.status !== 'open') throw conflict(`This group is already ${group.status}`);
        if (!(await repos.questionGroups.removeMember(spaceId, groupId, pitchId, tx))) {
          throw notFound('Pitch');
        }
        return repos.questionGroups.refreshStats(groupId, tx);
      });
      if (!row) throw notFound('Question group');
      return presentOne(spaceId, row);
    },
  };
}

export type QuestionGroupsService = ReturnType<typeof createQuestionGroupsService>;
