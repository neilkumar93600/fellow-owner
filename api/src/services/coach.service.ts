import { type CoachRequestInput, type CoachResult, LIMITS } from '@fellow-owners/shared';
import { plainLine } from '../ai/guard.js';
import { isAiUnavailable } from '../ai/types.js';
import type { CoreDeps } from '../container.js';
import { startOfUtcDay } from '../lib/dates.js';
import { forbidden, notFound, rateLimited } from '../lib/errors.js';

export type CoachServiceDeps = Pick<CoreDeps, 'repos' | 'ai' | 'logger'>;

const LIMIT_MESSAGE = 'You have used all of today’s coach checks. They reset tomorrow.';

/**
 * F30 Idea Coach: clarity checks on a pitch or post draft. Any signed-in user may check a pitch
 * (their first pitch creates the membership); only members may check a post. Per-user cap
 * LIMITS.coach.perDay (ai_runs, task `coach`); the call never touches the space's AI budget.
 */
export function createCoachService({ repos, ai }: CoachServiceDeps) {
  const usedToday = (userId: string) =>
    repos.aiRuns.countByUserTaskSince(userId, 'coach', startOfUtcDay(new Date()));

  return {
    async check(handle: string, userId: string, input: CoachRequestInput): Promise<CoachResult> {
      const space = await repos.spaces.findByHandle(handle);
      if (!space) throw notFound('Space');
      const membership = await repos.memberships.findByUser(space.id, userId);
      if (membership?.removedAt) throw forbidden('You were removed from this space');
      if (input.kind === 'post' && !membership) throw forbidden('Join this space to check a post');

      if ((await usedToday(userId)) >= LIMITS.coach.perDay) {
        throw rateLimited(LIMIT_MESSAGE, { checksLeftToday: 0 });
      }

      try {
        const result = await ai.coach(
          {
            kind: input.kind,
            creatorName: plainLine(space.displayName).split(' ')[0] || 'the creator',
            subject: input.subject ?? '',
            body: input.body,
          },
          { spaceId: space.id, userId },
        );
        const used = await usedToday(userId);
        return { ...result, checksLeftToday: Math.max(0, LIMITS.coach.perDay - used) };
      } catch (error) {
        // The AI's own per-user or per-space cap: tell the client it is out of checks.
        if (isAiUnavailable(error) && error.reason === 'cap') {
          throw rateLimited(LIMIT_MESSAGE, { checksLeftToday: 0 });
        }
        throw error;
      }
    },
  };
}

export type CoachService = ReturnType<typeof createCoachService>;
