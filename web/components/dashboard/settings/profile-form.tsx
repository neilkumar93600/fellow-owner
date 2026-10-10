'use client';

import {
  LIMITS,
  PLATFORM_LABELS,
  PLATFORMS,
  type Platform,
  type PlatformEntry,
  platformEntrySchema,
  type StudioSpace,
  spaceProfileSchema,
} from '@fellow-owners/shared';
import { Check, Globe, Plus, Trash2 } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';
import { PlatformIcon } from '@/components/auth/platform-icons';
import { ImageUpload } from '@/components/shared/image-upload';
import { Button } from '@/components/ui/button';
import { Field, NativeSelect, TextArea, TextField } from '@/components/ui/field';
import { useUpdateSettings } from '@/hooks/queries/use-settings';
import { formatCompact, pluralize } from '@/lib/format';
import { toastSuccess } from '@/lib/toast';

/** The first message for each field path ("displayName", "promote.2"). */
export function issuesByPath(issues: readonly { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const issue of issues) out[issue.path.map(String).join('.')] ??= issue.message;
  return out;
}

export function PlatformMark({ platform }: { platform: Platform }) {
  return platform === 'other' ? (
    <Globe aria-hidden="true" strokeWidth={1.5} className="size-5 shrink-0 text-ink" />
  ) : (
    <PlatformIcon platform={platform} />
  );
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
        className="col-span-12 flex min-w-0 flex-col gap-6 glass-strong rounded-panel p-6 @4xl:col-span-7"
      >
        <div>
          <h2 id="profile-title" className="text-h2 text-ink">
            Profile
          </h2>
          <p className="mt-1 text-small text-ink-muted">
            Fans see this at the top of your bio link and beside your replies.
          </p>
        </div>

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
      </form>

      <SocialAccounts
        platforms={platforms}
        error={errors.platforms}
        onChange={(next) => {
          setPlatforms(next);
          setErrors(({ platforms: _, ...rest }) => rest);
        }}
      />
    </div>
  );
}

const FIELD_ERRORS = { platform: '', url: '', followers: '' };

function SocialAccounts({
  platforms,
  error,
  onChange,
}: {
  platforms: PlatformEntry[];
  error?: string;
  onChange: (platforms: PlatformEntry[]) => void;
}) {
  const unused = PLATFORMS.find((p) => !platforms.some((entry) => entry.platform === p)) ?? 'other';
  const [platform, setPlatform] = useState<Platform>(unused);
  const [url, setUrl] = useState('');
  const [followers, setFollowers] = useState('');
  const [fieldErrors, setFieldErrors] = useState(FIELD_ERRORS);
  const full = platforms.length >= LIMITS.space.platforms.max;

  const add = () => {
    const result = platformEntrySchema.safeParse({
      platform,
      url,
      followers: followers.trim() === '' ? Number.NaN : Number(followers.replace(/[\s,]/g, '')),
    });
    if (!result.success) {
      setFieldErrors({ ...FIELD_ERRORS, ...issuesByPath(result.error.issues) });
      return;
    }
    const next = [...platforms, result.data];
    onChange(next);
    setUrl('');
    setFollowers('');
    setFieldErrors(FIELD_ERRORS);
    setPlatform(PLATFORMS.find((p) => !next.some((entry) => entry.platform === p)) ?? 'other');
    toastSuccess(`${PLATFORM_LABELS[result.data.platform]} added. Save your profile to keep it.`);
  };

  return (
    <section
      aria-labelledby="social-title"
      className="col-span-12 flex min-w-0 flex-col gap-4 glass-strong rounded-panel p-6 @4xl:col-span-5"
    >
      <div>
        <h2 id="social-title" className="text-h2 text-ink">
          Connected social accounts
        </h2>
        <p className="mt-1 text-small text-ink-muted">
          Follower counts show as chips on your bio link.
        </p>
      </div>

      {platforms.length > 0 ? (
        <ul className="divide-y divide-line-row">
          {platforms.map((entry, index) => (
            <li
              key={`${entry.platform}-${entry.url}`}
              className="flex min-h-16 items-center gap-3 py-2"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-table-head">
                <PlatformMark platform={entry.platform} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-small-strong text-ink">
                  {PLATFORM_LABELS[entry.platform]}
                </span>
                <span className="truncate text-small text-ink-muted">
                  {entry.url.replace(/^https?:\/\//, '')}
                </span>
              </span>
              <span className="shrink-0 text-small text-ink-soft">
                <span className="tabular-nums">{formatCompact(entry.followers)}</span>{' '}
                {pluralize(entry.followers, 'follower')}
              </span>
              <Button
                variant="ghost"
                surface="white"
                className="text-ink-soft"
                aria-label={`Remove ${PLATFORM_LABELS[entry.platform]}`}
                onClick={() => onChange(platforms.filter((_, i) => i !== index))}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body text-ink">
          No accounts yet. Add one so fans see where else to find you.
        </p>
      )}
      {error ? <p className="text-small text-danger-deep">{error}</p> : null}

      <div className="flex flex-col gap-4 border-t border-line-row pt-4">
        <h3 className="text-label-strong text-ink">Add an account</h3>
        <div className="grid gap-4 @lg:grid-cols-[10rem_minmax(0,1fr)]">
          <Field label="Platform" disabled={full}>
            <NativeSelect
              value={platform}
              onChange={(event) => setPlatform(event.target.value as Platform)}
            >
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {PLATFORM_LABELS[p]}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Profile link" error={fieldErrors.url} disabled={full}>
            <TextField
              type="url"
              inputMode="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://tiktok.com/@miralane"
            />
          </Field>
        </div>
        <Field label="Followers" error={fieldErrors.followers} disabled={full}>
          <TextField
            inputMode="numeric"
            value={followers}
            onChange={(event) => setFollowers(event.target.value)}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button
            variant="secondary"
            icon={<Plus />}
            disabled={full}
            aria-describedby={full ? 'social-full' : undefined}
            onClick={add}
          >
            Add account
          </Button>
          {full ? (
            <p id="social-full" className="text-small text-ink-muted">
              Up to {LIMITS.space.platforms.max} accounts. Remove one to add another.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
