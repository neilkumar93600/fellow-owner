import { randomUUID } from 'node:crypto';
import type {
  PresignedUpload,
  PresignUploadInput,
  UploadContentType,
  UploadKind,
} from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { AppError, badRequest, notFound } from '../lib/errors.js';

export type UploadsServiceDeps = Pick<CoreDeps, 'repos' | 'storage' | 'logger'>;

const EXTENSIONS: Record<UploadContentType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** `<kind>/<userId or spaceId>/<uuid>.<ext>`: the only keys /api/media serves. */
const KEY_PATTERN =
  /^(?:avatar|space_cover|community_cover|member_avatar)\/[A-Za-z0-9_-]{1,64}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/;

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

    /** A presigned GET for a known key; 404 when missing, 503 when uploads are off. */
    async mediaUrl(key: string): Promise<string> {
      if (!KEY_PATTERN.test(key)) throw notFound('Image');
      if (!storage.enabled) throw uploadsDisabled();
      if (!(await storage.exists(key))) throw notFound('Image');
      return storage.presignGet(key);
    },
  };
}

export type UploadsService = ReturnType<typeof createUploadsService>;
