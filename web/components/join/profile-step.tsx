'use client';

import { LIMITS, type LinkInput, linkSchema, skillsSchema } from '@fellow-owners/shared';
import { Plus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { ImageUpload } from '@/components/shared/image-upload';
import { Button } from '@/components/ui/button';
import { Field, TextField } from '@/components/ui/field';
import { useUpdateMe } from '@/hooks/queries/use-me';
import { authClient, useSession } from '@/lib/auth-client';
import { toastError, toastSuccess } from '@/lib/toast';

const { skills: SKILLS, links: LINKS } = LIMITS.membership;

/** A link row; `key` keeps a row's draft and errors with it when an earlier row is removed. */
type LinkRow = LinkInput & { key: number };

/**
 * Join step 3, skippable: skills as removable chips (Enter, a comma or Add; lowercased and deduplicated
 * by the shared schema, 10 at most) and up to five labelled links, then the step's one coral Finish.
 * Every control is 44px or carries a 44px hit area.
 */
export function ProfileStep({ handle, onDone }: { handle: string; onDone: () => void }) {
  const [skills, setSkills] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [skillError, setSkillError] = useState<string>();
  const nextKey = useRef(1);
  const [links, setLinks] = useState<LinkRow[]>([{ key: 0, label: '', url: '' }]);
  const [linkErrors, setLinkErrors] = useState<Record<string, string>>({});
  const updateMe = useUpdateMe(handle);
  const saving = updateMe.isPending;
  const full = skills.length >= SKILLS.max;
  const session = useSession();
  // The photo lives on the account (Better Auth user.image); show a fresh upload before the session refetches.
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const image = photo !== undefined ? photo : (session.data?.user.image ?? null);

  async function savePhoto(url: string | null) {
    const previous = image;
    setPhoto(url);
    const { error } = await authClient.updateUser({ image: url });
    if (error) {
      setPhoto(previous);
      toastError(error, { fallback: 'Could not save your photo. Try again.' });
      return;
    }
    toastSuccess(url ? 'Photo saved' : 'Photo removed');
  }

  /** Adds the typed skill; returns the new list, or null when the schema refuses it. */
  function addSkill(): string[] | null {
    if (!draft.trim()) return skills;
    const parsed = skillsSchema.safeParse([...skills, draft]);
    if (!parsed.success) {
      setSkillError(parsed.error.issues[0]?.message);
      return null;
    }
    setSkills(parsed.data);
    setDraft('');
    setSkillError(undefined);
    return parsed.data;
  }

  function setLink(key: number, patch: Partial<LinkInput>) {
    setLinks((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function finish() {
    const finalSkills = addSkill();
    if (!finalSkills) return;
    const errors: Record<string, string> = {};
    for (const { key, label, url } of links) {
      if (!label.trim() && !url.trim()) continue;
      const parsed = linkSchema.safeParse({ label, url });
      if (parsed.success) continue;
      for (const issue of parsed.error.issues) {
        errors[`${key}.${String(issue.path[0])}`] ??= issue.message;
      }
    }
    setLinkErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const filled = links.filter((link) => link.label.trim() || link.url.trim());
    if (finalSkills.length === 0 && filled.length === 0) {
      onDone();
      return;
    }
    // A failed save toasts from the hook and keeps the fan here with their input.
    updateMe.mutate(
      {
        ...(finalSkills.length > 0 && { skills: finalSkills }),
        ...(filled.length > 0 && { links: filled.map(({ label, url }) => ({ label, url })) }),
      },
      {
        onSuccess: () => {
          toastSuccess('Profile saved');
          onDone();
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <ImageUpload
        kind="member_avatar"
        label="Photo"
        name={session.data?.user.name ?? ''}
        value={image}
        onChange={savePhoto}
      />

      <div className="flex flex-col gap-3">
        <Field
          label="Skills"
          optional
          helper={
            full
              ? `That’s ${SKILLS.max}, the most you can add`
              : `Press Enter after each one. Up to ${SKILLS.max}.`
          }
          error={skillError}
        >
          <div className="flex gap-2">
            <TextField
              value={draft}
              disabled={full}
              placeholder="street food, film photography, Spanish"
              enterKeyHint="enter"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ',') return;
                event.preventDefault();
                addSkill();
              }}
            />
            <Button
              variant="secondary"
              disabled={full || !draft.trim()}
              onClick={addSkill}
              className="h-11"
            >
              Add
            </Button>
          </div>
        </Field>
        {skills.length > 0 ? (
          <ul aria-label="Your skills" className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <li
                key={skill}
                className="inline-flex h-9 items-center gap-1 rounded-full bg-white/70 pr-1 pl-3 text-small text-ink"
              >
                {skill}
                <button
                  type="button"
                  aria-label={`Remove ${skill}`}
                  onClick={() => setSkills((current) => current.filter((s) => s !== skill))}
                  className="press relative grid size-7 place-items-center rounded-full hover:bg-white/80 before:absolute before:-inset-2"
                >
                  <X aria-hidden="true" strokeWidth={1.5} className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <fieldset className="flex min-w-0 flex-col gap-4">
        <legend className="mb-1 text-small-strong text-ink">
          Links <span className="font-normal text-ink-soft">(optional)</span>
        </legend>
        {links.map((link, i) => (
          <fieldset
            key={link.key}
            className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-3 @md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto]"
          >
            <legend className="sr-only">Link {i + 1}</legend>
            <Field
              label="Label"
              error={linkErrors[`${link.key}.label`]}
              className="col-span-2 @md:col-span-1"
            >
              <TextField
                value={link.label}
                placeholder="Instagram"
                maxLength={LIMITS.link.labelMax}
                onChange={(event) => setLink(link.key, { label: event.target.value })}
              />
            </Field>
            <Field label="URL" error={linkErrors[`${link.key}.url`]}>
              <TextField
                type="url"
                inputMode="url"
                value={link.url}
                placeholder="https://instagram.com/you"
                onChange={(event) => setLink(link.key, { url: event.target.value })}
              />
            </Field>
            <Button
              variant="ghost"
              size="icon-fan"
              aria-label={`Remove link ${i + 1}`}
              onClick={() => setLinks((current) => current.filter((row) => row.key !== link.key))}
              className="mt-6"
            >
              <X />
            </Button>
          </fieldset>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="secondary"
            trailingIcon={<Plus />}
            disabled={links.length >= LINKS.max}
            aria-describedby={links.length >= LINKS.max ? 'join-links-cap' : undefined}
            onClick={() =>
              setLinks((current) => [...current, { key: nextKey.current++, label: '', url: '' }])
            }
          >
            Add a link
          </Button>
          {links.length >= LINKS.max ? (
            <p id="join-links-cap" className="text-small text-ink-soft">
              Up to {LINKS.max} links
            </p>
          ) : null}
        </div>
      </fieldset>

      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Button loading={saving} onClick={finish}>
          Finish
        </Button>
        <Button variant="ghost" size="lg" disabled={saving} onClick={onDone}>
          Skip for now
        </Button>
      </div>
    </div>
  );
}
