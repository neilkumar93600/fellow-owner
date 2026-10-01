'use client';

import { Eye, EyeOff } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';

import styles from './auth.module.css';
import { cx } from './auth-classes';
import { FieldMessage } from './auth-ui';

type InputProps = Omit<React.ComponentPropsWithRef<'input'>, 'id' | 'className'>;

interface AuthFieldProps extends InputProps {
  id: string;
  label: string;
  error?: string;
  /** Helper text under the field, linked with aria-describedby. */
  hint?: React.ReactNode;
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
  error,
  hint,
  className,
  trailing,
  ...inputProps
}: AuthFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-small font-medium text-ink">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          className={cx(styles.input, trailing ? styles.withToggle : null)}
          {...inputProps}
        />
        {trailing}
      </div>
      {hint ? (
        <div id={hintId} className="mt-1.5 text-small text-ink-muted">
          {hint}
        </div>
      ) : null}
      <FieldMessage id={errorId} message={error} />
    </div>
  );
}

/** Password field with a show or hide toggle inside its right edge (a 44px ghost button). */
export function AuthPasswordField(props: Omit<AuthFieldProps, 'trailing' | 'type'>) {
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
          aria-label="Show password"
          aria-pressed={visible}
          aria-controls={props.id}
          onClick={() => setVisible((value) => !value)}
          className={cx(
            'absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-[16px] text-ink-soft',
            'transition-colors duration-150 hover:text-ink',
            // Inset ring: the button sits inside the field's own border.
            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-purple',
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
