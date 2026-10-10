'use client';

import type { LinkInput } from '@fellow-owners/shared';
import { Check, Plus, X } from 'lucide-react';
import type * as React from 'react';
import { useState } from 'react';
import { type UseFormRegisterReturn, useFieldArray, useFormContext } from 'react-hook-form';
import type { ZodType } from 'zod';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Field, FieldError, TextField } from '@/components/ui/field';

/*
 * Parts shared by the fan forms (New post, Send an idea, the My space profile). They sit on a strong-glass
 * card, so nothing here is glass: a choice is a set of native radios drawn as pills, a list is chips.
 */

/** The focus ring on a label whose radio (visually hidden) holds keyboard focus. */
const RING_WITHIN =
  'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink';

export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

export interface ChoicePillsProps<T extends string> {
  legend: string;
  options: readonly ChoiceOption<T>[];
  /** The current value (from watch), which draws the selected pill. */
  value: T | undefined;
  /** register('type'), spread on every radio. */
  input: UseFormRegisterReturn;
  /**
   * segmented: SegmentedPill's shape off glass, a Dove Grey track with the selected segment in white.
   * pills: wrapping outlined pills; the selected one takes the pressed look (ink fill, white words).
   */
  look?: 'segmented' | 'pills';
  helper?: React.ReactNode;
  error?: string;
}

/** One choice from a few, as 44px radio pills (arrow keys move between them, as radios do). */
export function ChoicePills<T extends string>({
  legend,
  options,
  value,
  input,
  look = 'pills',
  helper,
  error,
}: ChoicePillsProps<T>) {
  const segmented = look === 'segmented';
  return (
    <fieldset className="flex min-w-0 flex-col">
      <legend className="mb-1.5 text-small-strong text-ink">{legend}</legend>
      <div
        className={
          segmented ? 'flex rounded-full bg-white/70 p-1 sm:w-fit' : 'flex flex-wrap gap-2'
        }
      >
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                'press inline-flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 select-none',
                RING_WITHIN,
                segmented && 'flex-1 sm:flex-none sm:px-6',
                segmented &&
                  (checked
                    ? 'bg-white text-label text-ink'
                    : 'text-body text-ink-soft hover:text-ink'),
                !segmented &&
                  (checked
                    ? 'border border-ink bg-ink text-label text-white'
                    : 'border border-ink/10 bg-white text-label text-ink hover:bg-white/60'),
              )}
            >
              <input type="radio" value={option.value} className="sr-only" {...input} />
              {!segmented && checked ? (
                <Check aria-hidden="true" strokeWidth={1.5} className="size-4" />
              ) : null}
              {option.label}
            </label>
          );
        })}
      </div>
      {helper}
      {error ? <FieldError>{error}</FieldError> : null}
    </fieldset>
  );
}

export interface ChipsInputProps {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  max: number;
  /** Checks one entry: trims it and holds it to its length limits. */
  itemSchema: ZodType<string>;
  /** The add button: "Add spot". */
  addLabel?: string;
  placeholder?: string;
  helper?: string;
  optional?: boolean;
  /** The list's own error from the form schema. */
  error?: string;
}

/** A short list typed one entry at a time (Enter or Add), shown as 44px chips that remove on tap. */
export function ChipsInput({
  label,
  values,
  onChange,
  max,
  itemSchema,
  addLabel = 'Add',
  placeholder,
  helper,
  optional,
  error,
}: ChipsInputProps) {
  const [draft, setDraft] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const full = values.length >= max;

  function add() {
    const parsed = itemSchema.safeParse(draft);
    if (!parsed.success) {
      setProblem(parsed.error.issues[0]?.message ?? 'Check this entry');
      return;
    }
    if (values.some((value) => value.toLowerCase() === parsed.data.toLowerCase())) {
      setProblem('Already added');
      return;
    }
    onChange([...values, parsed.data]);
    setDraft('');
    setProblem(null);
  }

  return (
    <div className="flex min-w-0 flex-col">
      <Field
        label={label}
        optional={optional}
        helper={
          full ? `${max} of ${max} added.` : (helper ?? `Up to ${max}. Press Enter to add one.`)
        }
        error={problem ?? error}
      >
        <div className="flex gap-2">
          <TextField
            value={draft}
            disabled={full}
            placeholder={placeholder}
            enterKeyHint="done"
            onChange={(event) => {
              setDraft(event.target.value);
              setProblem(null);
            }}
            onKeyDown={(event) => {
              // Enter adds the entry instead of submitting the form.
              if (event.key !== 'Enter') return;
              event.preventDefault();
              add();
            }}
          />
          <Button
            variant="secondary"
            className="h-11"
            disabled={full || !draft.trim()}
            onClick={add}
          >
            {addLabel}
          </Button>
        </div>
      </Field>
      {values.length ? (
        <ul aria-label={label} className="mt-3 flex flex-wrap gap-2">
          {values.map((value) => (
            <li
              key={value}
              className="inline-flex h-11 max-w-full items-center rounded-full bg-white/70 pl-4 text-label text-ink"
            >
              <span className="truncate">{value}</span>
              <button
                type="button"
                aria-label={`Remove ${value}`}
                onClick={() => onChange(values.filter((item) => item !== value))}
                className="press grid size-11 shrink-0 place-items-center rounded-full hover:bg-white"
              >
                <X aria-hidden="true" strokeWidth={1.5} className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * Label and URL pairs for the `links` array of the surrounding FormProvider, up to `max`, each checked
 * by the shared linkSchema on submit.
 */
export function LinksField({ max, helper }: { max: number; helper?: string }) {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext<{ links: LinkInput[] }>();
  const { fields, append, remove } = useFieldArray({ control, name: 'links' });
  const listError = errors.links?.message ?? errors.links?.root?.message;

  return (
    <fieldset className="flex min-w-0 flex-col">
      <legend className="text-small-strong text-ink">
        Links <span className="font-normal text-ink-soft">(optional)</span>
      </legend>
      <p className="mt-1 text-small text-ink-soft">
        {helper ?? `Up to ${max}, such as a map, a video or your notes.`}
      </p>
      {fields.length ? (
        <ul className="mt-3 flex flex-col gap-4">
          {fields.map((field, index) => (
            <li key={field.id}>
              <fieldset className="flex items-start gap-2">
                <legend className="sr-only">Link {index + 1}</legend>
                <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                  <Field label="Label" error={errors.links?.[index]?.label?.message}>
                    <TextField {...register(`links.${index}.label`)} placeholder="Map" />
                  </Field>
                  <Field label="URL" error={errors.links?.[index]?.url?.message}>
                    <TextField
                      type="url"
                      inputMode="url"
                      autoComplete="url"
                      placeholder="https://"
                      {...register(`links.${index}.url`)}
                    />
                  </Field>
                </div>
                <Button
                  variant="ghost"
                  size="icon-fan"
                  surface="glass"
                  aria-label={`Remove link ${index + 1}`}
                  className="mt-6.5"
                  onClick={() => remove(index)}
                >
                  <X />
                </Button>
              </fieldset>
            </li>
          ))}
        </ul>
      ) : null}
      {fields.length < max ? (
        <Button
          variant="secondary"
          icon={<Plus />}
          className="mt-3 h-11 w-fit"
          onClick={() => append({ label: '', url: '' })}
        >
          Add link
        </Button>
      ) : null}
      {listError ? <FieldError>{listError}</FieldError> : null}
    </fieldset>
  );
}
