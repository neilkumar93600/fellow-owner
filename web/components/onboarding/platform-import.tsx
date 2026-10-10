'use client';

import { LIMITS, type PlatformProfile } from '@fellow-owners/shared';
import { Check, CircleAlert, Download, Info } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { PlatformIcon } from '@/components/auth/platform-icons';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { ApiError } from '@/lib/fetcher';
import { getSetupSuggestions, lookupPlatform } from '@/lib/platform-client';
import styles from './onboarding.module.css';
import {
  CharCount,
  cx,
  FieldError,
  FieldLabel,
  inputClass,
  Spinner,
  textareaClass,
} from './onboarding-fields';
import {
  EMPTY_IMPORT,
  formatCompact,
  type ImportState,
  LOOKUP_LABELS,
  type LookupEntry,
  type LookupFailure,
  linksIn,
  loadImport,
  lookupPlatformOf,
  type OnboardingValues,
  type PlatformDraft,
  platformList,
  saveImport,
} from './onboarding-templates';

// Platform auto-fetch in onboarding (Round 4 spec §6): paste profile links, one chip per platform,
// lookups in parallel, then setup suggestions for the later steps. Nothing here ever blocks Continue.

export type PlatformImport = ReturnType<typeof usePlatformImport>;

const FAILURE_TEXT: Record<LookupFailure, string> = {
  private: 'This account is private',
  not_found: 'We couldn’t find this profile',
  unavailable: 'We couldn’t read it right now',
  unsupported: 'Use an Instagram, TikTok, YouTube or X profile link',
  busy: 'Too many lookups. Try again in a minute',
};

function failureOf(error: unknown): LookupFailure {
  return error instanceof ApiError && error.status === 429 ? 'busy' : 'unavailable';
}

/** Lives in the stepper, so lookups keep running (and their results stay) while the person moves on. */
export function usePlatformImport() {
  const [state, setState] = useState<ImportState>(EMPTY_IMPORT);
  // State, not a ref: nothing is written back until the saved import is in state, so a first
  // (or Strict Mode's second) effect pass can never overwrite the save with an empty import.
  const [restored, setRestored] = useState(false);
  const suggestAbort = useRef<AbortController | null>(null);
  // Bumped by each paste: an older paste's late answers never overwrite a newer one's chips.
  const generation = useRef(new Map<string, number>());
  // The profiles found so far, by platform: what setup suggestions read.
  const profiles = useRef(new Map<string, PlatformProfile>());

  useEffect(() => {
    const saved = loadImport();
    if (saved) {
      setState(saved);
      for (const e of saved.entries)
        if (e.profile) profiles.current.set(e.profile.platform, e.profile);
    }
    setRestored(true);
  }, []);

  useEffect(() => {
    if (restored) saveImport({ ...state, suggesting: false });
  }, [restored, state]);

  useEffect(() => () => suggestAbort.current?.abort(), []);

  const suggest = useCallback((profiles: PlatformProfile[]) => {
    suggestAbort.current?.abort();
    if (profiles.length === 0) {
      setState((s) => ({ ...s, suggestions: null, suggesting: false }));
      return;
    }
    const controller = new AbortController();
    suggestAbort.current = controller;
    setState((s) => ({ ...s, suggesting: true }));
    getSetupSuggestions(profiles, controller.signal)
      .then((suggestions) => {
        if (controller.signal.aborted) return;
        setState((s) => ({
          ...s,
          suggestions,
          suggesting: false,
          // New suggestions may be poured into the later steps once more.
          applied: { taste: false, communities: false },
        }));
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        // Suggestions are a bonus: the profiles still work without them.
        setState((s) => ({ ...s, suggesting: false }));
      });
  }, []);

  /** Looks up every supported link in the pasted text at once; one platform failing never stops another. */
  const lookup = useCallback(
    async (text: string) => {
      const links = linksIn(text);
      if (links.length === 0) return;
      const fresh: LookupEntry[] = links.map((url) => {
        const platform = lookupPlatformOf(url);
        return platform
          ? { platform, url, status: 'pending' }
          : { platform: null, url, status: 'failed', reason: 'unsupported' };
      });
      // One chip per platform (the last link wins), plus one per unsupported link.
      const byKey = new Map<string, LookupEntry>();
      for (const e of fresh) byKey.set(e.platform ?? e.url, e);
      const batch = [...byKey.values()];
      const keys = new Set(batch.map((e) => e.platform ?? e.url));
      for (const key of keys) generation.current.set(key, (generation.current.get(key) ?? 0) + 1);
      const mine = new Map([...keys].map((k) => [k, generation.current.get(k) ?? 0]));

      let dropped = false;
      for (const key of keys) dropped = profiles.current.delete(key) || dropped;
      setState((s) => ({
        ...s,
        skipped: false,
        used: false,
        entries: [...s.entries.filter((e) => !keys.has(e.platform ?? e.url)), ...batch],
      }));

      const settle = (key: string, next: Partial<LookupEntry>) => {
        if (generation.current.get(key) !== mine.get(key)) return;
        setState((s) => ({
          ...s,
          entries: s.entries.map((e) => ((e.platform ?? e.url) === key ? { ...e, ...next } : e)),
        }));
      };

      const results = await Promise.allSettled(
        batch
          .filter((e) => e.status === 'pending')
          .map(async (e) => {
            const key = e.platform ?? e.url;
            try {
              const result = await lookupPlatform(e.url);
              if (result.status === 'ready') {
                if (generation.current.get(key) === mine.get(key)) {
                  profiles.current.set(key, result.profile);
                }
                settle(key, {
                  status: 'ready',
                  profile: result.profile,
                  reason: undefined,
                });
                return result.profile;
              }
              settle(key, { status: 'failed', reason: result.reason });
            } catch (error) {
              settle(key, { status: 'failed', reason: failureOf(error) });
            }
            return null;
          }),
      );
      // Suggestions read every profile found so far, not only this paste's.
      if (dropped || results.some((r) => r.status === 'fulfilled' && r.value)) {
        suggest([...profiles.current.values()]);
      }
    },
    [suggest],
  );

  const skip = useCallback(() => {
    suggestAbort.current?.abort();
    for (const key of generation.current.keys()) {
      generation.current.set(key, (generation.current.get(key) ?? 0) + 1);
    }
    profiles.current.clear();
    setState({ ...EMPTY_IMPORT, skipped: true });
  }, []);

  const markUsed = useCallback(() => setState((s) => ({ ...s, used: true })), []);
  const markApplied = useCallback(
    (part: 'taste' | 'communities') =>
      setState((s) => ({ ...s, applied: { ...s.applied, [part]: true } })),
    [],
  );

  const ready = state.entries.filter(
    (e): e is LookupEntry & { profile: PlatformProfile } => e.status === 'ready' && !!e.profile,
  );
  /** Suggestions the later steps may use: there are some, and the person did not skip. */
  const offered = state.skipped ? null : state.suggestions;
  const sources = ready.map((e) => e.profile.platform);

  return { state, ready, offered, sources, lookup, skip, markUsed, markApplied };
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

function SampleChip() {
  return (
    <span className="inline-flex h-6 items-center rounded-full border border-line bg-table-head px-2 text-caption font-medium text-ink">
      Sample data
    </span>
  );
}

/** Merges looked-up profiles into the platform rows: same platform replaced, blank rows dropped. */
function mergeRows(rows: PlatformDraft[], profiles: PlatformProfile[]): PlatformDraft[] {
  const imported = profiles.map<PlatformDraft>((p) => ({
    platform: p.platform,
    url: p.profileUrl,
    followers: p.followers ?? Number.NaN,
    handle: p.handle,
    fetchedAt: p.fetchedAt,
  }));
  const kept = rows.filter(
    (r) =>
      (r.url.trim() || Number.isFinite(r.followers)) &&
      !imported.some((i) => i.platform === r.platform),
  );
  return [...imported, ...kept].slice(0, LIMITS.space.platforms.max);
}

const oneLine = (text: string) => text.replace(/\s*\n+\s*/g, ' ').trim();

/**
 * The top of the Platforms step: a paste box, one chip per platform, then the imported profile with
 * "Use this". "Skip, I'll type it" is always on screen; the manual rows below always work.
 */
export function ImportPanel({
  imp,
  onSkip,
}: {
  imp: PlatformImport;
  /** Moves focus to the manual rows. */
  onSkip: () => void;
}) {
  const {
    register,
    getValues,
    setValue,
    control,
    formState: { errors },
  } = useFormContext<OnboardingValues>();
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const { state, ready, sources } = imp;
  const avatarUrl = useWatch({ control, name: 'avatarUrl' });
  const displayName = useWatch({ control, name: 'displayName' }) ?? '';
  const bio = useWatch({ control, name: 'bio' }) ?? '';

  const pending = state.entries.filter((e) => e.status === 'pending');
  const sample = ready.some((e) => e.profile.source === 'simulated');
  const s = state.suggestions;
  const first = ready[0]?.profile;
  const preview = {
    name: s?.displayName ?? first?.displayName ?? displayName,
    bio: s?.bio ?? ready.find((e) => e.profile.bio)?.profile.bio ?? '',
    // Live lookups give expiring CDN links: shown here only, never saved (spec §6 Avatar).
    avatar: s?.avatarUrl ?? first?.avatarUrl ?? null,
  };

  function run(value = text) {
    if (!value.trim()) {
      inputRef.current?.focus();
      return;
    }
    void imp.lookup(value);
    setText('');
  }

  function useThis() {
    if (state.suggesting) return;
    if (preview.name) {
      setValue('displayName', oneLine(preview.name).slice(0, LIMITS.space.displayName.max), {
        shouldDirty: true,
      });
    }
    if (preview.bio) {
      setValue('bio', oneLine(preview.bio).slice(0, LIMITS.space.bio.max), {
        shouldDirty: true,
      });
    }
    // Saved only when the server fetched it (a data: URL) or it is one of our own demo pictures.
    const keep =
      s?.avatarUrl ?? ready.map((e) => e.profile.avatarUrl).find((u) => u?.startsWith('/demo/'));
    if (keep) setValue('avatarUrl', keep, { shouldDirty: true });
    setValue(
      'platforms',
      mergeRows(
        getValues('platforms'),
        ready.map((e) => e.profile),
      ),
      { shouldDirty: true },
    );
    imp.markUsed();
    requestAnimationFrame(() => nameRef.current?.focus());
  }

  const nameField = register('displayName');
  const live = liveText(state);

  return (
    <section
      aria-labelledby="ob-import-title"
      className="rounded-2xl border border-line bg-card p-3 sm:p-4"
    >
      <h2 id="ob-import-title" className="text-body font-medium text-ink">
        Bring in your profiles
      </h2>
      <p id="ob-import-hint" className="mt-0.5 text-small text-ink-muted">
        Paste Instagram, TikTok, YouTube or X links. We read the public profile only.
      </p>

      <div className="mt-3">
        <FieldLabel htmlFor="ob-import-url">Profile links</FieldLabel>
        <div className="mt-1.5 flex gap-2">
          <input
            ref={inputRef}
            id="ob-import-url"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData('text');
              if (!pasted.trim() || text.trim()) return;
              // A paste into the empty box looks up straight away.
              e.preventDefault();
              run(pasted);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                run();
              }
            }}
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="https://instagram.com/yourname"
            aria-describedby="ob-import-hint"
            className={cx(inputClass, 'flex-1')}
          />
          <button
            type="button"
            onClick={() => run()}
            className="btn btn-secondary h-11 shrink-0 px-4"
          >
            Fetch
          </button>
        </div>
      </div>

      {state.entries.length > 0 ? (
        <ul aria-label="Profile lookups" className="mt-3 flex flex-wrap gap-2">
          {state.entries.map((e) => (
            <LookupChip key={e.platform ?? e.url} entry={e} />
          ))}
        </ul>
      ) : null}
      {/* Settled news only, so the region never chatters. */}
      <p role="status" aria-live="polite" className="sr-only">
        {live}
      </p>

      {ready.length > 0 && !state.used ? (
        <div className={cx(styles.stepEnter, 'mt-4 rounded-2xl bg-card-strong p-3 sm:p-4')}>
          <div className="flex items-start gap-3">
            <AvatarInitials name={preview.name || 'You'} image={preview.avatar} size={48} />
            <div className="min-w-0 flex-1">
              <p className="text-body font-medium break-words text-ink">
                {preview.name || 'No name found'}
              </p>
              {preview.bio ? (
                <p className="mt-0.5 line-clamp-3 text-small break-words text-ink-soft">
                  {preview.bio}
                </p>
              ) : null}
              <p className="tabular mt-1 text-small text-ink-soft">
                {ready
                  .filter((e) => e.profile.followers !== null)
                  .map(
                    (e) =>
                      `${LOOKUP_LABELS[e.profile.platform]} ${formatCompact(e.profile.followers ?? 0)}`,
                  )
                  .join(' · ')}
              </p>
            </div>
          </div>
          <ImportedNote sources={sources} sample={sample} className="mt-3" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={useThis}
              aria-busy={state.suggesting || undefined}
              aria-describedby={state.suggesting ? 'ob-import-reading' : undefined}
              className={cx('btn btn-secondary h-11 px-5', state.suggesting && 'cursor-progress')}
            >
              {state.suggesting ? (
                <Spinner />
              ) : (
                <Check aria-hidden strokeWidth={1.5} className="size-4" />
              )}
              Use this
            </button>
            {state.suggesting ? (
              <span id="ob-import-reading" className="text-small text-ink-muted">
                Reading your recent posts
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {state.used ? (
        <div
          className={cx(
            styles.stepEnter,
            'mt-4 flex flex-col gap-4 rounded-2xl bg-card-strong p-3 sm:p-4',
          )}
        >
          <div className="flex items-center gap-3">
            <AvatarInitials name={displayName || 'You'} image={avatarUrl} size={48} />
            <span className="min-w-0 flex-1 text-small text-ink-soft">
              {avatarUrl ? 'Your photo' : 'No photo, initials instead'}
            </span>
            {avatarUrl ? (
              <button
                type="button"
                onClick={() => setValue('avatarUrl', undefined, { shouldDirty: true })}
                className="btn h-11 shrink-0 px-3 text-small text-ink-soft hover:bg-page hover:text-ink"
              >
                Remove photo
              </button>
            ) : null}
          </div>
          <ImportedNote sources={sources} sample={sample} />
          <div>
            <FieldLabel htmlFor="ob-import-name">Display name</FieldLabel>
            <input
              id="ob-import-name"
              {...nameField}
              ref={(el) => {
                nameField.ref(el);
                nameRef.current = el;
              }}
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
              {...register('bio', {
                setValueAs: (v: string) => (v ?? '').replace(/\s*\n+\s*/g, ' '),
              })}
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
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          onClick={() => {
            imp.skip();
            onSkip();
          }}
          className="-mx-1 inline-flex min-h-11 items-center rounded-full px-1 text-small font-medium text-ink underline-offset-4 hover:underline"
        >
          Skip, I’ll type it
        </button>
        {pending.length > 0 ? (
          <span className="text-small text-ink-muted">You can carry on while we look.</span>
        ) : null}
      </div>
    </section>
  );
}

function LookupChip({ entry }: { entry: LookupEntry }) {
  const label = entry.platform ? LOOKUP_LABELS[entry.platform] : 'Link';
  const p = entry.profile;
  return (
    <li
      className={cx(
        'inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border px-3 py-1 text-small',
        entry.status === 'failed'
          ? 'border-line bg-card-strong text-ink-soft'
          : 'border-line bg-card-strong text-ink',
      )}
    >
      {entry.platform ? <PlatformIcon platform={entry.platform} className="size-4" /> : null}
      <span className="font-medium">{label}</span>
      {entry.status === 'pending' ? (
        <>
          <Spinner className="size-3.5 text-ink-muted" />
          <span className="text-ink-muted">Looking up</span>
        </>
      ) : entry.status === 'ready' && p ? (
        <>
          <span className="min-w-0 truncate text-ink-soft">@{p.handle}</span>
          {p.followers !== null ? (
            <span className="tabular font-semibold">{formatCompact(p.followers)}</span>
          ) : null}
          {p.source === 'simulated' ? <SampleChip /> : null}
          <Check aria-hidden strokeWidth={2} className="size-3.5 text-success-ink" />
          <span className="sr-only">ready</span>
        </>
      ) : (
        <>
          {entry.reason === 'unsupported' ? (
            <Info aria-hidden strokeWidth={1.5} className="size-3.5 shrink-0 text-ink-muted" />
          ) : (
            <CircleAlert aria-hidden strokeWidth={1.5} className="size-3.5 shrink-0 text-danger" />
          )}
          <span className="min-w-0">{FAILURE_TEXT[entry.reason ?? 'unavailable']}</span>
        </>
      )}
    </li>
  );
}

/** One sentence for the live region, once nothing is pending. */
function liveText(state: ImportState): string {
  const { entries } = state;
  if (entries.length === 0) return '';
  const pending = entries.filter((e) => e.status === 'pending').length;
  if (pending > 0) return `Looking up ${pending} ${pending === 1 ? 'profile' : 'profiles'}.`;
  const parts = entries.map((e) => {
    const label = e.platform ? LOOKUP_LABELS[e.platform] : 'Link';
    if (e.status === 'ready') {
      const sample = e.profile?.source === 'simulated' ? ', sample data' : '';
      return `${label} found${sample}`;
    }
    return `${label}: ${FAILURE_TEXT[e.reason ?? 'unavailable']}`;
  });
  const tail = state.suggesting ? ' Reading your recent posts.' : '';
  return `${parts.join('. ')}.${tail}`;
}
