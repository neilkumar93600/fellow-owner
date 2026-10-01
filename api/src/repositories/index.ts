import type { Db } from '../db/client.js';
import { createAiRunsRepo } from './ai-runs.repo.js';
import { createClicksRepo } from './clicks.repo.js';
import { createCommentsRepo } from './comments.repo.js';
import { createCommunitiesRepo } from './communities.repo.js';
import { createDigestsRepo } from './digests.repo.js';
import { createFeedbackRepo } from './feedback.repo.js';
import { createMembershipsRepo } from './memberships.repo.js';
import { createPitchesRepo } from './pitches.repo.js';
import { createPostsRepo } from './posts.repo.js';
import { createPromotionsRepo } from './promotions.repo.js';
import { createSignalsRepo } from './signals.repo.js';
import { createSpacesRepo } from './spaces.repo.js';
import { createTeamsRepo } from './teams.repo.js';

/** Every repository over one db handle. Built once in container.ts. */
export function createRepos(db: Db) {
  return {
    spaces: createSpacesRepo(db),
    communities: createCommunitiesRepo(db),
    memberships: createMembershipsRepo(db),
    posts: createPostsRepo(db),
    comments: createCommentsRepo(db),
    signals: createSignalsRepo(db),
    teams: createTeamsRepo(db),
    pitches: createPitchesRepo(db),
    promotions: createPromotionsRepo(db),
    clicks: createClicksRepo(db),
    digests: createDigestsRepo(db),
    aiRuns: createAiRunsRepo(db),
    feedback: createFeedbackRepo(db),
  };
}

export type Repos = ReturnType<typeof createRepos>;
