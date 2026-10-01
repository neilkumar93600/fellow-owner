'use client';

import { CircleAlert, RotateCw } from 'lucide-react';
import type * as React from 'react';

import styles from './auth.module.css';
import { cx, FOCUS_RING } from './auth-classes';

export { FOCUS_RING, TEXT_LINK } from './auth-classes';

/** Every auth screen shares one column width, so switching screens never shifts the form. */
export function AuthColumn({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cx('mx-auto w-full max-w-[400px]', className)}>{children}</div>;
}

export function AuthHeading({
  title,
  children,
  headingRef,
}: {
  title: string;
  children?: React.ReactNode;
  headingRef?: React.Ref<HTMLHeadingElement>;
}) {
  return (
    <header>
      <h1
        ref={headingRef}
        tabIndex={headingRef ? -1 : undefined}
        className="text-display tracking-[-0.01em] text-ink outline-none"
      >
        {title}
      </h1>
      {children ? (
        <p className="mt-2 text-body text-pretty text-ink-soft [overflow-wrap:anywhere]">
          {children}
        </p>
      ) : null}
    </header>
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

/**
 * Primary purple pill, 48px, full width. While pending a 16px spinner leads the label, the label stays,
 * the width holds and the button reports aria-busy (DESIGN.md Shared states, Loading). Busy and done
 * buttons stay at full strength and focusable (presses are ignored); only `disabled` dims to 50%, through
 * the global `.btn[aria-disabled]` rule.
 */
export function SubmitButton({
  pending,
  children,
  icon,
  className,
  type = 'submit',
  disabled,
  done,
  onClick,
  describedBy,
}: {
  pending?: boolean;
  /** Finished (for example "Signed in"): inactive but not dimmed. */
  done?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  type?: 'submit' | 'button';
  disabled?: boolean;
  onClick?: () => void;
  describedBy?: string;
}) {
  const inactive = Boolean(pending || disabled || done);
  return (
    <button
      type={type}
      aria-busy={pending || undefined}
      aria-disabled={(disabled && !pending && !done) || undefined}
      aria-describedby={describedBy}
      onClick={(event) => {
        if (inactive) {
          event.preventDefault();
          return;
        }
        onClick?.();
      }}
      className={cx(
        'btn btn-primary w-full',
        FOCUS_RING,
        pending && 'cursor-progress',
        done && 'cursor-default',
        className,
      )}
    >
      {pending ? <Spinner /> : icon}
      {children}
    </button>
  );
}

/**
 * Inline alert for a failed request: Paper White, a Signal Red icon, ink words and an optional Retry.
 * Announced as an alert. No side stripe, no tint that would drag the words under 4.5:1.
 */
export function AuthAlert({
  children,
  onRetry,
  retryLabel = 'Retry',
  retrying,
  className,
}: {
  children: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  retrying?: boolean;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cx(
        styles.enter,
        'flex items-start gap-3 rounded-lg border border-line bg-card p-3 pl-3.5',
        className,
      )}
    >
      <CircleAlert
        aria-hidden
        size={20}
        strokeWidth={1.5}
        className="mt-0.5 shrink-0 text-danger"
      />
      <p className="min-w-0 flex-1 py-0.5 text-small text-ink">{children}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={retrying ? undefined : onRetry}
          aria-busy={retrying || undefined}
          className={cx(
            'btn btn-secondary -my-1 h-9 shrink-0 gap-1.5 px-3.5 text-small',
            'relative before:absolute before:-inset-1 before:content-[""]',
            FOCUS_RING,
          )}
        >
          {retrying ? (
            <Spinner className="size-3.5" />
          ) : (
            <RotateCw aria-hidden size={14} strokeWidth={1.5} />
          )}
          {retryLabel}
        </button>
      ) : null}
    </div>
  );
}

/** Field-level message: Signal Red icon, Brick Red words, announced politely. Always mounted. */
export function FieldMessage({ id, message }: { id: string; message?: string | null }) {
  return (
    <div id={id} aria-live="polite">
      {message ? (
        <p
          className={cx(
            styles.enter,
            'mt-1.5 flex items-start gap-1.5 text-small',
            styles.errorText,
          )}
        >
          <CircleAlert
            aria-hidden
            size={16}
            strokeWidth={1.5}
            className="mt-px shrink-0 text-danger"
          />
          <span>{message}</span>
        </p>
      ) : null}
    </div>
  );
}

export function OrDivider({ className }: { className?: string }) {
  return (
    <div className={cx('flex items-center gap-3', className)}>
      <span aria-hidden className="h-px flex-1 bg-line" />
      <span className="text-small text-ink-muted">or</span>
      <span aria-hidden className="h-px flex-1 bg-line" />
    </div>
  );
}
