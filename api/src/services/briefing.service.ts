import {
  type aiFeedbackSchema,
  BRIEFING_REF_TYPES,
  type Briefing,
  type BriefingHighlight,
  type BriefingRefType,
  type FeedbackResponse,
  idSchema,
  LIMITS,
} from '@fellow-owners/shared';
import { z } from 'zod';
import {
  type AiServices,
  type AiUnavailableReason,
  type BriefingCandidate,
  type BriefingCounts,
  isAiUnavailable,
} from '../ai/types.js';
import type { DigestRow } from '../db/schema/ai.js';
import { daysAgo, utcDayString } from '../lib/dates.js';
import { notFound } from '../lib/errors.js';
import type { Logger } from '../lib/logger.js';
import { displayName } from '../lib/present.js';
import { rankIdeas } from '../lib/ranking.js';
import { briefingHighlightRef, type FeedbackKey } from '../repositories/feedback.repo.js';
import type { Repos } from '../repositories/index.js';
import type { OwnerContext } from './access.service.js';
import type { DiscoveryService } from './discovery.service.js';
import type { LimitsService } from './limits.service.js';

export type FeedbackBody = z.output<typeof aiFeedbackSchema>;

export interface BriefingServiceDeps {
  repos: Repos;
  ai: AiServices;
  limits: LimitsService;
  discovery: DiscoveryService;
  logger: Logger;
}

/** Candidate mix (02-trd data flow 3): top ideas, top pitches, rising people; max 40 in total. */
const CANDIDATE_LIMITS = { ideas: 15, pitches: 12, people: 10 } as const;
/** Posts considered for the idea candidates (most recent first, then ranked in code). */
const IDEA_POOL = 500;
/** Pitches considered for the pitch candidates. */
const PITCH_WINDOW_DAYS = 30;

/** What digests.content holds for a space briefing: the validated AI output. */
const storedBriefingSchema = z.object({
  headline: z.string(),
  highlights: z
    .array(
      z.object({
        refType: z.enum(BRIEFING_REF_TYPES),
        refId: z.string(),
        why: z.string(),
      }),
    )
    .catch([]),
  watchouts: z.array(z.string()).catch([]),
});
export type StoredBriefing = z.output<typeof storedBriefingSchema>;

type Built =
  | { kind: 'ready'; content: StoredBriefing; model: string; counts: BriefingCounts }
  | { kind: 'empty'; counts: BriefingCounts }
  | { kind: 'unavailable'; reason: AiUnavailableReason; counts: BriefingCounts };

const refKey = (refType: string, refId: string) => `${refType}:${refId}`;

function cut(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/** The code-written headline used when there is no AI briefing. */
export function fallbackHeadline(counts: BriefingCounts): string {
  if (counts.members === 0 && counts.ideas7d === 0 && counts.pitches7d === 0) {
    return 'Your space is ready. Share your bio link to welcome your first members.';
  }
  return `${plural(counts.newMembers7d, 'new member')}, ${plural(counts.ideas7d, 'idea')} and ${plural(counts.pitches7d, 'pitch', 'pitches')} this week`;
}

export function fallbackWatchouts(
  counts: BriefingCounts,
  reason: AiUnavailableReason | null,
): string[] {
  const out: string[] = [];
  if (reason === 'budget') out.push("AI paused until tomorrow: today's AI budget is used up.");
  if (counts.pendingAnalysis > 0) {
    out.push(`${plural(counts.pendingAnalysis, 'item')} waiting for AI review.`);
  }
  if (out.length < LIMITS.briefing.watchoutsMax && counts.filteredSpam7d > 0) {
    out.push(`${plural(counts.filteredSpam7d, 'pitch', 'pitches')} filtered as spam this week.`);
  }
  return out.slice(0, LIMITS.briefing.watchoutsMax);
}

export function highlightHref(refType: BriefingRefType, refId: string): string {
  const id = encodeURIComponent(refId);
  switch (refType) {
    case 'post':
      return `/dashboard/ideas?item=${id}`;
    case 'inbound':
      return `/dashboard/inbox?item=${id}`;
    case 'membership':
      return `/dashboard/people?item=${id}`;
  }
}

/**
 * The AI output checked against the candidates (02-trd: any ref not in the list is dropped),
 * deduplicated and cut to the shared limits. Null when nothing usable is left.
 */
export function sanitizeBriefing(
  output: { headline: string; highlights: StoredBriefing['highlights']; watchouts: string[] },
  candidates: BriefingCandidate[],
  counts: BriefingCounts,
): StoredBriefing | null {
  const allowed = new Set(candidates.map((c) => refKey(c.refType, c.refId)));
  const seen = new Set<string>();
  const highlights: StoredBriefing['highlights'] = [];
  for (const highlight of output.highlights) {
    const key = refKey(highlight.refType, highlight.refId);
    const why = cut(highlight.why ?? '', LIMITS.briefing.whyMax);
    if (!allowed.has(key) || seen.has(key) || !why) continue;
    seen.add(key);
    highlights.push({ refType: highlight.refType, refId: highlight.refId, why });
    if (highlights.length >= LIMITS.briefing.highlights.max) break;
  }
  if (highlights.length === 0) return null;
  const headline = cut(output.headline ?? '', LIMITS.briefing.headlineMax);
  return {
    headline: headline || fallbackHeadline(counts),
    highlights,
    watchouts: (output.watchouts ?? [])
      .map((line) => cut(line, LIMITS.briefing.whyMax))
      .filter(Boolean)
      .slice(0, LIMITS.briefing.watchoutsMax),
  };
}

/**
 * The Today briefing (02-trd data flow 3): one cached digest per space per UTC day
 * (digests.community_id null). Built from candidates chosen in code, written by the smart model,
 * every highlight checked against the candidates. If the AI fails or the budget is used up the
 * response is `unavailable` with a code-written headline (still 200) and nothing is cached, so the
 * next load tries again. Regenerate: 5 a day.
 */
export function createBriefingService(deps: BriefingServiceDeps) {
  const { repos, limits, discovery } = deps;
  const log = deps.logger.child({ module: 'briefing' });

  async function gather(
    owner: OwnerContext,
    now: Date,
  ): Promise<{ candidates: BriefingCandidate[]; counts: BriefingCounts }> {
    const spaceId = owner.space.id;
    const weekAgo = daysAgo(7, now);
    const [rankInputs, pitches, rising, communities] = await Promise.all([
      repos.posts.listRankInputs(spaceId, { includeHidden: false, max: IDEA_POOL }),
      repos.pitches.listTopByFit(spaceId, {
        limit: CANDIDATE_LIMITS.pitches,
        since: daysAgo(PITCH_WINDOW_DAYS, now),
      }),
      discovery.risingScores(spaceId, now),
      repos.communities.listWithStats(spaceId, weekAgo),
    ]);
    const [
      members,
      newMembers7d,
      ideas7d,
      pitches7d,
      opportunities,
      mix,
      pendingPosts,
      pendingPitches,
    ] = await Promise.all([
      repos.memberships.countActive(spaceId),
      repos.memberships.countJoined(spaceId, { from: weekAgo }),
      repos.posts.countCreated(spaceId, { from: weekAgo }),
      repos.pitches.countCreated(spaceId, { from: weekAgo }),
      repos.pitches.countOpportunities(spaceId),
      repos.pitches.inboxMix(spaceId, weekAgo),
      repos.posts.countPendingAnalysis(spaceId),
      repos.pitches.countPendingAnalysis(spaceId),
    ]);

    const topIdeaIds = rankIdeas(rankInputs, now)
      .slice(0, CANDIDATE_LIMITS.ideas)
      .map((item) => item.id);
    const topPeople = rising.slice(0, CANDIDATE_LIMITS.people);
    const [ideaRows, peopleRefs] = await Promise.all([
      repos.posts.findManyByIds(spaceId, topIdeaIds),
      repos.memberships.refs(topPeople.map((entry) => entry.membershipId)),
    ]);
    const ideaById = new Map(ideaRows.map((row) => [row.id, row]));

    const candidates: BriefingCandidate[] = [
      ...topIdeaIds.flatMap((id): BriefingCandidate[] => {
        const row = ideaById.get(id);
        if (!row) return [];
        const scored = row.analysisStatus === 'done';
        return [
          {
            refType: 'post',
            refId: row.id,
            title: row.title,
            summary: scored ? row.aiSummary : null,
            fitScore: scored ? row.aiFitScore : null,
            signals: row.useCount + row.buildCount,
            reason: scored ? row.aiFitReason : null,
          },
        ];
      }),
      ...pitches.map(
        (row): BriefingCandidate => ({
          refType: 'inbound',
          refId: row.id,
          title: row.subject,
          summary: row.aiSummary,
          fitScore: row.aiFitScore,
          reason: row.aiFitReason,
        }),
      ),
      ...topPeople.flatMap((entry): BriefingCandidate[] => {
        const ref = peopleRefs.get(entry.membershipId);
        if (!ref) return [];
        return [
          {
            refType: 'membership',
            refId: entry.membershipId,
            title: displayName(ref.name),
            summary: ref.headline,
            fitScore: null,
            signals: entry.signals,
            reason: `Rising over the last 14 days: ${plural(entry.posts, 'post')}, ${plural(entry.signals, 'signal')} received, ${plural(entry.teamJoins, 'team join')}.`,
          },
        ];
      }),
    ].slice(0, LIMITS.briefing.candidatesMax);

    const counts: BriefingCounts = {
      members,
      newMembers7d,
      ideas7d,
      pitches7d,
      opportunitiesWaiting: opportunities,
      filteredSpam7d: mix.find((row) => row.key === 'spam')?.count ?? 0,
      pendingAnalysis: pendingPosts + pendingPitches,
      perCommunity: communities
        .filter((row) => !row.archivedAt)
        .map((row) => ({
          slug: row.slug,
          name: row.name,
          posts7d: row.postsSince,
          joins7d: row.joinsSince,
        })),
    };
    return { candidates, counts };
  }

  async function build(owner: OwnerContext, periodDate: string): Promise<Built> {
    const now = new Date();
    const { candidates, counts } = await gather(owner, now);
    if (candidates.length === 0) return { kind: 'empty', counts };
    try {
      const output = await deps.ai.briefing(
        {
          creatorName: owner.space.displayName,
          tasteProfile: owner.space.tasteProfile,
          candidates,
          counts,
          periodDate,
        },
        { spaceId: owner.space.id, userId: owner.userId, refType: 'digest' },
      );
      const content = sanitizeBriefing(output, candidates, counts);
      if (!content) {
        log.warn({ spaceId: owner.space.id }, 'briefing had no valid highlights; not cached');
        return { kind: 'unavailable', reason: 'provider', counts };
      }
      return { kind: 'ready', content, model: output.model, counts };
    } catch (error) {
      if (isAiUnavailable(error)) {
        log.info({ spaceId: owner.space.id, reason: error.reason }, 'briefing unavailable');
        return { kind: 'unavailable', reason: error.reason, counts };
      }
      log.error({ err: error, spaceId: owner.space.id }, 'briefing generation failed');
      return { kind: 'unavailable', reason: 'provider', counts };
    }
  }

  /** A stored digest as the Briefing response, titles and scores resolved from current rows. */
  async function present(owner: OwnerContext, digest: DigestRow): Promise<Briefing> {
    const { space } = owner;
    const parsed = storedBriefingSchema.safeParse(digest.content);
    const content: StoredBriefing = parsed.success
      ? parsed.data
      : { headline: '', highlights: [], watchouts: [] };
    const idsOf = (type: BriefingRefType) =>
      content.highlights.filter((h) => h.refType === type).map((h) => h.refId);
    const valid = (ids: string[]) => ids.filter((id) => idSchema.safeParse(id).success);

    const refIds = content.highlights.map((_, index) => briefingHighlightRef(digest.id, index));
    const [postRows, pitchRows, people, feedback] = await Promise.all([
      repos.posts.findManyByIds(space.id, valid(idsOf('post'))),
      repos.pitches.findDetailsByIds(space.id, valid(idsOf('inbound'))),
      repos.memberships.refs(valid(idsOf('membership'))),
      repos.feedback.findMany(space.id, 'briefing_highlight', refIds, owner.userId),
    ]);
    const posts = new Map(postRows.filter((row) => !row.deletedAt).map((row) => [row.id, row]));
    const pitches = new Map(pitchRows.map((row) => [row.id, row]));

    const highlights: BriefingHighlight[] = content.highlights.flatMap((highlight, index) => {
      let title: string;
      let fitScore: number | null = null;
      if (highlight.refType === 'post') {
        const row = posts.get(highlight.refId);
        if (!row) return [];
        title = row.title;
        fitScore = row.analysisStatus === 'done' ? row.aiFitScore : null;
      } else if (highlight.refType === 'inbound') {
        const row = pitches.get(highlight.refId);
        if (!row) return [];
        title = row.subject;
        fitScore = row.analysisStatus === 'done' ? row.aiFitScore : null;
      } else {
        const ref = people.get(highlight.refId);
        if (!ref || ref.removed) return [];
        title = displayName(ref.name);
      }
      return [
        {
          index,
          refType: highlight.refType,
          refId: highlight.refId,
          title,
          why: highlight.why,
          fitScore,
          href: highlightHref(highlight.refType, highlight.refId),
          feedback: feedback.get(briefingHighlightRef(digest.id, index)) ?? null,
        },
      ];
    });

    return {
      id: digest.id,
      periodDate: digest.periodDate,
      status: 'ready',
      headline: content.headline,
      highlights,
      watchouts: content.watchouts,
      regenerationsLeft: limits.regenerationsLeft(digest.regenerations),
      model: digest.model,
      generatedAt: digest.updatedAt.toISOString(),
    };
  }

  /** No cached digest: the empty-space or AI-unavailable briefing (code-written, not cached). */
  function uncached(
    built: Exclude<Built, { kind: 'ready' }>,
    periodDate: string,
    regenerations: number | null | undefined,
  ): Briefing {
    return {
      id: null,
      periodDate,
      status: built.kind === 'empty' ? 'ready' : 'unavailable',
      headline: fallbackHeadline(built.counts),
      highlights: [],
      watchouts: fallbackWatchouts(
        built.counts,
        built.kind === 'unavailable' ? built.reason : null,
      ),
      regenerationsLeft: limits.regenerationsLeft(regenerations),
      model: null,
      generatedAt: null,
    };
  }

  async function digestKey(spaceId: string, ref: string): Promise<void> {
    const [digestId, indexText] = ref.split(':');
    const index = Number(indexText);
    if (!digestId || !idSchema.safeParse(digestId).success || !Number.isInteger(index)) {
      throw notFound('Briefing highlight');
    }
    const digest = await repos.digests.findById(spaceId, digestId);
    const parsed = storedBriefingSchema.safeParse(digest?.content);
    if (!digest || !parsed.success || index < 0 || index >= parsed.data.highlights.length) {
      throw notFound('Briefing highlight');
    }
  }

  return {
    /** GET /api/studio/briefing: today's cached digest, or build (and cache) it. */
    async get(owner: OwnerContext): Promise<Briefing> {
      const periodDate = utcDayString();
      const cached = await repos.digests.findBriefing(owner.space.id, periodDate);
      if (cached) return present(owner, cached);
      const built = await build(owner, periodDate);
      if (built.kind !== 'ready') return uncached(built, periodDate, 0);
      const row = await repos.digests.upsert({
        spaceId: owner.space.id,
        communityId: null,
        periodDate,
        content: built.content,
        model: built.model,
      });
      return present(owner, row);
    },

    /** POST /api/studio/briefing/regenerate: max 5 a day (429 daily_cap_reached after). */
    async regenerate(owner: OwnerContext): Promise<Briefing> {
      const periodDate = utcDayString();
      const cached = await repos.digests.findBriefing(owner.space.id, periodDate);
      limits.assertRegenerationAllowed(cached?.regenerations);
      const built = await build(owner, periodDate);
      if (built.kind !== 'ready') return uncached(built, periodDate, cached?.regenerations);
      const values = {
        spaceId: owner.space.id,
        communityId: null,
        periodDate,
        content: built.content,
        model: built.model,
      };
      if (!cached) return present(owner, await repos.digests.upsert(values));
      const row = await repos.digests.replaceCapped(values, LIMITS.briefing.regenerationsPerDay);
      // Null: a concurrent regenerate took the last slot meanwhile.
      if (!row) throw limits.regenerationCapError();
      return present(owner, row);
    },

    /** POST /api/studio/feedback: thumbs up/down on an AI pick; `null` clears the vote. */
    async feedback(owner: OwnerContext, input: FeedbackBody): Promise<FeedbackResponse> {
      const spaceId = owner.space.id;
      const isId = idSchema.safeParse(input.refId).success;
      if (input.refType === 'post') {
        const post = isId ? await repos.posts.findInSpace(spaceId, input.refId) : null;
        if (!post || post.deletedAt) throw notFound('Post');
      } else if (input.refType === 'inbound') {
        const pitch = isId ? await repos.pitches.findById(spaceId, input.refId) : null;
        if (!pitch) throw notFound('Pitch');
      } else {
        await digestKey(spaceId, input.refId);
      }
      const key: FeedbackKey = {
        spaceId,
        refType: input.refType,
        refId: input.refId,
        userId: owner.userId,
      };
      if (input.verdict === null) await repos.feedback.remove(key);
      else await repos.feedback.upsert(key, input.verdict);
      return { refType: input.refType, refId: input.refId, verdict: input.verdict };
    },
  };
}

export type BriefingService = ReturnType<typeof createBriefingService>;
