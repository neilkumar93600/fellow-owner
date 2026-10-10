import { randomUUID } from 'node:crypto';
import type {
  PresignedUpload,
  PresignUploadInput,
  UploadContentType,
  UploadKind,
} from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { AppError, badRequest, notFound, validationError } from '../lib/errors.js';
import {
  MEDIA_KEY_PATTERN as KEY_PATTERN,
  mediaImageProblem,
  type Storage,
} from '../lib/storage.js';

export type UploadsServiceDeps = Pick<CoreDeps, 'repos' | 'storage' | 'logger'>;

const EXTENSIONS: Record<UploadContentType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * 400 validation_error unless `url` may be stored as an avatar or cover (lib/storage.ts
 * mediaImageProblem: an /api/media upload must really be a JPEG, PNG or WebP). An unchanged value
 * (`url === current`) was checked when it was first saved, so it is not fetched again.
 */
export async function assertStorableImage(
  storage: Storage,
  path: string[],
  url: string | null | undefined,
  current?: string | null,
): Promise<void> {
  if (url === current) return;
  const problem = await mediaImageProblem(storage, url);
  if (problem) {
    throw validationError(
      [{ location: 'body', path, message: problem, code: 'invalid_image' }],
      problem,
    );
  }
}

const uploadsDisabled = () => new AppError('uploads_disabled', 503, 'Image uploads are turned off');

const OWNER_KINDS: readonly UploadKind[] = ['space_cover', 'community_cover'];

/** Image uploads: presigned PUTs with server-made keys, reads via /api/media. */
export function createUploadsService({ repos, storage }: UploadsServiceDeps) {
  return {
    async presign(userId: string, input: PresignUploadInput): Promise<PresignedUpload> {
      if (!storage.enabled) throw uploadsDisabled();

      let owner = userId;
      if (OWNER_KINDS.includes(input.kind)) {
        // Covers belong to the space, so only its owner may upload them.
        const space = await repos.spaces.findByOwnerUserId(userId);
        if (!space) throw notFound('Space');
        owner = space.id;
        if (input.kind === 'community_cover') {
          if (!input.communityId) throw badRequest('Choose a community for this cover');
          const community = await repos.communities.findById(space.id, input.communityId);
          if (!community) throw notFound('Community');
        }
      }

      const key = `${input.kind}/${owner}/${randomUUID()}.${EXTENSIONS[input.contentType]}`;
      const { url, headers } = await storage.presignPut(key, input.contentType, input.size);
      return { uploadUrl: url, method: 'PUT', headers, key, url: `/api/media/${key}` };
    },

    /**
     * A presigned GET for a well-formed key; 503 when uploads are off. No HEAD per hit: a missing
     * object answers 404 at the bucket.
     */
    async mediaUrl(key: string): Promise<string> {
      if (!KEY_PATTERN.test(key)) throw notFound('Image');
      if (!storage.enabled) throw uploadsDisabled();
      return storage.presignGet(key);
    },
  };
}

export type UploadsService = ReturnType<typeof createUploadsService>;
