import type { PresignedUpload, PresignUploadInput } from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { notImplemented } from '../lib/errors.js';

export type UploadsServiceDeps = Pick<CoreDeps, 'repos' | 'storage' | 'logger'>;

/** Image uploads: presigned PUTs with server-made keys, reads via /api/media. Stub: F13. */
export function createUploadsService(_deps: UploadsServiceDeps) {
  return {
    async presign(_userId: string, _input: PresignUploadInput): Promise<PresignedUpload> {
      throw notImplemented('Uploads');
    },
    /** A presigned GET for a known key; 404 when missing, 503 when uploads are off. */
    async mediaUrl(_key: string): Promise<string> {
      throw notImplemented('Uploads');
    },
  };
}

export type UploadsService = ReturnType<typeof createUploadsService>;
