'use client';

import { Eye, EyeOff } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';

import styles from './auth.module.css';
import { cx } from './auth-classes';
import { FieldMessage } from './auth-ui';

type InputProps = Omit<React.ComponentPropsWithRef<'input'>, 'id' | 'className' | 'prefix'>;

interface AuthFieldProps extends InputProps {
  id: string;
  label: string;
  /** Adds " (optional)" to the label. Required is the default and is not marked. */
  optional?: boolean;
  /** Drawn at the right end of the label row, such as the "Forgot password?" link. */
  labelAside?: React.ReactNode;
  /** A fixed segment inside the field's left edge, such as the "@" before a username. */
  prefix?: React.ReactNode;
  error?: string;
  /** Helper text under the field, linked with aria-describedby. */
  hint?: React.ReactNode;
  /** Ids of more descriptions to read with the field (a status line the field owner renders). */
  describedBy?: string;
  /** Marks the field invalid without an error message here (the message lives elsewhere). */
  invalid?: boolean;
  className?: string;
  /** A control drawn inside the field's right edge (the show password toggle). */
  trailing?: React.ReactNode;
}

/**
 * Label above (Small Strong ink, 6px gap), a 44px white field with a Field Grey border, helper text and
 * the error below. The error is tied to the input with aria-describedby and announced politely.
 */
export function AuthField({
  id,
  label,
  optional,
  labelAside,
  prefix,
  error,
  hint,
  describedBy: extraDescribedBy,
  invalid,
  className,
  trailing,
  ...inputProps
}: AuthFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [extraDescribedBy, hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(' ');
  const isInvalid = Boolean(error) || invalid;

  const input = (
    <input
      id={id}
      aria-invalid={isInvalid || undefined}
      aria-describedby={describedBy || undefined}
      className={cx(prefix ? styles.bareInput : styles.input, trailing ? styles.withToggle : null)}
      {...inputProps}
    />
  );

  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="block text-small font-medium text-ink">
          {label}
          {optional ? <span className="font-normal text-ink-muted"> (optional)</span> : null}
        </label>
        {labelAside}
      </div>
      {prefix ? (
        <div className={cx(styles.box, 'mt-1.5')} data-invalid={isInvalid || undefined}>
          <span aria-hidden className={styles.prefix}>
            {prefix}
          </span>
          {input}
          {trailing}
        </div>
      ) : (
        <div className="relative mt-1.5">
          {input}
          {trailing}
        </div>
      )}
      {hint ? (
        <div id={hintId} className="mt-1.5 text-small text-ink-muted">
          {hint}
        </div>
      ) : null}
      <FieldMessage id={errorId} message={error} />
    </div>
  );
}

/** Password field with a show or hide toggle inside its right edge (a 48px wide ghost button). */
export function AuthPasswordField(props: Omit<AuthFieldProps, 'trailing' | 'type' | 'prefix'>) {
  const [visible, setVisible] = useState(false);
  return (
    <AuthField
      {...props}
      type={visible ? 'text' : 'password'}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      trailing={
        <button
          type="button"
          aria-label={`Show ${props.label.toLowerCase()}`}
          aria-pressed={visible}
          aria-controls={props.id}
          onClick={() => setVisible((value) => !value)}
          className={cx(
            'absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-[16px] text-ink-soft',
            'transition-colors duration-150 hover:text-ink',
            // Inset ring: the button sits inside the field's own border.
            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink',
          )}
        >
          {visible ? (
            <EyeOff aria-hidden size={20} strokeWidth={1.5} />
          ) : (
            <Eye aria-hidden size={20} strokeWidth={1.5} />
          )}
        </button>
      }
    />
  );
}
