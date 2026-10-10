import { z } from 'zod';
import { UPLOAD_CONTENT_TYPES, UPLOAD_KINDS } from '../enums.js';
import { LIMITS } from '../limits.js';
import { idSchema } from './space.js';

/**
 * POST /api/uploads/presign. The server picks the key; `communityId` is required for a
 * community cover (the service checks it belongs to the caller's space).
 */
export const presignUploadSchema = z.object({
  kind: z.enum(UPLOAD_KINDS),
  contentType: z.enum(UPLOAD_CONTENT_TYPES, 'Use a JPEG, PNG or WebP image'),
  size: z
    .int()
    .min(1)
    .max(LIMITS.uploads.maxBytes, `Up to ${LIMITS.uploads.maxBytes / 1024 / 1024} MB`),
  communityId: idSchema.optional(),
});
export type PresignUploadInput = z.input<typeof presignUploadSchema>;
