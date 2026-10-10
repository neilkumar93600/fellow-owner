import type { Db } from '../db/client.js';
import { createAccountRepo } from './account.repo.js';
import { createAiRunsRepo } from './ai-runs.repo.js';
import { createAsksRepo } from './asks.repo.js';
import { createClicksRepo } from './clicks.repo.js';
import { createCommentsRepo } from './comments.repo.js';
import { createCommunitiesRepo } from './communities.repo.js';
import { createDigestsRepo } from './digests.repo.js';
import { createFeedbackRepo } from './feedback.repo.js';
import { createFollowersRepo } from './followers.repo.js';
import { createInsightsRepo } from './insights.repo.js';
import { createMembershipsRepo } from './memberships.repo.js';
import { createNewsletterRepo } from './newsletter.repo.js';
import { createNotificationPrefsRepo } from './notification-prefs.repo.js';
import { createNotificationsRepo } from './notifications.repo.js';
import { createPageVisitsRepo } from './page-visits.repo.js';
import { createPitchesRepo } from './pitches.repo.js';
import { createPostsRepo } from './posts.repo.js';
import { createPromotionsRepo } from './promotions.repo.js';
import { createQuestionGroupsRepo } from './question-groups.repo.js';
import { createReportsRepo } from './reports.repo.js';
import { createSearchRepo } from './search.repo.js';
import { createSignalsRepo } from './signals.repo.js';
import { createSnoozesRepo } from './snoozes.repo.js';
import { createSpacesRepo } from './spaces.repo.js';
import { createSupportRepo } from './support.repo.js';
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
    followers: createFollowersRepo(db),
    notifications: createNotificationsRepo(db),
    insights: createInsightsRepo(db),
    asks: createAsksRepo(db),
    newsletter: createNewsletterRepo(db),
    search: createSearchRepo(db),
    questionGroups: createQuestionGroupsRepo(db),
    reports: createReportsRepo(db),
    support: createSupportRepo(db),
    snoozes: createSnoozesRepo(db),
    notificationPrefs: createNotificationPrefsRepo(db),
    pageVisits: createPageVisitsRepo(db),
    account: createAccountRepo(db),
  };
}

export type Repos = ReturnType<typeof createRepos>;
