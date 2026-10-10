import type { PresignedUpload, PresignUploadInput } from '@fellow-owners/shared';
import { ApiError, apiFetch } from '@/lib/fetcher';

// Typed client for image uploads. The bytes go straight to the bucket; the API only signs the URL.

/** POST /api/uploads/presign : 503 `uploads_disabled` when no bucket is configured. */
export function presignUpload(input: PresignUploadInput): Promise<PresignedUpload> {
  return apiFetch<PresignedUpload>('/api/uploads/presign', {
    method: 'POST',
    json: input,
  });
}

/**
 * PUTs `file` to the presigned URL with exactly the declared headers, then returns the site path
 * to store (`/api/media/<key>`).
 */
export async function uploadFile(file: File, presigned: PresignedUpload): Promise<string> {
  let response: Response;
  try {
    response = await fetch(presigned.uploadUrl, {
      method: presigned.method,
      headers: presigned.headers,
      body: file,
    });
  } catch {
    throw new ApiError(0, 'network_error', 'Network error. Check your connection and try again.');
  }
  if (!response.ok) throw new ApiError(response.status, 'upload_failed', 'The upload failed.');
  return presigned.url;
}
