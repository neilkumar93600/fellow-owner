import { z } from 'zod';
import { beforeQuerySchema } from './schemas/post.js';
import { handleParamsSchema, idSchema } from './schemas/space.js';
import type { ISODate, MemberRef, Page } from './types.js';

// F4 Fan collaboration (members and the creator): polls on posts, a project updates timeline that
// members follow, a "feedback wanted" flag that surfaces a project in its community, and the
// creator's "Back this project" (badge + optional note; Spotlight goes through the existing promote
// flow). Member routes live under /api/posts/:id/...; backing is the owner's, under
// /api/spaces/:handle/posts/:postId/back. Notifications: poll_voted, project_updated, project_backed.

export const COLLAB_LIMITS = {
  poll: {
    question: { min: 5, max: 200 },
    options: { min: 2, max: 6 },
    optionLabel: { min: 1, max: 80 },
    /** A close date may be at most this far ahead. */
    closesInDaysMax: 30,
  },
  update: {
    body: { min: 1, max: 2000 },
    /** Updates one member may post per space per UTC day. */
    perUserPerDay: 10,
  },
  backingNote: { max: 280 },
  /** Vote calls one member may make per minute. */
  votesPerMinute: 30,
} as const;

const C = COLLAB_LIMITS;

// ---------------------------------------------------------------- request schemas

/** POST /api/posts/:id/poll: the post author adds one poll to their post. */
export const createPollSchema = z.object({
  question: z
    .string()
    .trim()
    .min(C.poll.question.min, `At least ${C.poll.question.min} characters`)
    .max(C.poll.question.max, `Up to ${C.poll.question.max} characters`),
  options: z
    .array(
      z
        .string()
        .trim()
        .min(C.poll.optionLabel.min, 'Name the option')
        .max(C.poll.optionLabel.max, `Up to ${C.poll.optionLabel.max} characters`),
    )
    .min(C.poll.options.min, `At least ${C.poll.options.min} options`)
    .max(C.poll.options.max, `Up to ${C.poll.options.max} options`)
    .refine(
      (options) => new Set(options.map((o) => o.toLowerCase())).size === options.length,
      'Each option must be different',
    ),
  /** Voters may pick more than one option. */
  multi: z.boolean().default(false),
  closesAt: z.iso.datetime({ offset: true }).nullable().optional(),
});
export type CreatePollInput = z.input<typeof createPollSchema>;

/** PUT /api/posts/:id/poll/vote: the voter's choices (replaces earlier ones while open). */
export const pollVoteSchema = z.object({
  optionIds: z
    .array(idSchema)
    .min(1, 'Pick an option')
    .max(C.poll.options.max)
    .transform((ids) => [...new Set(ids)]),
});
export type PollVoteInput = z.input<typeof pollVoteSchema>;

/** POST /api/posts/:id/updates: the project author or an accepted team member. */
export const createProjectUpdateSchema = z.object({
  body: z
    .string()
    .trim()
    .min(C.update.body.min, 'Write an update')
    .max(C.update.body.max, `Up to ${C.update.body.max} characters`),
});
export type CreateProjectUpdateInput = z.input<typeof createProjectUpdateSchema>;

/** GET /api/posts/:id/updates?before=&limit= : newest first. */
export const projectUpdatesQuerySchema = beforeQuerySchema;
export type ProjectUpdatesQuery = z.output<typeof projectUpdatesQuerySchema>;

/** DELETE /api/posts/:id/updates/:updateId */
export const projectUpdateParamsSchema = z.object({ id: idSchema, updateId: idSchema });

/** PUT /api/spaces/:handle/posts/:postId/back (owner). */
export const backProjectSchema = z.object({
  note: z
    .string()
    .trim()
    .max(C.backingNote.max, `Up to ${C.backingNote.max} characters`)
    .nullable()
    .optional(),
});
export type BackProjectInput = z.input<typeof backProjectSchema>;

/** Owner routes on one post of their space: /api/spaces/:handle/posts/:postId/... */
export const handlePostParamsSchema = handleParamsSchema.extend({ postId: idSchema });

// ---------------------------------------------------------------- responses

export interface PollOption {
  id: string;
  label: string;
  position: number;
  /** Null while the viewer may not see results yet. */
  votes: number | null;
}

/** GET /api/posts/:id/poll (and the result of every poll write). */
export interface Poll {
  id: string;
  postId: string;
  question: string;
  multi: boolean;
  /** In position order. */
  options: PollOption[];
  closesAt: ISODate | null;
  closedAt: ISODate | null;
  /** Closed early, or past closesAt. */
  closed: boolean;
  /** Results show after the viewer votes or once the poll closes (the post author always sees them). */
  resultsVisible: boolean;
  /** Distinct voters; null while results are hidden. */
  voterCount: number | null;
  /** The viewer's chosen option ids. */
  viewerVotes: string[];
  /** The post author or the space owner, while the poll is open. */
  canClose: boolean;
  createdAt: ISODate;
}

/** One entry on a project's updates timeline. */
export interface ProjectUpdate {
  id: string;
  postId: string;
  body: string;
  author: MemberRef;
  createdAt: ISODate;
  /** The update's author, the project author or the space owner. */
  canDelete: boolean;
}

/** GET /api/posts/:id/updates */
export type ProjectUpdatesPage = Page<ProjectUpdate>;

/** PUT/DELETE /api/posts/:id/feedback-wanted (project author). */
export interface FeedbackWantedState {
  feedbackWantedAt: ISODate | null;
}

/** PUT/DELETE /api/posts/:id/follow: the member follows the project's updates. */
export interface FollowState {
  following: boolean;
  followerCount: number;
}

/** "Backed by {creator}": the owner's badge on a project, with an optional note. */
export interface Backing {
  backedAt: ISODate;
  note: string | null;
}

/** PUT/DELETE /api/spaces/:handle/posts/:postId/back */
export interface BackingState {
  postId: string;
  backing: Backing | null;
}
