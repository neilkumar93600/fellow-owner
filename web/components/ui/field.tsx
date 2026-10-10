'use client';

import { ChevronDown, CircleAlert } from 'lucide-react';
import type * as React from 'react';
import { createContext, useContext, useId } from 'react';
import { cn } from './cn';

/*
 * DESIGN.md Inputs. A Field draws the label, helper, character count and error around one control and
 * wires them up: the control gets the id, aria-describedby (helper, count, error) and aria-invalid from
 * context. Controls are plain elements, so react-hook-form's register() (ref included) and controlled
 * value/onChange both spread straight onto them.
 *
 * <Field label="Idea subject" helper="One line on what you want to make." error={errors.subject?.message}>
 *   <TextField {...register('subject')} placeholder="A street-food map for solo travelers" />
 * </Field>
 */

interface FieldContextValue {
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  disabled: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);
const GroupContext = createContext<{ text: boolean } | null>(null);

export interface FieldControlProps {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  disabled?: true;
}

/** The wiring a control inside a Field needs; empty outside one. Spread it on a custom control. */
export function useFieldControl(): FieldControlProps {
  const field = useContext(FieldContext);
  if (!field) return {};
  return {
    id: field.id,
    'aria-describedby': field.describedBy,
    'aria-invalid': field.invalid || undefined,
    disabled: field.disabled || undefined,
  };
}

function joinIds(...ids: Array<string | undefined>): string | undefined {
  return ids.filter(Boolean).join(' ') || undefined;
}

export interface FieldProps {
  /** Small Strong ink, 6px above the control. */
  label: React.ReactNode;
  /** Adds " (optional)" to the label; required is the default and is not marked. */
  optional?: boolean;
  /** Small ink-muted under the control. Never put required information only in a placeholder. */
  helper?: React.ReactNode;
  /** The message; its presence marks the control invalid. Announced politely. */
  error?: React.ReactNode;
  /** Character count at the bottom right; over the limit also marks the control invalid. */
  count?: { value: number; max: number };
  /** Disables the control and dims it and its label to 50%; helper, count and error stay legible. */
  disabled?: boolean;
  /** The control's id (generated when absent). */
  id?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({
  label,
  optional,
  helper,
  error,
  count,
  disabled = false,
  id: idProp,
  className,
  children,
}: FieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const helperId = `${id}-helper`;
  const countId = `${id}-count`;
  const errorId = `${id}-error`;
  const hasError = error != null && error !== false && error !== '';
  const context: FieldContextValue = {
    id,
    describedBy: joinIds(
      helper ? helperId : undefined,
      count ? countId : undefined,
      hasError ? errorId : undefined,
    ),
    invalid: hasError || (count ? count.value > count.max : false),
    disabled,
  };

  return (
    <FieldContext.Provider value={context}>
      <div className={cn('flex flex-col', className)}>
        <Label htmlFor={id} optional={optional} className={disabled ? 'opacity-50' : undefined}>
          {label}
        </Label>
        {children}
        {helper || count ? (
          <div className="mt-1.5 flex items-start justify-between gap-3">
            {helper ? <Helper id={helperId}>{helper}</Helper> : <span />}
            {count ? <CharCount id={countId} value={count.value} max={count.max} /> : null}
          </div>
        ) : null}
        <FieldError id={errorId}>{hasError ? error : null}</FieldError>
      </div>
    </FieldContext.Provider>
  );
}

export function Label({
  optional,
  className,
  children,
  ...props
}: React.ComponentProps<'label'> & { optional?: boolean }) {
  return (
    <label className={cn('mb-1.5 text-small-strong text-ink', className)} {...props}>
      {children}
      {optional ? <span className="font-normal text-ink-muted"> (optional)</span> : null}
    </label>
  );
}

export function Helper({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-small text-ink-muted', className)} {...props} />;
}

/**
 * Signal Red icon, Brick Red words, under the control. The region stays in the page while empty so a
 * message that appears in it is announced (aria-live polite).
 */
export function FieldError({ className, children, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      aria-live="polite"
      className={cn(
        'flex items-start gap-1.5 text-small text-danger-deep not-empty:mt-1.5',
        className,
      )}
      {...props}
    >
      {children ? (
        <>
          <CircleAlert aria-hidden="true" strokeWidth={1.5} className="mt-px size-4 shrink-0 text-danger" />
          <span>{children}</span>
        </>
      ) : null}
    </p>
  );
}

/**
 * Caption, tabular: ink-muted, Toffee from 90% of the limit, Brick Red with a Signal Red icon over it.
 * Screen readers hear "212 of 280 characters" (and how far over) through aria-describedby.
 */
export function CharCount({
  value,
  max,
  className,
  ...props
}: Omit<React.ComponentProps<'p'>, 'children'> & { value: number; max: number }) {
  const over = value > max;
  const near = !over && value >= max * 0.9;
  return (
    <p
      className={cn(
        'flex shrink-0 items-center gap-1 text-caption',
        over ? 'text-danger-deep' : near ? 'text-warn-ink' : 'text-ink-muted',
        className,
      )}
      {...props}
    >
      {over ? (
        <CircleAlert aria-hidden="true" strokeWidth={1.5} className="size-3.5 text-danger" />
      ) : null}
      <span aria-hidden="true">
        {value}/{max}
      </span>
      <span className="sr-only">
        {value} of {max} characters{over ? `, ${value - max} over the limit` : ''}
      </span>
    </p>
  );
}

/** Pure White, radius 16, Field Grey border; hover steps the border to ink-muted, focus to ink. */
const CONTROL = cn(
  'w-full min-w-0 rounded-lg border border-line-field bg-white px-3.5 text-body text-ink max-sm:text-[1rem]',
  'transition-colors duration-150 ease-out-quart placeholder:text-ink-muted',
  'not-disabled:not-focus-visible:not-aria-invalid:hover:border-ink-muted',
  'focus-visible:border-ink aria-invalid:border-danger disabled:cursor-not-allowed disabled:opacity-50',
  // Autofill keeps the white fill and ink words instead of the browser's tint.
  'autofill:shadow-[inset_0_0_0_100px_var(--card-strong)] autofill:[-webkit-text-fill-color:var(--ink)]',
);

/** Inside an InputGroup the box draws the border, the focus ring and the dimming; the input goes bare. */
const BARE =
  'h-full flex-1 rounded-none border-0 bg-transparent pr-3.5 focus-visible:outline-none disabled:opacity-100';

function useControlProps<P extends { id?: string; 'aria-describedby'?: string }>(props: P) {
  const wiring = useFieldControl();
  return {
    ...wiring,
    ...props,
    'aria-describedby': joinIds(wiring['aria-describedby'], props['aria-describedby']),
  };
}

/** 44px text input (also email, url, search, password). */
export function TextField({ className, ...props }: React.ComponentProps<'input'>) {
  const group = useContext(GroupContext);
  const control = useControlProps(props);
  return (
    <input
      {...control}
      className={cn(
        CONTROL,
        'h-11',
        group && BARE,
        group && (group.text ? 'pl-0.5' : 'pl-2'),
        className,
      )}
    />
  );
}

/** Textarea, 96px tall at least, 12px by 14px padding; resizes vertically. */
export function TextArea({ className, ...props }: React.ComponentProps<'textarea'>) {
  const control = useControlProps(props);
  return (
    <textarea
      {...control}
      className={cn(CONTROL, 'block min-h-24 resize-y py-3', className)}
    />
  );
}

/**
 * A native select drawn as a field, for forms on fan pages: the phone's own picker opens, which works in
 * every in-app browser. The toolbar dropdown is `Select` in ./select.
 */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  const control = useControlProps(props);
  return (
    // The wrapper dims, so the chevron fades with the select.
    <div className="relative has-disabled:opacity-50">
      <select
        {...control}
        className={cn(
          CONTROL,
          'h-11 cursor-pointer appearance-none pr-10 disabled:opacity-100',
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        strokeWidth={1.5}
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink"
      />
    </div>
  );
}

/**
 * A field with a leading addon: "@" before a handle, or a search icon. The box takes the border and the
 * focus ring; a press on the addon focuses the input. Put one TextField inside.
 */
export function InputGroup({
  leading,
  className,
  children,
}: {
  leading: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const text = typeof leading === 'string';
  return (
    <GroupContext.Provider value={{ text }}>
      <div
        onMouseDown={(event) => {
          if ((event.target as HTMLElement).closest('input, button, a')) return;
          event.preventDefault();
          event.currentTarget.querySelector('input')?.focus();
        }}
        className={cn(
          'flex h-11 w-full cursor-text items-center rounded-lg border border-line-field bg-white transition-colors duration-150 ease-out-quart',
          'not-has-focus-visible:not-has-aria-invalid:not-has-disabled:hover:border-ink-muted',
          'has-focus-visible:border-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink',
          'has-aria-invalid:border-danger has-disabled:cursor-not-allowed has-disabled:opacity-50',
          className,
        )}
      >
        <span
          aria-hidden="true"
          className="flex shrink-0 items-center pl-3.5 text-body text-ink-soft max-sm:text-[1rem] [&_svg]:size-5 [&_svg]:stroke-[1.5]"
        >
          {leading}
        </span>
        {children}
      </div>
    </GroupContext.Provider>
  );
}
