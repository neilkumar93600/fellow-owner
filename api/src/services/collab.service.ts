import type {
  BackingState,
  backProjectSchema,
  createPollSchema,
  createProjectUpdateSchema,
  FeedbackWantedState,
  FollowState,
  Poll,
  ProjectUpdate,
  ProjectUpdatesPage,
  ProjectUpdatesQuery,
  pollVoteSchema,
} from '@fellow-owners/shared';
import type { z } from 'zod';
import type { CoreDeps } from '../container.js';
import { notImplemented } from '../lib/errors.js';
import type { AccessService, OwnerContext } from './access.service.js';
import type { NotificationsService } from './notifications.service.js';

export type CreatePollBody = z.output<typeof createPollSchema>;
export type PollVoteBody = z.output<typeof pollVoteSchema>;
export type CreateProjectUpdateBody = z.output<typeof createProjectUpdateSchema>;
export type BackProjectBody = z.output<typeof backProjectSchema>;

export type CollabServiceDeps = Pick<CoreDeps, 'db' | 'repos' | 'logger'> & {
  /** requirePostAccess(postId, userId): 404 unknown/deleted/hidden, 403 non-members. */
  access: AccessService;
  /** poll_voted, project_updated, project_backed. */
  notifications: NotificationsService;
};

/**
 * F4 Fan collaboration. Member methods take the post id and the caller's user id (the post's
 * space and the membership are resolved inside, like posts.service); backing takes the owner.
 * Wave A stubs: every method answers 501 until B3 lands.
 */
export function createCollabService(_deps: CollabServiceDeps) {
  const notBuilt = () => notImplemented('Fan collaboration');
  return {
    /** GET /api/posts/:id/poll -> Poll (404 when the post has none). */
    async getPoll(_postId: string, _userId: string): Promise<Poll> {
      throw notBuilt();
    },

    /** POST /api/posts/:id/poll (post author; one per post: 409 on a second). */
    async createPoll(_postId: string, _userId: string, _input: CreatePollBody): Promise<Poll> {
      throw notBuilt();
    },

    /** PUT /api/posts/:id/poll/vote: replaces the caller's choices while open (single choice unless multi). */
    async vote(_postId: string, _userId: string, _input: PollVoteBody): Promise<Poll> {
      throw notBuilt();
    },

    /** POST /api/posts/:id/poll/close (post author or space owner). */
    async closePoll(_postId: string, _userId: string): Promise<Poll> {
      throw notBuilt();
    },

    /** GET /api/posts/:id/updates?before=&limit= : newest first. */
    async listUpdates(
      _postId: string,
      _userId: string,
      _query: ProjectUpdatesQuery,
    ): Promise<ProjectUpdatesPage> {
      throw notBuilt();
    },

    /** POST /api/posts/:id/updates (project author or accepted team; COLLAB_LIMITS.update.perUserPerDay). */
    async createUpdate(
      _postId: string,
      _userId: string,
      _input: CreateProjectUpdateBody,
    ): Promise<ProjectUpdate> {
      throw notBuilt();
    },

    /** DELETE /api/posts/:id/updates/:updateId (its author, the project author or the owner). */
    async deleteUpdate(_postId: string, _updateId: string, _userId: string): Promise<void> {
      throw notBuilt();
    },

    /** PUT (on) / DELETE (off) /api/posts/:id/feedback-wanted (project author). */
    async setFeedbackWanted(
      _postId: string,
      _userId: string,
      _on: boolean,
    ): Promise<FeedbackWantedState> {
      throw notBuilt();
    },

    /** PUT (on) / DELETE (off) /api/posts/:id/follow (members). */
    async setFollowing(_postId: string, _userId: string, _on: boolean): Promise<FollowState> {
      throw notBuilt();
    },

    /** PUT /api/spaces/:handle/posts/:postId/back (owner): badge + optional note. */
    async back(
      _owner: OwnerContext,
      _postId: string,
      _input: BackProjectBody,
    ): Promise<BackingState> {
      throw notBuilt();
    },

    /** DELETE /api/spaces/:handle/posts/:postId/back (owner). */
    async unback(_owner: OwnerContext, _postId: string): Promise<BackingState> {
      throw notBuilt();
    },
  };
}

export type CollabService = ReturnType<typeof createCollabService>;
