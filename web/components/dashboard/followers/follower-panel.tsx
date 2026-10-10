'use client';

import {
  type CreateFollowerInput,
  createFollowerSchema,
  type Follower,
  LIMITS,
  PLATFORM_LABELS,
  PLATFORMS,
  type StudioCommunity,
  type UpdateFollowerInput,
  updateFollowerSchema,
} from '@fellow-owners/shared';
import { Trash2 } from 'lucide-react';
import type * as React from 'react';
import { useId, useState } from 'react';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { SidePanel } from '@/components/shared/side-panel';
import { Button } from '@/components/ui/button';
import { Field, InputGroup, NativeSelect, TextArea, TextField } from '@/components/ui/field';
import { formatDate } from '@/lib/format';
import { AiMark } from './follower-chips';

const F = LIMITS.follower;

type Values = Record<'name' | 'handle' | 'platform' | 'email' | 'note', string>;
type Errors = Partial<Record<keyof Values | 'communityIds', string>>;

function initialValues(follower: Follower | null): Values {
  return {
    name: follower?.name ?? '',
    handle: follower?.handle ?? '',
    platform: follower?.platform ?? '',
    email: follower?.email ?? '',
    note: follower?.note ?? '',
  };
}

/** The first message per field from a failed parse. */
function issuesByField(issues: { path: PropertyKey[]; message: string }[]): Errors {
  const errors: Errors = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? 'name') as keyof Errors;
    errors[key] ??= issue.message;
  }
  return errors;
}

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((id) => b.includes(id));

export type FollowerSave =
  | { kind: 'create'; input: CreateFollowerInput }
  | { kind: 'update'; id: string; patch: UpdateFollowerInput };

function FollowerForm({
  id,
  follower,
  communities,
  onSubmit,
}: {
  id: string;
  follower: Follower | null;
  communities: StudioCommunity[];
  onSubmit: (save: FollowerSave) => void;
}) {
  const [values, setValues] = useState(() => initialValues(follower));
  const savedIds = follower?.communities.map((c) => c.id) ?? [];
  const [picked, setPicked] = useState(savedIds);
  const [errors, setErrors] = useState<Errors>({});
  const active = communities.filter((c) => !c.archivedAt);
  const aiTagged = new Set(
    follower?.communities.filter((c) => c.taggedBy === 'ai').map((c) => c.id),
  );

  const field = (key: keyof Values) => ({
    value: values[key],
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => setValues((now) => ({ ...now, [key]: event.target.value })),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const blank = (value: string) => value.trim() === '';
    if (!follower) {
      const parsed = createFollowerSchema.safeParse({
        name: values.name,
        handle: blank(values.handle) ? undefined : values.handle,
        platform: values.platform || undefined,
        email: blank(values.email) ? undefined : values.email,
        note: blank(values.note) ? undefined : values.note,
        communityIds: picked.length ? picked : undefined,
      });
      if (!parsed.success) return setErrors(issuesByField(parsed.error.issues));
      setErrors({});
      onSubmit({ kind: 'create', input: parsed.data });
      return;
    }
    // Only what changed, so an untouched AI tag keeps its mark.
    const before = initialValues(follower);
    const patch: Record<string, unknown> = {};
    for (const key of ['name', 'handle', 'platform', 'email', 'note'] as const) {
      if (values[key].trim() === before[key]) continue;
      patch[key] = key === 'name' ? values.name : blank(values[key]) ? null : values[key];
    }
    if (!sameSet(picked, savedIds)) patch.communityIds = picked;
    if (Object.keys(patch).length === 0)
      return onSubmit({ kind: 'update', id: follower.id, patch: {} });
    const parsed = updateFollowerSchema.safeParse(patch);
    if (!parsed.success) return setErrors(issuesByField(parsed.error.issues));
    setErrors({});
    onSubmit({ kind: 'update', id: follower.id, patch: parsed.data });
  }

  const full = picked.length >= F.communitiesPerFollower;

  return (
    <form
      id={id}
      noValidate
      aria-label={follower ? `Edit ${follower.name}` : 'Add follower'}
      onSubmit={submit}
      className="flex flex-col gap-6"
    >
      <Field
        label="Name"
        error={errors.name}
        count={{ value: values.name.length, max: F.name.max }}
      >
        <TextField {...field('name')} autoComplete="off" placeholder="Priya Shah" />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Handle" optional error={errors.handle}>
          <InputGroup leading="@">
            <TextField {...field('handle')} autoComplete="off" spellCheck={false} />
          </InputGroup>
        </Field>
        <Field label="Platform" optional error={errors.platform}>
          <NativeSelect {...field('platform')}>
            <option value="">Not set</option>
            {PLATFORMS.map((platform) => (
              <option key={platform} value={platform}>
                {PLATFORM_LABELS[platform]}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <Field label="Email" optional error={errors.email}>
        <TextField {...field('email')} type="email" autoComplete="off" spellCheck={false} />
      </Field>

      <Field
        label="Note"
        optional
        helper="What they said: a comment, DM or bio. The AI tags from it."
        error={errors.note}
        count={{ value: values.note.length, max: F.note.max }}
      >
        <TextArea {...field('note')} rows={3} />
      </Field>

      {active.length ? (
        <fieldset className="flex flex-col gap-1">
          <legend className="text-small-strong text-ink">Communities</legend>
          {active.map((c) => {
            const on = picked.includes(c.id);
            return (
              <label key={c.id} className="flex min-h-11 items-center gap-3 text-body text-ink">
                <input
                  type="checkbox"
                  checked={on}
                  disabled={!on && full}
                  onChange={() =>
                    setPicked((now) => (on ? now.filter((x) => x !== c.id) : [...now, c.id]))
                  }
                  className="size-5 shrink-0 accent-ink"
                />
                <span className="min-w-0 truncate">{c.name}</span>
                {on && aiTagged.has(c.id) ? <AiMark /> : null}
              </label>
            );
          })}
          <p aria-live="polite" className="text-small text-ink-soft">
            {errors.communityIds ??
              (full ? `Up to ${F.communitiesPerFollower} communities per follower.` : null)}
          </p>
        </fieldset>
      ) : null}

      {follower ? (
        <p className="text-small text-ink-soft">
          Added {formatDate(follower.createdAt)}
          {follower.joinedAt ? ` · Joined your space ${formatDate(follower.joinedAt)}` : null}
        </p>
      ) : null}
    </form>
  );
}

export interface FollowerPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The follower to edit; null adds one. */
  follower: Follower | null;
  communities: StudioCommunity[];
  /** Resolves once saved and the lists refreshed; rejects (already toasted) to keep the panel open. */
  onSave: (save: FollowerSave) => Promise<unknown>;
  onDelete?: () => void;
  saving?: boolean;
}

/**
 * Add or edit a follower in the side panel: name, handle, platform, email, note and the communities
 * they are tagged into (AI tags marked, unticking one removes it). Edit adds Delete, confirmed.
 */
export function FollowerPanel({
  open,
  onOpenChange,
  follower,
  communities,
  onSave,
  onDelete,
  saving,
}: FollowerPanelProps) {
  const formId = useId();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <SidePanel
        open={open}
        onOpenChange={onOpenChange}
        title={follower ? follower.name : 'Add follower'}
        footer={
          <>
            {follower && onDelete ? (
              <Button variant="destructive" icon={<Trash2 />} onClick={() => setConfirmOpen(true)}>
                Delete
              </Button>
            ) : null}
            <Button type="submit" form={formId} loading={saving} className="flex-1">
              {follower ? 'Save follower' : 'Add follower'}
            </Button>
          </>
        }
      >
        <FollowerForm
          key={follower?.id ?? 'new'}
          id={formId}
          follower={follower}
          communities={communities}
          onSubmit={(save) => {
            if (save.kind === 'update' && Object.keys(save.patch).length === 0) {
              onOpenChange(false);
              return;
            }
            onSave(save).then(
              () => onOpenChange(false),
              () => {}, // the hook toasted the error; keep the form as typed
            );
          }}
        />
      </SidePanel>

      {follower && onDelete ? (
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title={`Delete ${follower.name}?`}
          body="They leave your follower list and its communities. If they joined your space, their membership stays."
          confirmLabel="Delete follower"
          icon={<Trash2 />}
          onConfirm={onDelete}
        />
      ) : null}
    </>
  );
}
