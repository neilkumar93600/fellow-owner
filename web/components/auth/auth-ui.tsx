'use client';

import { CircleAlert, RotateCw } from 'lucide-react';
import type * as React from 'react';

import styles from './auth.module.css';
import { cx, FOCUS_RING } from './auth-classes';

export { FOCUS_RING, TEXT_LINK } from './auth-classes';

/**
 * One auth screen's content. The white form panel in AuthShell is the card, so this only groups the
 * screen (and keeps every form's structure unchanged). `size` tells the shell how far down to start it:
 * about 530px tall is medium, about 300px or less is short, tall starts at the top; the default fits log in.
 */
export function AuthCard({
  children,
  className,
  size,
}: {
  children: React.ReactNode;
  className?: string;
  size?: 'medium' | 'short' | 'tall';
}) {
  return (
    <div data-size={size} className={className}>
      {children}
    </div>
  );
}

/**
 * The card's h1, static (DESIGN.md Motion: no page-load choreography). `headingRef` lands on a wrapper
 * that can hold focus after a success.
 */
export function AuthHeading({
  title,
  children,
  headingRef,
}: {
  title: string;
  children?: React.ReactNode;
  headingRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    // Centred; the fields below stay left-aligned.
    <header className="text-center">
      <div ref={headingRef} tabIndex={headingRef ? -1 : undefined} className="outline-none">
        <h1 className="text-h1 text-balance text-ink sm:text-display">{title}</h1>
      </div>
      {children ? (
        <p className="mt-1.5 text-body text-pretty text-ink-soft [overflow-wrap:anywhere]">
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
 * Primary coral pill, 48px, full width: the screen's one coral action. A press is the 0.98 scale and
 * nothing else (DESIGN.md Settled Press Rule). While pending a 16px spinner leads the label, the label stays,
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
  ref,
}: {
  pending?: boolean;
  /** Finished (for example "Email confirmed"): inactive but not dimmed. */
  done?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  type?: 'submit' | 'button';
  disabled?: boolean;
  onClick?: () => void;
  describedBy?: string;
  ref?: React.Ref<HTMLButtonElement>;
}) {
  const inactive = Boolean(pending || disabled || done);
  return (
    <button
      ref={ref}
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

/** The small secondary pill at an alert's right edge (Retry, or a link such as "Enter code"). */
export const ALERT_ACTION = cx(
  'btn btn-secondary -my-1 h-9 shrink-0 gap-1.5 px-3.5 text-small',
  'relative before:absolute before:-inset-1 before:content-[""]',
  FOCUS_RING,
);

/**
 * Inline alert for a failed request: Paper White, a Signal Red icon, ink words and an optional Retry.
 * Announced as an alert. No side stripe, no tint that would drag the words under 4.5:1. A new `attempt`
 * remounts the words alone, so a Retry that fails the same way is announced again while the alert and
 * its Retry stay put. With a `ref` it can take focus (an error shown on arrival).
 */
export function AuthAlert({
  children,
  action,
  onRetry,
  retryLabel = 'Retry',
  retrying,
  attempt,
  className,
  ref,
}: {
  children: React.ReactNode;
  /** A next step that is not a retry, such as an "Enter code" link. */
  action?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  retrying?: boolean;
  /** Bumped on every failure. */
  attempt?: number;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={ref ? -1 : undefined}
      className={cx(
        styles.enter,
        'flex items-start gap-3 rounded-lg border border-line bg-card p-3 pl-3.5',
        ref ? 'outline-none' : undefined,
        className,
      )}
    >
      <CircleAlert
        aria-hidden
        size={20}
        strokeWidth={1.5}
        className="mt-0.5 shrink-0 text-danger"
      />
      <p key={attempt} className="min-w-0 flex-1 py-0.5 text-small text-ink">
        {children}
      </p>
      {action}
      {onRetry ? (
        <button
          type="button"
          onClick={retrying ? undefined : onRetry}
          aria-busy={retrying || undefined}
          className={ALERT_ACTION}
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

export function OrDivider({ text = 'or', className }: { text?: string; className?: string }) {
  return (
    <div className={cx('flex items-center gap-3', className)}>
      <span aria-hidden className="h-px flex-1 bg-line" />
      <span className="text-small whitespace-nowrap text-ink-muted">{text}</span>
      <span aria-hidden className="h-px flex-1 bg-line" />
    </div>
  );
}
