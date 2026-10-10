import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
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
  /** The object's first `bytes` bytes (ranged GET); null when the key does not exist. */
  readStart(key: string, bytes: number): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
  /** Deletes every object under `prefix`; resolves with how many. */
  deletePrefix(prefix: string): Promise<number>;
}

/** Where uploads are served: the site path stored in avatar_url / cover_url / user.image. */
export const MEDIA_PATH = '/api/media/';

/** `<kind>/<userId or spaceId>/<uuid>.<ext>`: the only keys /api/media serves. */
export const MEDIA_KEY_PATTERN =
  /^(?:avatar|space_cover|community_cover|member_avatar)\/[A-Za-z0-9_-]{1,64}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/;

const startsWith = (bytes: Uint8Array, at: number, sig: readonly number[]) =>
  sig.every((value, i) => bytes[at + i] === value);
const ascii = (text: string) => [...text].map((c) => c.charCodeAt(0));

/** JPEG, PNG or WebP by magic bytes (needs the first 12). */
export function isImageBytes(bytes: Uint8Array): boolean {
  return (
    startsWith(bytes, 0, [0xff, 0xd8, 0xff]) ||
    startsWith(bytes, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) ||
    (startsWith(bytes, 0, ascii('RIFF')) && startsWith(bytes, 8, ascii('WEBP')))
  );
}

/**
 * Why an uploaded image URL may not be stored, or null when it may. Only `/api/media/<key>` URLs
 * are checked (other URLs keep their schema rules): the key must be a server-made one and the
 * object's first 16 bytes must be a JPEG, PNG or WebP. The browser declared the type at presign
 * time, so the bytes are what is trusted here; an object that fails is deleted.
 * ponytail: magic bytes only, no decode/re-encode; add a sharp re-encode if polyglots matter.
 */
export async function mediaImageProblem(storage: Storage, url: unknown): Promise<string | null> {
  if (typeof url !== 'string' || !url.startsWith(MEDIA_PATH)) return null;
  const key = url.slice(MEDIA_PATH.length);
  if (!MEDIA_KEY_PATTERN.test(key)) return 'That image link is not an upload';
  if (!storage.enabled) return 'Image uploads are turned off';
  const head = await storage.readStart(key, 16);
  if (!head) return 'That upload was not found. Upload the image again.';
  if (isImageBytes(head)) return null;
  await storage.delete(key);
  return 'That file is not a JPEG, PNG or WebP image';
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
    return {
      enabled: false,
      presignPut: off,
      presignGet: off,
      exists: off,
      readStart: off,
      delete: off,
      deletePrefix: off,
    };
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
    async readStart(key, bytes) {
      try {
        const res = await client.send(
          new GetObjectCommand({ Bucket, Key: key, Range: `bytes=0-${bytes - 1}` }),
        );
        return res.Body ? await res.Body.transformToByteArray() : new Uint8Array();
      } catch (error) {
        const meta = (error as { $metadata?: { httpStatusCode?: number } }).$metadata;
        if (meta?.httpStatusCode === 404) return null;
        // An empty object has no byte 0: not an image.
        if (meta?.httpStatusCode === 416) return new Uint8Array();
        throw error;
      }
    },
    async delete(key) {
      await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
    },
    // ponytail: one DeleteObject per key (DeleteObjects needs Content-MD5 some S3 clones reject);
    // a user holds a handful of images.
    async deletePrefix(prefix) {
      let deleted = 0;
      let ContinuationToken: string | undefined;
      do {
        const page = await client.send(
          new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken }),
        );
        for (const { Key } of page.Contents ?? []) {
          if (!Key) continue;
          await client.send(new DeleteObjectCommand({ Bucket, Key }));
          deleted += 1;
        }
        ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (ContinuationToken);
      return deleted;
    },
  };
}
