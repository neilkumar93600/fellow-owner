'use client';

import { clsx } from 'cn';
import { CircleAlert } from 'lucide-react';
import type * as React from 'react';

/**
 * Plain class joining for onboarding. `cn` from lib/utils merges like tailwind-merge and drops the
 * project's custom font sizes (text-small, text-body...) when a text colour sits beside them,
 * so these components join classes without merging and never pass conflicting utilities.
 */
export const cx = clsx;

// Field vocabulary for onboarding (DESIGN.md Inputs / Fields): white, radius 16, 44 high,
// 1px Field Grey border, label above in Small Strong, helper and errors below.

/**
 * Field type: 16px on phones so iOS Safari and in-app webviews (Instagram, TikTok) never zoom the page
 * on focus, the 15px body size from 640px up. Matches the auth fields.
 */
export const fieldText = 'text-[16px] leading-[22px] sm:text-body';

/** Border, fill, type and states shared by every field, without height or padding. */
export const fieldSkin = cx(
  'w-full min-w-0 rounded-lg border border-(--line-field) bg-card-strong',
  fieldText,
  'text-ink placeholder:text-ink-muted',
  'transition-colors duration-150 ease-(--ease-out-quart) hover:border-ink-muted',
  'aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-50',
);

export const inputClass = cx(fieldSkin, 'block h-11 px-3.5');

export const textareaClass = cx(fieldSkin, 'block resize-none px-3.5 py-2.5 leading-[22px]');

export const labelClass = 'block text-small font-medium text-ink';

export function FieldLabel({
  htmlFor,
  id,
  children,
  optional,
  className,
}: {
  htmlFor?: string;
  id?: string;
  children: React.ReactNode;
  optional?: boolean;
  className?: string;
}) {
  return (
    <label htmlFor={htmlFor} id={id} className={cx(labelClass, className)}>
      {children}
      {optional ? <span className="font-normal text-ink-muted"> (optional)</span> : null}
    </label>
  );
}

/** Inline field error: Signal Red icon, Brick Red words, announced politely. Keeps its id mounted. */
export function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p id={id} aria-live="polite" className={cx('text-small', message ? 'mt-1.5' : 'sr-only')}>
      {message ? (
        <span className="flex items-start gap-1.5 text-(--danger-deep)">
          <CircleAlert
            aria-hidden
            strokeWidth={1.5}
            className="mt-px size-4 shrink-0 text-danger"
          />
          <span>{message}</span>
        </span>
      ) : null}
    </p>
  );
}

/** Caption counter: ink-muted, Toffee from 90% of the limit, Brick Red over it. */
export function CharCount({ id, value, max }: { id?: string; value: number; max: number }) {
  const over = value > max;
  const near = !over && value >= max * 0.9;
  return (
    <span
      id={id}
      className={cx(
        'tabular inline-flex items-center gap-1 text-caption',
        over ? 'text-(--danger-deep)' : near ? 'text-warn-ink' : 'text-ink-muted',
      )}
    >
      {over ? <CircleAlert aria-hidden strokeWidth={1.5} className="size-3.5 text-danger" /> : null}
      <span className="sr-only">Characters used: </span>
      {value}/{max}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        'inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent',
        className,
      )}
    />
  );
}

/** Reads a message off an RHF error that may be a plain error, an array error with `root`, or undefined. */
export function errorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as { message?: unknown; root?: { message?: unknown } };
  if (typeof e.message === 'string' && e.message) return e.message;
  if (e.root && typeof e.root.message === 'string') return e.root.message;
  return undefined;
}

/** The error for item `index` of an array field. */
export function itemError(error: unknown, index: number): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  return errorMessage((error as Record<number, unknown>)[index]);
}
