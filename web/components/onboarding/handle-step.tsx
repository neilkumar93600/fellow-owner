'use client';

import { handleSchema, isReservedHandle, LIMITS } from '@fellow-owners/shared';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { checkHandle } from '@/api/studio';
import { useDebounce } from '@/hooks/use-debounce';
import styles from './onboarding.module.css';
import {
  CharCount,
  cx,
  FieldError,
  FieldLabel,
  fieldSkin,
  inputClass,
  Spinner,
  textareaClass,
} from './onboarding-fields';
import {
  type HandleStatus,
  HOST,
  normalizeHandleInput,
  type OnboardingValues,
} from './onboarding-templates';

const CHECK_DELAY_MS = 400;

function localProblem(handle: string): string | null {
  const parsed = handleSchema.safeParse(handle);
  if (parsed.success) return null;
  return parsed.error.issues[0]?.message ?? 'Use lowercase letters, numbers, _ and .';
}

/** A few nearby handles for a reserved word, used only when the API cannot suggest any. */
function fallbackSuggestions(handle: string): string[] {
  return [`${handle}hq`, `the${handle}`, `${handle}.official`]
    .filter((h) => h.length <= LIMITS.handle.max && !localProblem(h))
    .slice(0, 3);
}

/**
 * Live availability for the handle field: debounced, aborts stale requests, caches answers.
 * If the API can't be reached the status is "unavailable", which never blocks the flow:
 * the server confirms the handle when the space is created.
 */
export function useHandleAvailability(handle: string) {
  const debounced = useDebounce(handle, CHECK_DELAY_MS);
  const cache = useRef(new Map<string, HandleStatus>());
  const [status, setStatus] = useState<HandleStatus>({ state: 'idle' });

  useEffect(() => {
    const h = debounced;
    if (!h) {
      setStatus({ state: 'idle' });
      return;
    }
    const problem = localProblem(h);
    const reserved = isReservedHandle(h);
    if (problem && !reserved) {
      setStatus({ state: 'invalid', message: problem });
      return;
    }
    const cached = cache.current.get(h);
    if (cached) {
      setStatus(cached);
      return;
    }
    const controller = new AbortController();
    setStatus({ state: 'checking', handle: h });
    checkHandle(h, controller.signal)
      .then((res) => {
        const next: HandleStatus = res.available
          ? { state: 'available', handle: h }
          : res.reason === 'invalid'
            ? { state: 'invalid', message: 'Use lowercase letters, numbers, _ and .' }
            : {
                state: 'taken',
                handle: h,
                reason: res.reason === 'reserved' ? 'reserved' : 'taken',
                suggestions: (res.suggestions ?? []).slice(0, 3),
              };
        cache.current.set(h, next);
        setStatus(next);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setStatus(
          reserved
            ? { state: 'taken', handle: h, reason: 'reserved', suggestions: fallbackSuggestions(h) }
            : { state: 'unavailable', handle: h },
        );
      });
    return () => controller.abort();
  }, [debounced]);

  /** Records a server verdict (handle_taken on create) so the field shows it straight away. */
  const markTaken = useCallback((h: string, suggestions: string[]) => {
    const next: HandleStatus = {
      state: 'taken',
      handle: h,
      reason: 'taken',
      suggestions: suggestions.slice(0, 3),
    };
    cache.current.set(h, next);
    setStatus(next);
  }, []);

  // While the person is still typing a well-formed handle, show "checking" instead of a stale verdict.
  const typing = handle !== debounced;
  let current: HandleStatus = status;
  if (!handle) current = { state: 'idle' };
  else if (typing && !localProblem(handle)) current = { state: 'checking', handle };
  else if (typing) current = { state: 'idle' };
  else if ('handle' in status && status.handle !== handle) current = { state: 'checking', handle };

  return { status: current, markTaken };
}

export function HandleStep({
  status,
  handleInputRef,
}: {
  status: HandleStatus;
  handleInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<OnboardingValues>();
  const bio = watch('bio') ?? '';
  const handleError = errors.handle?.message;
  // A "taken" error is shown by the status line, which also carries the suggestions.
  const statusCarriesError = errors.handle?.type === 'taken' && status.state === 'taken';
  const fieldErrorText = statusCarriesError ? undefined : handleError;
  const handleField = register('handle', {
    setValueAs: (v: string) => normalizeHandleInput(v ?? ''),
  });

  const takenHere = status.state === 'taken';

  function pickSuggestion(s: string) {
    setValue('handle', s, { shouldDirty: true, shouldValidate: Boolean(handleError) });
    handleInputRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <FieldLabel htmlFor="ob-handle">Handle</FieldLabel>
        <div className="mt-1.5">
          <div
            data-invalid={handleError || takenHere ? 'true' : undefined}
            className={cx(
              fieldSkin,
              styles.handleBox,
              'flex h-11 items-center data-[invalid=true]:border-danger',
            )}
          >
            <span
              aria-hidden
              className="flex h-full shrink-0 items-center rounded-l-[15px] border-r border-line bg-page px-3 text-body text-ink-soft select-none"
            >
              <span className="hidden sm:inline">{HOST}</span>/
            </span>
            <input
              id="ob-handle"
              {...handleField}
              ref={(el) => {
                handleField.ref(el);
                handleInputRef.current = el;
              }}
              onChange={(e) => {
                const input = e.target;
                const normalized = normalizeHandleInput(input.value);
                if (normalized !== input.value) {
                  const caret =
                    (input.selectionStart ?? input.value.length) -
                    (input.value.length - normalized.length);
                  input.value = normalized;
                  input.setSelectionRange(Math.max(0, caret), Math.max(0, caret));
                }
                void handleField.onChange(e);
              }}
              type="text"
              inputMode="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              maxLength={LIMITS.handle.max}
              placeholder="yourname"
              aria-invalid={handleError || takenHere ? true : undefined}
              aria-describedby="ob-handle-status ob-handle-error"
              className={cx(
                styles.bareInput,
                'h-full min-w-0 flex-1 rounded-r-lg bg-transparent px-3 text-body text-ink outline-none placeholder:text-ink-muted',
              )}
            />
          </div>
        </div>
        <HandleStatusLine
          status={status}
          hidden={Boolean(fieldErrorText)}
          onPick={pickSuggestion}
        />
        <FieldError id="ob-handle-error" message={fieldErrorText} />
      </div>

      <div>
        <FieldLabel htmlFor="ob-name">Display name</FieldLabel>
        <input
          id="ob-name"
          {...register('displayName')}
          type="text"
          autoComplete="name"
          maxLength={LIMITS.space.displayName.max + 20}
          placeholder="Mira Kapoor"
          aria-invalid={errors.displayName ? true : undefined}
          aria-describedby="ob-name-error"
          className={cx(inputClass, 'mt-1.5')}
        />
        <FieldError id="ob-name-error" message={errors.displayName?.message} />
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <FieldLabel htmlFor="ob-bio" optional>
            One-line bio
          </FieldLabel>
          <CharCount id="ob-bio-count" value={bio.length} max={LIMITS.space.bio.max} />
        </div>
        <textarea
          id="ob-bio"
          {...register('bio', { setValueAs: (v: string) => (v ?? '').replace(/\s*\n+\s*/g, ' ') })}
          rows={2}
          placeholder="Building in public, lifting heavy, shipping weekly."
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          aria-invalid={errors.bio ? true : undefined}
          aria-describedby="ob-bio-count ob-bio-error"
          className={cx(textareaClass, 'mt-1.5 min-h-[72px]')}
        />
        <FieldError id="ob-bio-error" message={errors.bio?.message} />
      </div>
    </div>
  );
}

function HandleStatusLine({
  status,
  hidden,
  onPick,
}: {
  status: HandleStatus;
  hidden: boolean;
  onPick: (handle: string) => void;
}) {
  let body: React.ReactNode = null;
  switch (status.state) {
    case 'idle':
      body = (
        <span className="text-ink-muted">
          3 to 30 characters: lowercase letters, numbers, _ and .
        </span>
      );
      break;
    case 'invalid':
      body = (
        <>
          <Info aria-hidden strokeWidth={1.5} className="mt-px size-4 shrink-0 text-ink-muted" />
          <span className="text-ink-muted">{status.message}</span>
        </>
      );
      break;
    case 'checking':
      body = (
        <>
          <Spinner className="mt-px size-3.5 text-ink-muted" />
          <span className="text-ink-muted">Checking /{status.handle}</span>
        </>
      );
      break;
    case 'available':
      body = (
        <>
          <CircleCheck
            aria-hidden
            strokeWidth={1.5}
            className="mt-px size-4 shrink-0 text-success-ink"
          />
          <span className="font-medium text-success-ink">/{status.handle} is yours</span>
        </>
      );
      break;
    case 'taken':
      body = (
        <>
          <CircleAlert
            aria-hidden
            strokeWidth={1.5}
            className="mt-px size-4 shrink-0 text-danger"
          />
          <span className="text-(--danger-deep)">
            <span className="font-medium">
              {status.reason === 'reserved' ? 'Reserved.' : 'Taken.'}
            </span>{' '}
            {status.suggestions.length > 0
              ? 'Try one of these:'
              : status.reason === 'reserved'
                ? 'Pick another handle.'
                : 'Someone already has this one. Pick another handle.'}
          </span>
        </>
      );
      break;
    case 'unavailable':
      body = (
        <>
          <Info aria-hidden strokeWidth={1.5} className="mt-px size-4 shrink-0 text-ink-muted" />
          <span className="text-ink-muted">We'll confirm /{status.handle} when you finish.</span>
        </>
      );
      break;
  }

  return (
    <div className={cx(hidden && 'sr-only')}>
      <p
        id="ob-handle-status"
        role="status"
        className="mt-1.5 flex min-h-[18px] items-start gap-1.5 text-small"
      >
        {body}
      </p>
      {status.state === 'taken' && status.suggestions.length > 0 ? (
        <ul aria-label="Suggested handles" className="mt-2.5 flex flex-wrap gap-2">
          {status.suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => onPick(s)}
                className={cx(
                  styles.press,
                  'inline-flex h-11 items-center rounded-full border border-line bg-card-strong px-4 text-small font-medium text-ink hover:bg-page sm:h-9',
                )}
              >
                <span className="sr-only">Use </span>/{s}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
