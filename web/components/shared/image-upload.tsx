import type { UploadKind } from '@fellow-owners/shared';

export interface ImageUploadProps {
  kind: UploadKind;
  /** The stored value: a site path (`/api/media/...`), an image URL, or null. */
  value: string | null;
  onChange: (url: string | null) => void;
  /** Required for `community_cover`. */
  communityId?: string;
  label?: string;
}

/** Pick an image and upload it to the bucket (presign, then PUT). Filled in by F13. */
export function ImageUpload(_props: ImageUploadProps): null {
  return null;
}
