import {
  type AskAiRequestInput,
  type AskAnswer,
  type AskCitation,
  dailyCap,
  LIMITS,
} from '@fellow-owners/shared';
import type { AskAiInput } from '../ai/types.js';
import type { CoreDeps } from '../container.js';
import { startOfUtcDay } from '../lib/dates.js';
import { dailyCapReached, notFound } from '../lib/errors.js';
import { highlightHref } from './briefing.service.js';
import { nextUtcMidnight } from './limits.service.js';

export type AskServiceDeps = Pick<CoreDeps, 'repos' | 'ai' | 'logger'>;

/** The answer when search finds nothing (no embedded posts or pitches yet): no model call. */
export const NOTHING_YET =
  'Nothing in your space mentions that yet. Ask again once fans have posted or pitched about it.';

/** ai_runs.ref_type of the question embedding: one per question asked. */
export const ASK_REF_TYPE = 'ask';

type Match = AskAiInput['matches'][number];
const key = (refType: string, refId: string) => `${refType}:${refId}`;

/**
 * F13 Ask your AI (owner only): embeds the question, takes the LIMITS.ask.matches nearest posts
 * and pitches of the caller's space, and has the smart model answer from those alone. Citations
 * are checked against the matched set (anything else is dropped and the answer renumbered).
 * LIMITS.ask.perDay questions a day (x DEMO_CAP_SCALE in the shared demo space), counted from
 * ai_runs: the question embeddings that succeeded (task embedItem, ref_type 'ask', status ok)
 * minus the answers that failed (task askAI, ref_type 'ask', status error). A question the AI
 * could not answer costs nothing; TASK_CAPS (every attempt counts) still bound retries.
 */
export function createAskService({ repos, ai }: AskServiceDeps) {
  async function usedToday(spaceId: string, now: Date): Promise<number> {
    const since = startOfUtcDay(now);
    const [asked, failed] = await Promise.all([
      repos.aiRuns.countBySpaceTaskSince(spaceId, 'embedItem', since, {
        refType: ASK_REF_TYPE,
        status: 'ok',
      }),
      // Includes a reserved row still in flight ('in progress' reads as error) for a moment.
      repos.aiRuns.countBySpaceTaskSince(spaceId, 'askAI', since, {
        refType: ASK_REF_TYPE,
        status: 'error',
      }),
    ]);
    return Math.max(0, asked - failed);
  }

  async function nearestMatches(spaceId: string, vector: number[]): Promise<Match[]> {
    const k = LIMITS.ask.matches;
    const [postHits, pitchHits] = await Promise.all([
      repos.search.nearestPosts(spaceId, vector, k),
      repos.search.nearestPitches(spaceId, vector, k),
    ]);
    const nearest = [
      ...postHits.map((hit) => ({ ...hit, refType: 'post' as const })),
      ...pitchHits.map((hit) => ({ ...hit, refType: 'inbound' as const })),
    ]
      .sort((a, b) => a.distance - b.distance)
      .slice(0, k);
    const idsOf = (refType: Match['refType']) =>
      nearest.filter((hit) => hit.refType === refType).map((hit) => hit.id);
    const [postRows, pitchRows] = await Promise.all([
      repos.posts.findManyByIds(spaceId, idsOf('post')),
      repos.pitches.findDetailsByIds(spaceId, idsOf('inbound')),
    ]);
    const rows = new Map<string, Match>();
    for (const row of postRows) {
      rows.set(key('post', row.id), {
        refType: 'post',
        refId: row.id,
        title: row.title,
        summary: row.aiSummary,
        excerpt: row.body,
      });
    }
    for (const row of pitchRows) {
      rows.set(key('inbound', row.id), {
        refType: 'inbound',
        refId: row.id,
        title: row.subject,
        summary: row.aiSummary,
        excerpt: row.body,
      });
    }
    return nearest.flatMap((hit) => rows.get(key(hit.refType, hit.id)) ?? []);
  }

  return {
    async ask(spaceId: string, userId: string, input: AskAiRequestInput): Promise<AskAnswer> {
      const space = await repos.spaces.findByOwnerUserId(userId);
      if (!space || space.id !== spaceId) throw notFound('Space');

      const now = new Date();
      const limit = dailyCap(LIMITS.ask.perDay, space);
      const used = await usedToday(space.id, now);
      if (used >= limit) {
        throw dailyCapReached(`You've asked ${limit} questions today. Try again tomorrow.`, {
          limit,
          used,
          resetsAt: nextUtcMidnight(now).toISOString(),
        });
      }

      const question = input.question.trim();
      const ctx = { spaceId: space.id, userId };
      const vector = await ai.embedItem(
        { title: question, body: '' },
        { ...ctx, refType: ASK_REF_TYPE },
      );
      const matches = await nearestMatches(space.id, vector);
      if (matches.length === 0) {
        return { answer: NOTHING_YET, citations: [], asksLeftToday: Math.max(0, limit - used - 1) };
      }

      const output = await ai.askAI(
        { question, creatorName: space.displayName, tasteProfile: space.tasteProfile, matches },
        { ...ctx, refType: ASK_REF_TYPE },
      );

      // Keep only citations from the matched set (titles from our rows, not the model's), then
      // renumber the answer's [n] markers to the kept list; markers of dropped ones go.
      const matched = new Map(matches.map((m) => [key(m.refType, m.refId), m]));
      const citations: AskCitation[] = [];
      const renumber = new Map<number, number>();
      output.citations.forEach((cited, index) => {
        const match = matched.get(key(cited.refType, cited.refId));
        if (!match) return;
        const existing = citations.findIndex((c) => c.refId === match.refId);
        if (existing >= 0) {
          renumber.set(index + 1, existing + 1);
          return;
        }
        citations.push({
          refType: match.refType === 'post' ? 'post' : 'pitch',
          refId: match.refId,
          title: match.title,
          href: highlightHref(match.refType, match.refId),
        });
        renumber.set(index + 1, citations.length);
      });
      const answer = output.answer
        .replace(/\s*\[(\d+)\]/g, (marker, n: string) => {
          const to = renumber.get(Number(n));
          return to ? marker.replace(n, String(to)) : '';
        })
        .trim();

      const usedNow = await usedToday(space.id, now);
      return { answer, citations, asksLeftToday: Math.max(0, limit - usedNow) };
    },
  };
}

export type AskService = ReturnType<typeof createAskService>;
