'use client';

import {
  LIMITS,
  UPLOAD_CONTENT_TYPES,
  type UploadContentType,
  type UploadKind,
} from '@fellow-owners/shared';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { presignUpload, uploadFile } from '@/api/uploads';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/fetcher';

export interface ImageUploadProps {
  kind: UploadKind;
  /** The stored value: a site path (`/api/media/...`), an image URL, or null. */
  value: string | null;
  onChange: (url: string | null) => void;
  /** Required for `community_cover`. */
  communityId?: string;
  label?: string;
  /** Initials shown in an avatar preview until a photo is set. */
  name?: string;
}

const MAX_MB = LIMITS.uploads.maxBytes / 1024 / 1024;

function isAllowedType(type: string): type is UploadContentType {
  return (UPLOAD_CONTENT_TYPES as readonly string[]).includes(type);
}

function messageFor(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'uploads_disabled') return 'Image uploads are not turned on yet.';
    if (error.code === 'upload_failed') return 'The upload failed. Try again.';
    return error.message;
  }
  return 'The upload failed. Try again.';
}

/**
 * Pick an image and upload it to the bucket (presign, then PUT straight to the bucket). `onChange` gets
 * the `/api/media/<key>` path to store; the parent saves it with its own form. JPEG, PNG or WebP, up to 5 MB.
 */
export function ImageUpload({
  kind,
  value,
  onChange,
  communityId,
  label,
  name = '',
}: ImageUploadProps) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const isAvatar = kind === 'avatar' || kind === 'member_avatar';
  const noun = isAvatar ? 'photo' : 'cover image';

  async function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!isAllowedType(file.type)) {
      setError('Use a JPEG, PNG or WebP image.');
      return;
    }
    if (file.size > LIMITS.uploads.maxBytes) {
      setError(`Up to ${MAX_MB} MB.`);
      return;
    }
    setError(undefined);
    setBusy(true);
    try {
      const presigned = await presignUpload({
        kind,
        contentType: file.type,
        size: file.size,
        ...(communityId ? { communityId } : {}),
      });
      onChange(await uploadFile(file, presigned));
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {label ? <p className="text-small-strong text-ink">{label}</p> : null}
      <div className={isAvatar ? 'flex items-center gap-4' : 'flex flex-col gap-3'}>
        {isAvatar ? (
          <AvatarInitials name={name || '?'} image={value} size={96} />
        ) : (
          <div className="glass relative aspect-16/6 w-full max-w-md overflow-hidden">
            {value ? (
              // biome-ignore lint/performance/noImgElement: uploads come from the bucket, not next/image remotePatterns
              <img src={value} alt="" className="absolute inset-0 size-full object-cover" />
            ) : (
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[linear-gradient(135deg,#ffd9c2,#dccff7_55%,#bfddf7)]"
              />
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={input}
            id={inputId}
            type="file"
            accept={UPLOAD_CONTENT_TYPES.join(',')}
            onChange={pick}
            className="sr-only"
            tabIndex={-1}
            aria-label={label ?? `Choose a ${noun}`}
          />
          <Button
            variant="secondary"
            icon={<ImagePlus />}
            loading={busy}
            onClick={() => input.current?.click()}
          >
            {value ? `Change ${noun}` : `Add a ${noun}`}
          </Button>
          {value && !busy ? (
            <Button
              variant="ghost"
              surface="white"
              className="text-ink-soft"
              aria-label={`Remove ${noun}`}
              onClick={() => {
                setError(undefined);
                onChange(null);
              }}
            >
              <Trash2 />
            </Button>
          ) : null}
        </div>
      </div>
      <p className="text-small text-ink-muted">JPEG, PNG or WebP, up to {MAX_MB} MB.</p>
      {error ? (
        <p role="alert" className="text-small text-danger-deep">
          {error}
        </p>
      ) : null}
    </div>
  );
}
