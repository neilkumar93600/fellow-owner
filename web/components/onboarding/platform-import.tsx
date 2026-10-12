'use client';

import {
  LIMITS,
  type Platform,
  type PlatformProfile,
  type SetupSuggestions,
} from '@fellow-owners/shared';
import { Download } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type UseFormReturn, useFormContext, useWatch } from 'react-hook-form';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { SampleChip } from '@/components/shared/platform-connect';
import { getSetupSuggestions } from '@/lib/platform-client';
import {
  CharCount,
  cx,
  FieldError,
  FieldLabel,
  inputClass,
  textareaClass,
} from './onboarding-fields';
import {
  EMPTY_IMPORT,
  type ImportState,
  loadImport,
  type OnboardingValues,
  type PlatformDraft,
  type Prefilled,
  platformList,
  profileKey,
  saveImport,
} from './onboarding-templates';

// Platform auto-fetch in onboarding (Round 4 spec §6, owner request 2026-10-12): every profile a
// platform card fetches feeds the setup suggestions, which fill name, photo and bio (unless the creator
// edited them) and start "What you love" and the communities. Nothing here ever blocks Continue.

export type PlatformImport = ReturnType<typeof usePlatformImport>;

/** Comments on these become fans after the space is created (the API runs it). */
const FAN_PLATFORMS: readonly Platform[] = ['instagram', 'tiktok', 'youtube'];
/** Lookups land a second or so apart: one suggestions call for the lot (10 a day). */
const SUGGEST_DELAY_MS = 1200;

const oneLine = (text: string) => text.replace(/\s*\n+\s*/g, ' ').trim();

/** Lives in the stepper, so the suggestions (and their prefill) carry on while the person moves on. */
export function usePlatformImport({
  form,
  platforms,
  sessionName,
}: {
  form: Pick<UseFormReturn<OnboardingValues, unknown, unknown>, 'getValues' | 'setValue'>;
  platforms: PlatformDraft[];
  /** The name from sign-up fills the name field first; suggestions may replace it. */
  sessionName?: string | null;
}) {
  const [state, setState] = useState<ImportState>(EMPTY_IMPORT);
  // State, not a ref: nothing is written back until the saved import is in state, so a first
  // (or Strict Mode's second) effect pass can never overwrite the save with an empty import.
  const [restored, setRestored] = useState(false);
  const suggestAbort = useRef<AbortController | null>(null);
  const latest = useRef({ form, sessionName, state });
  latest.current = { form, sessionName, state };

  useEffect(() => {
    const saved = loadImport();
    if (saved) setState(saved);
    setRestored(true);
  }, []);

  useEffect(() => {
    if (restored) saveImport({ ...state, suggesting: false });
  }, [restored, state]);

  useEffect(() => () => suggestAbort.current?.abort(), []);

  // Profiles still on the list: a removed platform no longer counts.
  const ready = state.profiles.filter((p) =>
    platforms.some(
      (e) => e.platform === p.platform && e.handle?.toLowerCase() === p.handle.toLowerCase(),
    ),
  );
  const signature = ready.map(profileKey).sort().join(',');
  const readyRef = useRef(ready);
  readyRef.current = ready;

  // A changed set of profiles asks for suggestions again, once the lookups pause.
  useEffect(() => {
    if (!restored || signature === state.suggestedFor) return;
    const timer = window.setTimeout(() => {
      suggestAbort.current?.abort();
      const profiles = readyRef.current;
      if (profiles.length === 0) {
        setState((s) => ({
          ...s,
          suggestions: null,
          suggestedFor: signature,
          suggesting: false,
        }));
        return;
      }
      const controller = new AbortController();
      suggestAbort.current = controller;
      setState((s) => ({ ...s, suggesting: true }));
      getSetupSuggestions(profiles, controller.signal)
        .then((suggestions) => {
          if (controller.signal.aborted) return;
          const prefilled = prefill(suggestions, profiles, latest.current);
          setState((s) => ({
            ...s,
            suggestions,
            suggestedFor: signature,
            suggesting: false,
            prefilled,
            // New suggestions may be poured into the later steps once more.
            applied: { taste: false, communities: false },
          }));
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          // Suggestions are a bonus: the platforms still work without them.
          setState((s) => ({
            ...s,
            suggestedFor: signature,
            suggesting: false,
          }));
        });
    }, SUGGEST_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [restored, signature, state.suggestedFor]);

  const addProfile = useCallback(
    (profile: PlatformProfile) =>
      setState((s) => ({
        ...s,
        profiles: [...s.profiles.filter((p) => profileKey(p) !== profileKey(profile)), profile],
      })),
    [],
  );

  const markApplied = useCallback(
    (part: 'taste' | 'communities') =>
      setState((s) => ({ ...s, applied: { ...s.applied, [part]: true } })),
    [],
  );

  const sampleKeys = new Set(
    state.profiles.filter((p) => p.source === 'simulated').map(profileKey),
  );
  return {
    state,
    ready,
    /** Suggestions the later steps may use, while a profile they came from is still listed. */
    offered: ready.length > 0 ? state.suggestions : null,
    sources: ready.map((p) => p.platform),
    sample: ready.some((p) => p.source === 'simulated'),
    /** Something the suggestions put into name, photo or bio. */
    prefilled: ready.length > 0 && Object.values(state.prefilled).some(Boolean),
    /** A fetched Instagram, TikTok or YouTube profile (not sample data): its commenters become fans. */
    importsFans: platforms.some(
      (e) =>
        e.handle &&
        e.fetchedAt &&
        FAN_PLATFORMS.includes(e.platform) &&
        !sampleKeys.has(profileKey({ platform: e.platform, handle: e.handle })),
    ),
    addProfile,
    markApplied,
  };
}

/**
 * Pours the suggested name, bio and photo into the form, but only into a field that is empty, still
 * holds what an earlier suggestion put there, or (the name) still holds the name from sign-up.
 */
function prefill(
  s: SetupSuggestions,
  profiles: PlatformProfile[],
  {
    form,
    sessionName,
    state,
  }: {
    form: Parameters<typeof usePlatformImport>[0]['form'];
    sessionName?: string | null;
    state: ImportState;
  },
): Prefilled {
  const offer: Prefilled = {
    displayName:
      oneLine(s.displayName ?? profiles[0]?.displayName ?? '').slice(
        0,
        LIMITS.space.displayName.max,
      ) || undefined,
    bio:
      oneLine(s.bio ?? profiles.find((p) => p.bio)?.bio ?? '').slice(0, LIMITS.space.bio.max) ||
      undefined,
    // Saved only when the server fetched it (a data: URL) or it is one of our own demo pictures.
    avatarUrl:
      s.avatarUrl ??
      profiles.map((p) => p.avatarUrl).find((u) => u?.startsWith('/demo/')) ??
      undefined,
  };
  const next: Prefilled = { ...state.prefilled };
  for (const field of ['displayName', 'bio', 'avatarUrl'] as const) {
    const value = offer[field];
    if (!value) continue;
    const current = (form.getValues(field) ?? '').trim();
    const ours =
      !current ||
      current === state.prefilled[field] ||
      (field === 'displayName' && current === sessionName?.trim());
    if (!ours) continue;
    if (current !== value) form.setValue(field, value, { shouldDirty: true });
    next[field] = value;
  }
  return next;
}

/** "Imported from Instagram and YouTube · public profile · edit anything". */
export function ImportedNote({
  sources,
  sample,
  className,
}: {
  sources: PlatformProfile['platform'][];
  sample?: boolean;
  className?: string;
}) {
  if (sources.length === 0) return null;
  return (
    <p className={cx('flex items-start gap-2 text-small text-ink-soft', className)}>
      <Download aria-hidden strokeWidth={1.5} className="mt-px size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        Imported from {platformList(sources)} · public profile · edit anything
        {sample ? (
          <>
            {' '}
            <SampleChip />
          </>
        ) : null}
      </span>
    </p>
  );
}

/**
 * Under the platform cards once the suggestions filled something in: the photo, name and bio they
 * brought, editable right here (the same fields as step 1).
 */
export function ImportedProfile({ imp }: { imp: PlatformImport }) {
  const {
    register,
    setValue,
    control,
    formState: { errors },
  } = useFormContext<OnboardingValues>();
  const avatarUrl = useWatch({ control, name: 'avatarUrl' });
  const displayName = useWatch({ control, name: 'displayName' }) ?? '';
  const bio = useWatch({ control, name: 'bio' }) ?? '';

  return (
    <section
      aria-labelledby="ob-imported-title"
      aria-busy={imp.state.suggesting || undefined}
      className="flex flex-col gap-4 rounded-3xl border border-line bg-white/60 p-4 sm:p-5"
    >
      <h2
        id="ob-imported-title"
        className="font-mono text-caption font-medium tracking-tight text-ink uppercase"
      >
        Your profile
      </h2>
      <div className="flex items-center gap-3">
        <AvatarInitials name={displayName || 'You'} image={avatarUrl} size={48} />
        <span className="min-w-0 flex-1 text-small text-ink-soft">
          {avatarUrl ? 'Your photo' : 'No photo, initials instead'}
        </span>
        {avatarUrl ? (
          <button
            type="button"
            onClick={() => setValue('avatarUrl', undefined, { shouldDirty: true })}
            className="btn btn-secondary h-11 shrink-0 px-4"
          >
            Remove photo
          </button>
        ) : null}
      </div>
      <ImportedNote sources={imp.sources} sample={imp.sample} />
      <div>
        <FieldLabel htmlFor="ob-import-name">Display name</FieldLabel>
        <input
          id="ob-import-name"
          {...register('displayName')}
          type="text"
          autoComplete="name"
          maxLength={LIMITS.space.displayName.max + 20}
          aria-invalid={errors.displayName ? true : undefined}
          aria-describedby="ob-import-name-error"
          className={cx(inputClass, 'mt-1.5')}
        />
        <FieldError id="ob-import-name-error" message={errors.displayName?.message} />
      </div>
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <FieldLabel htmlFor="ob-import-bio" optional>
            One-line bio
          </FieldLabel>
          <CharCount id="ob-import-bio-count" value={bio.length} max={LIMITS.space.bio.max} />
        </div>
        <textarea
          id="ob-import-bio"
          {...register('bio', { setValueAs: (v: string) => oneLine(v ?? '') })}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          aria-invalid={errors.bio ? true : undefined}
          aria-describedby="ob-import-bio-count ob-import-bio-error"
          className={cx(textareaClass, 'mt-1.5 min-h-[96px]')}
        />
        <FieldError id="ob-import-bio-error" message={errors.bio?.message} />
      </div>
    </section>
  );
}
