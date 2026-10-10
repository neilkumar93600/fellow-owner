'use client';

import { LIMITS, usernameSchema } from '@fellow-owners/shared';
import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { HOST } from '@/components/onboarding/onboarding-templates';
import { useDebounce } from '@/hooks/use-debounce';
import { checkHandleAvailable } from '@/lib/platform-client';
import styles from './auth.module.css';
import { cx, FOCUS_RING, LINK_HIT_AREA } from './auth-classes';
import { AuthField } from './auth-field';
import { Spinner } from './auth-ui';

// One identity (spec §11): the handle is the page link (fellowowners.app/<handle>) and the sign-in name.
// The form field is still called `username`, because that is what Better Auth stores.

export type UsernameStatus =
  | { state: 'idle' }
  | { state: 'invalid'; message: string }
  | { state: 'checking'; username: string }
  | { state: 'available'; username: string }
  | { state: 'taken'; username: string; reason: 'taken' | 'reserved' }
  /** The check itself failed (offline, API down, rate limited): sign-up will check again. */
  | { state: 'unavailable'; username: string };

interface Verdict {
  available: boolean;
  reason: 'taken' | 'reserved';
  suggestions: string[];
}

/** As typed: lowercase, and only the characters a handle can hold (a leading "@" drops out too). */
export function normalizeUsernameInput(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
}

/** GET /api/handle-available: the verdict, or null when the check itself failed. */
async function fetchVerdict(handle: string, signal: AbortSignal): Promise<Verdict | null> {
  try {
    const res = await checkHandleAvailable(handle, signal);
    if (res.reason === 'invalid') return null;
    return {
      available: res.available,
      reason: res.reason === 'reserved' ? 'reserved' : 'taken',
      suggestions: (res.suggestions ?? []).slice(0, 3),
    };
  } catch {
    return null;
  }
}

/**
 * Live availability for the handle field. Waits 400ms after typing stops, cancels a check that a newer
 * one replaced, and remembers every verdict, so going back to an earlier spelling answers at once. A
 * failed check is not remembered: the next spelling tries again, and sign-up checks for real anyway.
 * A taken handle brings the server's free suggestions (up to three) to pick from.
 */
export function useUsernameStatus(raw: string) {
  const settledValue = useDebounce(raw, 400);
  const verdicts = useRef(new Map<string, Verdict>());
  const [failedFor, setFailedFor] = useState<string | null>(null);
  // Bumped when a verdict lands, so the render below reads the map again.
  const [, setVersion] = useState(0);

  useEffect(() => {
    const parsed = usernameSchema.safeParse(settledValue);
    if (!parsed.success) return;
    const handle = parsed.data;
    if (verdicts.current.has(handle)) return;
    // A fresh check for a handle whose last one failed shows "Checking", not the old failure.
    setFailedFor((f) => (f === handle ? null : f));
    const controller = new AbortController();
    void fetchVerdict(handle, controller.signal).then((verdict) => {
      if (controller.signal.aborted) return;
      if (verdict === null) {
        setFailedFor(handle);
      } else {
        verdicts.current.set(handle, verdict);
        setVersion((v) => v + 1);
      }
    });
    return () => controller.abort();
  }, [settledValue]);

  /** Records the server's answer on sign-up (409 HANDLE_TAKEN or USERNAME_IS_ALREADY_TAKEN). */
  const markTaken = useCallback((handle: string) => {
    const known = verdicts.current.get(handle);
    verdicts.current.set(handle, {
      available: false,
      reason: 'taken',
      suggestions: known?.suggestions ?? [],
    });
    setVersion((v) => v + 1);
  }, []);

  const isTaken = useCallback(
    (handle: string) => verdicts.current.get(handle)?.available === false,
    [],
  );

  let status: UsernameStatus = { state: 'idle' };
  let suggestions: string[] = [];
  if (raw) {
    const parsed = usernameSchema.safeParse(raw);
    if (!parsed.success) {
      // Rules only show once typing pauses, so "At least 3 characters" never chases each keystroke.
      if (raw === settledValue) {
        status = {
          state: 'invalid',
          message: parsed.error.issues[0]?.message ?? '',
        };
      }
    } else {
      const handle = parsed.data;
      const verdict = verdicts.current.get(handle);
      if (verdict?.available) status = { state: 'available', username: handle };
      else if (verdict) {
        status = { state: 'taken', username: handle, reason: verdict.reason };
        suggestions = verdict.suggestions.filter((s) => s !== handle);
      } else if (failedFor === handle && raw === settledValue)
        status = { state: 'unavailable', username: handle };
      else status = { state: 'checking', username: handle };
    }
  }

  return { status, suggestions, markTaken, isTaken };
}

/**
 * "fellowowners.app/" + the handle, with a status line under it (described by, not live, so typing is
 * never interrupted) and a separate polite announcement of settled verdicts only. While the field shows
 * an error the status line steps aside, so the same news is not shown twice.
 */
export function UsernameField({
  registration,
  status,
  suggestions,
  onPick,
  error,
  className,
}: {
  registration: UseFormRegisterReturn<'username'>;
  status: UsernameStatus;
  /** Free handles to offer while the typed one is taken. */
  suggestions: string[];
  onPick: (username: string) => void;
  error?: string;
  className?: string;
}) {
  const statusId = 'username-status';
  const showStatus = !error;
  // Quiet while the field shows an error: that message already says it.
  const announcement = error
    ? ''
    : status.state === 'available'
      ? `${HOST}/${status.username} is free`
      : status.state === 'taken'
        ? `${HOST}/${status.username} is ${status.reason}`
        : '';

  return (
    <div className={className}>
      <AuthField
        id="username"
        label="Handle"
        prefix={`${HOST}/`}
        hint="Your link and how you sign in."
        type="text"
        inputMode="text"
        autoComplete="username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        maxLength={LIMITS.username.max}
        placeholder="yourname"
        error={error}
        invalid={status.state === 'taken'}
        describedBy={showStatus ? statusId : undefined}
        {...registration}
        onChange={(event) => {
          const input = event.target;
          const normalized = normalizeUsernameInput(input.value);
          if (normalized !== input.value) {
            // Keep the caret where it was, minus the characters that just dropped out.
            const caret =
              (input.selectionStart ?? input.value.length) -
              (input.value.length - normalized.length);
            input.value = normalized;
            input.setSelectionRange(Math.max(0, caret), Math.max(0, caret));
          }
          void registration.onChange(event);
        }}
      />
      {showStatus ? <StatusLine id={statusId} status={status} /> : null}
      {suggestions.length ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-small text-ink-muted">Try</span>
          {suggestions.map((username) => (
            <button
              key={username}
              type="button"
              onClick={() => onPick(username)}
              className={cx(
                'h-8 press rounded-full border border-line px-3 text-small font-medium text-ink',
                'transition-colors duration-150 hover:bg-page',
                LINK_HIT_AREA,
                FOCUS_RING,
              )}
            >
              <span className="sr-only">Use </span>
              {username}
            </button>
          ))}
        </div>
      ) : null}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

function StatusLine({ id, status }: { id: string; status: UsernameStatus }) {
  // No idle line (the hint above already says what the handle is): a line shows only with news.
  const row = 'mt-1.5 flex items-start gap-1.5 text-small';
  const icon = {
    'aria-hidden': true,
    size: 16,
    strokeWidth: 1.5,
    className: 'mt-px shrink-0',
  };
  const link = (handle: string) => (
    <>
      {HOST}/<span className="font-medium">{handle}</span>
    </>
  );
  switch (status.state) {
    case 'checking':
      return (
        <p id={id} className={cx(row, 'text-ink-muted')}>
          <span className="grid size-4 shrink-0 place-items-center">
            <Spinner className="size-3.5" />
          </span>
          Checking availability
        </p>
      );
    case 'available':
      return (
        <p id={id} className={cx(row, 'text-success-ink')}>
          <CircleCheck {...icon} />
          <span className="min-w-0 [overflow-wrap:anywhere]">{link(status.username)} is free</span>
        </p>
      );
    case 'taken':
      return (
        <p id={id} className={cx(row, styles.errorText)}>
          <CircleAlert {...icon} className="mt-px shrink-0 text-danger" />
          <span className="min-w-0 [overflow-wrap:anywhere]">
            {link(status.username)} is {status.reason}. Try another.
          </span>
        </p>
      );
    case 'invalid':
      return (
        <p id={id} className={cx(row, 'text-ink-muted')}>
          <Info {...icon} />
          {status.message}
        </p>
      );
    case 'unavailable':
      return (
        <p id={id} className={cx(row, 'text-ink-muted')}>
          <Info {...icon} />
          <span className="min-w-0 [overflow-wrap:anywhere]">
            We’ll check {HOST}/{status.username} when you create your account.
          </span>
        </p>
      );
    default:
      return null;
  }
}
