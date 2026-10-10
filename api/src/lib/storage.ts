import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { LIMITS, type UploadContentType } from '@fellow-owners/shared';
import type { Env } from '../config/env.js';

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

/**
 * S3-compatible bucket (Railway). The SDK default (virtual-hosted style) is kept on purpose:
 * buckets created now are served that way, so `forcePathStyle` stays unset.
 */
export function createStorage(env: StorageEnv): Storage {
  const { BUCKET_ENDPOINT, BUCKET_NAME, BUCKET_ACCESS_KEY_ID, BUCKET_SECRET_ACCESS_KEY } = env;
  if (
    !env.UPLOADS_ENABLED ||
    !BUCKET_ENDPOINT ||
    !BUCKET_NAME ||
    !BUCKET_ACCESS_KEY_ID ||
    !BUCKET_SECRET_ACCESS_KEY
  ) {
    const off = async (): Promise<never> => {
      throw new Error('Uploads are not configured');
    };
    return { enabled: false, presignPut: off, presignGet: off, exists: off };
  }

  const client = new S3Client({
    endpoint: BUCKET_ENDPOINT,
    region: env.BUCKET_REGION,
    credentials: { accessKeyId: BUCKET_ACCESS_KEY_ID, secretAccessKey: BUCKET_SECRET_ACCESS_KEY },
  });
  const Bucket = BUCKET_NAME;

  return {
    enabled: true,
    async presignPut(key, contentType, size) {
      const url = await getSignedUrl(
        client,
        new PutObjectCommand({ Bucket, Key: key, ContentType: contentType, ContentLength: size }),
        {
          expiresIn: LIMITS.uploads.urlTtlSeconds,
          // The browser must send exactly the declared type and size.
          signableHeaders: new Set(['content-type', 'content-length']),
        },
      );
      return { url, headers: { 'Content-Type': contentType } };
    },
    presignGet(key) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket, Key: key }), {
        expiresIn: LIMITS.uploads.readTtlSeconds,
      });
    },
    async exists(key) {
      try {
        await client.send(new HeadObjectCommand({ Bucket, Key: key }));
        return true;
      } catch (error) {
        const meta = (error as { $metadata?: { httpStatusCode?: number } }).$metadata;
        if (meta?.httpStatusCode === 404) return false;
        throw error;
      }
    },
  };
}
