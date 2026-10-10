import { z } from 'zod';
import { LIMITS } from '../limits.js';
import { idSchema } from './space.js';

/** POST /api/posts/:id/comments */
export const createCommentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(LIMITS.comment.body.min, 'Write a comment')
    .max(LIMITS.comment.body.max, `Up to ${LIMITS.comment.body.max} characters`),
});
export type CreateCommentInput = z.input<typeof createCommentSchema>;

/** DELETE /api/posts/:id/comments/:commentId (author), PATCH to hide (owner). */
export const commentParamsSchema = z.object({
  id: idSchema,
  commentId: idSchema,
});

/** POST /api/comments/:commentId/report */
export const commentIdParamsSchema = z.object({ commentId: idSchema });

/** PATCH /api/studio/posts/:postId/comments/:commentId (owner hides or unhides, F25). */
export const postCommentParamsSchema = z.object({
  postId: idSchema,
  commentId: idSchema,
});
