import type { UploadContentType } from '@fellow-owners/shared';
import type { Env } from '../config/env.js';
import { notImplemented } from './errors.js';

export type StorageEnv = Pick<
  Env,
  | 'UPLOADS_ENABLED'
  | 'BUCKET_ENDPOINT'
  | 'BUCKET_REGION'
  | 'BUCKET_NAME'
  | 'BUCKET_ACCESS_KEY_ID'
  | 'BUCKET_SECRET_ACCESS_KEY'
>;

export interface Storage {
  /** env.UPLOADS_ENABLED: the bucket is configured. */
  readonly enabled: boolean;
  /** A presigned PUT whose signature covers ContentType and ContentLength. */
  presignPut(
    key: string,
    contentType: UploadContentType,
    size: number,
  ): Promise<{ url: string; headers: Record<string, string> }>;
  /** A presigned GET (LIMITS.uploads.readTtlSeconds). */
  presignGet(key: string): Promise<string>;
  exists(key: string): Promise<boolean>;
}

/** S3-compatible bucket (Railway). Stub: F13 builds it on @aws-sdk/client-s3. */
export function createStorage(env: StorageEnv): Storage {
  return {
    enabled: env.UPLOADS_ENABLED,
    async presignPut() {
      throw notImplemented('Uploads');
    },
    async presignGet() {
      throw notImplemented('Uploads');
    },
    async exists() {
      throw notImplemented('Uploads');
    },
  };
}
