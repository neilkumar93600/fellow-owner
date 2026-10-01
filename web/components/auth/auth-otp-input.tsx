'use client';

import { LIMITS } from '@fellow-owners/shared';
import type * as React from 'react';
import { useEffect, useImperativeHandle, useRef } from 'react';

import styles from './auth.module.css';
import { cx } from './auth-classes';

export const OTP_LENGTH = LIMITS.otp.length;
export const EMPTY_CODE: readonly string[] = Array.from({ length: OTP_LENGTH }, () => '');

export interface OtpInputHandle {
  focus: (index?: number) => void;
}

/**
 * Six single-digit boxes that behave like one field: typing advances, Backspace steps back, arrows,
 * Home and End move, and a pasted or autofilled code (iOS and Android offer it on the first box through
 * autocomplete="one-time-code") fills every box at once. `onComplete` fires when the sixth digit lands.
 */
export function OtpInput({
  id,
  value,
  onChange,
  onComplete,
  labelledBy,
  describedBy,
  invalid,
  disabled,
  readOnly,
  autoFocus,
  ref,
}: {
  id: string;
  value: readonly string[];
  onChange: (next: string[]) => void;
  onComplete?: (code: string) => void;
  labelledBy: string;
  describedBy?: string;
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  ref?: React.Ref<OtpInputHandle>;
}) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const skipSelect = useRef(false);

  /** Focus a box. By default its digit is selected so the next keystroke replaces it. */
  function focusBox(index: number, select = true) {
    const target = inputs.current[Math.max(0, Math.min(OTP_LENGTH - 1, index))];
    if (!target) return;
    if (document.activeElement === target) {
      if (select) requestAnimationFrame(() => target.select());
      return;
    }
    skipSelect.current = !select;
    target.focus();
  }

  // Focus asked for while the boxes are still disabled (they re-enable on the next render) waits for it.
  const pendingFocus = useRef<number | null>(null);
  useImperativeHandle(ref, () => ({
    focus: (index) => {
      const target = index ?? Math.max(0, value.indexOf(''));
      const box = inputs.current[target];
      if (box && !box.disabled) focusBox(target);
      else pendingFocus.current = target;
    },
  }));
  useEffect(() => {
    if (pendingFocus.current === null) return;
    const box = inputs.current[pendingFocus.current];
    if (!box || box.disabled) return;
    const target = pendingFocus.current;
    pendingFocus.current = null;
    focusBox(target);
  });

  function commit(next: string[], focusIndex: number | null) {
    onChange(next);
    const complete = next.every((digit) => digit !== '');
    // A finished code keeps the caret after the last digit instead of a highlighted selection.
    if (focusIndex !== null) focusBox(focusIndex, !complete);
    if (complete) onComplete?.(next.join(''));
  }

  /** Spread digits from `start`; a full-length code always fills from the first box. */
  function fill(start: number, digits: string) {
    const from = digits.length >= OTP_LENGTH ? 0 : start;
    const next = [...value];
    const chars = digits.slice(0, OTP_LENGTH - from).split('');
    chars.forEach((digit, offset) => {
      next[from + offset] = digit;
    });
    const last = from + chars.length;
    commit(next, last >= OTP_LENGTH ? OTP_LENGTH - 1 : last);
  }

  function onInput(index: number, event: React.ChangeEvent<HTMLInputElement>) {
    const raw = event.target.value;
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 0) {
      // Cleared by the keyboard (or a non-digit typed): keep the box empty.
      if (value[index] !== '') {
        const next = [...value];
        next[index] = '';
        onChange(next);
      }
      return;
    }
    if (digits.length === 1) {
      const next = [...value];
      next[index] = digits;
      commit(next, index < OTP_LENGTH - 1 ? index + 1 : null);
      return;
    }
    if (digits.length === 2 && value[index] !== '') {
      // Typed into a box that already held a digit: keep the new one (just left of the caret).
      const caret = event.target.selectionStart ?? raw.length;
      const typed = raw.charAt(Math.max(0, caret - 1)).replace(/\D/, '') || digits.charAt(1);
      const next = [...value];
      next[index] = typed;
      commit(next, index < OTP_LENGTH - 1 ? index + 1 : null);
      return;
    }
    fill(index, digits);
  }

  function onKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case 'Backspace': {
        event.preventDefault();
        if (readOnly) return;
        const next = [...value];
        if (next[index] !== '') {
          next[index] = '';
          onChange(next);
        } else if (index > 0) {
          next[index - 1] = '';
          onChange(next);
          focusBox(index - 1);
        }
        return;
      }
      case 'Delete': {
        event.preventDefault();
        if (readOnly) return;
        const next = [...value];
        next[index] = '';
        onChange(next);
        return;
      }
      case 'ArrowLeft':
        event.preventDefault();
        focusBox(index - 1);
        return;
      case 'ArrowRight':
        event.preventDefault();
        focusBox(index + 1);
        return;
      case 'Home':
        event.preventDefault();
        focusBox(0);
        return;
      case 'End':
        event.preventDefault();
        focusBox(OTP_LENGTH - 1);
        return;
      default:
        return;
    }
  }

  function onPaste(index: number, event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    if (readOnly || disabled) return;
    const digits = event.clipboardData.getData('text').replace(/\D/g, '');
    if (digits) fill(index, digits);
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset would add a second visible legend; this group is labelled by the field label.
    <div
      role="group"
      id={id}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      className={styles.otpGroup}
    >
      {value.map((digit, index) => (
        <input
          // Positions are fixed, so the index is the identity.
          // biome-ignore lint/suspicious/noArrayIndexKey: six fixed boxes.
          key={index}
          ref={(node) => {
            inputs.current[index] = node;
          }}
          id={index === 0 ? `${id}-0` : undefined}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          enterKeyHint={index === OTP_LENGTH - 1 ? 'done' : 'next'}
          // biome-ignore lint/a11y/noAutofocus: the code is the only thing to do on this screen.
          autoFocus={autoFocus && index === 0}
          aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
          aria-invalid={invalid || undefined}
          data-filled={digit !== '' || undefined}
          disabled={disabled}
          readOnly={readOnly}
          value={digit}
          onChange={(event) => onInput(index, event)}
          onKeyDown={(event) => onKeyDown(index, event)}
          onPaste={(event) => onPaste(index, event)}
          onFocus={(event) => {
            const target = event.currentTarget;
            if (skipSelect.current) {
              skipSelect.current = false;
              return;
            }
            requestAnimationFrame(() => target.select());
          }}
          className={cx(styles.otp)}
        />
      ))}
    </div>
  );
}
