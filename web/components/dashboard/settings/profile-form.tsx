'use client';

import {
  LIMITS,
  type PlatformEntry,
  type StudioSpace,
  spaceProfileSchema,
} from '@fellow-owners/shared';
import { Check } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';
import { ImageUpload } from '@/components/shared/image-upload';
import { type FansImportView, PlatformConnect } from '@/components/shared/platform-connect';
import { Button } from '@/components/ui/button';
import { Field, TextArea, TextField } from '@/components/ui/field';
import { useImportPlatformFans } from '@/hooks/queries/use-followers';
import { useUpdateSettings } from '@/hooks/queries/use-settings';
import { ApiError } from '@/lib/fetcher';

/** The first message at `path` or under it ("platforms" finds "platforms.1.url"). */
function issueUnder(errors: Record<string, string>, path: string): string | undefined {
  return Object.entries(errors).find(([p]) => p === path || p.startsWith(`${path}.`))?.[1];
}

/** The first message for each field path ("displayName", "promote.2"). */
export function issuesByPath(issues: readonly { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) out[issue.path.map(String).join('.')] ??= issue.message;
  return out;
}

export interface ProfileFormProps {
  space: Pick<
    StudioSpace,
    'displayName' | 'bio' | 'avatarUrl' | 'coverUrl' | 'platforms' | 'showReadReceipts'
  >;
  isPending?: boolean;
}

/**
 * Settings, Profile tab: the profile card (avatar preview, display name, one-line bio) and the connected
 * social accounts card. One Save profile covers both, validated with spaceProfileSchema; wired to the API.
 */
export function ProfileForm({ space, isPending = false }: ProfileFormProps) {
  const { mutate, isPending: isSaving } = useUpdateSettings();
  const [name, setName] = useState(space.displayName);
  const [bio, setBio] = useState(space.bio ?? '');
  const [platforms, setPlatforms] = useState(space.platforms);
  const [avatarUrl, setAvatarUrl] = useState(space.avatarUrl);
  const [coverUrl, setCoverUrl] = useState(space.coverUrl);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const result = spaceProfileSchema.safeParse({
      displayName: name,
      bio: bio.trim() || null,
      avatarUrl,
      coverUrl,
      platforms,
    });
    if (!result.success) {
      setErrors(issuesByPath(result.error.issues));
      return;
    }
    setErrors({});
    mutate({
      profile: {
        displayName: name,
        bio: bio.trim() || null,
        avatarUrl,
        coverUrl,
        platforms,
      },
    });
  };

  return (
    <div className="grid grid-cols-12 items-start gap-5">
      <form
        noValidate
        onSubmit={save}
        aria-labelledby="profile-title"
        className="glass-strong col-span-12 flex min-w-0 flex-col gap-6 rounded-panel p-6 @4xl:col-span-7"
      >
        <div>
          <h2 id="profile-title" className="text-h2 text-ink">
            Profile
          </h2>
          <p className="mt-1 text-small text-ink-muted">
            Fans see this at the top of your bio link and beside your replies.
          </p>
        </div>
        <div className="m-0 flex min-w-0 flex-col gap-6 border-0 p-0">
          <div className="flex flex-col gap-2">
            <ImageUpload
              kind="avatar"
              label="Avatar"
              name={name.trim() || space.displayName}
              value={avatarUrl}
              onChange={setAvatarUrl}
            />
            <p className="text-small text-ink-muted">
              Your initials show until a photo is added. Save your profile to keep the change.
            </p>
          </div>

          <ImageUpload
            kind="space_cover"
            label="Cover image"
            value={coverUrl}
            onChange={setCoverUrl}
          />

          <Field
            label="Display name"
            count={{ value: name.length, max: LIMITS.space.displayName.max }}
            error={errors.displayName}
          >
            <TextField
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
            />
          </Field>

          <Field
            label="One-line bio"
            optional
            helper="Sits under your name on the bio link."
            count={{ value: bio.length, max: LIMITS.space.bio.max }}
            error={errors.bio}
          >
            <TextArea value={bio} onChange={(event) => setBio(event.target.value)} rows={3} />
          </Field>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button type="submit" icon={<Check />} disabled={isSaving || isPending}>
              {isSaving ? 'Saving...' : 'Save profile'}
            </Button>
            <p className="text-small text-ink-muted">Saves your name, bio and social accounts.</p>
          </div>
        </div>
      </form>

      <SocialAccounts
        platforms={platforms}
        saved={space.platforms}
        error={issueUnder(errors, 'platforms')}
        onChange={(next) => {
          setPlatforms(next);
          setErrors(({ platforms: _, ...rest }) => rest);
        }}
      />
    </div>
  );
}

/** A failed "Import fans from comments", in plain words (the card shows it inline). */
function importError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code === 'daily_cap_reached')
      return 'You can import from this platform again tomorrow.';
    if (err.status === 429) return 'Too many imports at once. Try again in a minute.';
    if (err.code === 'validation_error')
      return 'This link isn’t a profile we can read comments from.';
  }
  return 'We couldn’t import fans right now. Try again in a moment.';
}

/**
 * The platform cards: paste a link and it fetches; Refresh and "Import fans from comments" on saved
 * Instagram, TikTok and YouTube profiles (the import reads the saved link, so a new one saves first).
 */
function SocialAccounts({
  platforms,
  saved,
  error,
  onChange,
}: {
  platforms: PlatformEntry[];
  saved: PlatformEntry[];
  error?: string;
  onChange: (platforms: PlatformEntry[]) => void;
}) {
  const importFans = useImportPlatformFans();
  const [results, setResults] = useState<Record<string, FansImportView>>({});
  const savedUrls = new Set(saved.map((p) => p.url));
  const importState = Object.fromEntries(
    platforms.map((p) => [
      p.url,
      savedUrls.has(p.url) ? (results[p.url] ?? { status: 'idle' }) : { status: 'unsaved' },
    ]),
  ) as Record<string, FansImportView>;

  const onImportFans = (entry: PlatformEntry) => {
    const set = (view: FansImportView) => setResults((r) => ({ ...r, [entry.url]: view }));
    set({ status: 'pending' });
    importFans
      .mutateAsync({ url: entry.url })
      .then(set, (err: unknown) => set({ status: 'error', message: importError(err) }));
  };

  return (
    <section
      aria-labelledby="social-title"
      className="glass-strong col-span-12 flex min-w-0 flex-col gap-5 rounded-panel p-6 @4xl:col-span-5"
    >
      <div>
        <h2 id="social-title" className="text-h2 text-ink">
          Connected social accounts
        </h2>
        <p className="mt-1 text-small text-ink-muted">
          Follower counts show as chips on your bio link. Save your profile to keep changes.
        </p>
      </div>
      <PlatformConnect
        value={platforms}
        onChange={onChange}
        refresh
        onImportFans={onImportFans}
        importState={importState}
      />
      {error ? <p className="text-small text-danger-deep">{error}</p> : null}
    </section>
  );
}
