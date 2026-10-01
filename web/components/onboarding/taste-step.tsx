'use client';

import { LIMITS } from '@fellow-owners/shared';
import { Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import styles from './onboarding.module.css';
import {
  CharCount,
  cx,
  errorMessage,
  FieldError,
  inputClass,
  itemError,
  textareaClass,
} from './onboarding-fields';
import { type OnboardingValues, TASTE_EXAMPLES } from './onboarding-templates';

const T = LIMITS.tasteProfile;

export function TasteStep() {
  return (
    <div className="flex flex-col gap-7">
      <LineList
        name="tasteProfile.promote"
        title="I promote"
        hint={`What you’d put your name behind. ${T.promote.min} to ${T.promote.max} lines.`}
        max={T.promote.max}
        itemMax={T.lineMax}
        placeholder="Fitness tools I would use myself"
        examples={TASTE_EXAMPLES.promote}
        itemLabel="Promote line"
      />
      <LineList
        name="tasteProfile.never"
        title="I never promote"
        hint={`Things the AI should always flag. Up to ${T.never.max} lines.`}
        max={T.never.max}
        itemMax={T.lineMax}
        placeholder="Crypto, gambling"
        examples={TASTE_EXAMPLES.never}
        itemLabel="Never line"
      />
      <LineList
        name="tasteProfile.voice"
        title="My voice"
        hint={`Paste up to ${T.voice.max} things you wrote: captions, posts, replies. Drafts will sound like these.`}
        max={T.voice.max}
        itemMax={T.voiceSampleMax}
        placeholder="Shipped the new lifting tracker tonight. Rough edges, all mine, free for the first 100 of you."
        multiline
        itemLabel="Voice sample"
        addLabel="Add sample"
      />
    </div>
  );
}

type ListName = 'tasteProfile.promote' | 'tasteProfile.never' | 'tasteProfile.voice';

/** An editable list of strings with stable row keys, add and remove, and a count. */
function LineList({
  name,
  title,
  hint,
  max,
  itemMax,
  placeholder,
  examples,
  multiline = false,
  itemLabel,
  addLabel = 'Add line',
}: {
  name: ListName;
  title: string;
  hint: string;
  max: number;
  itemMax: number;
  placeholder: string;
  examples?: readonly string[];
  multiline?: boolean;
  itemLabel: string;
  addLabel?: string;
}) {
  const { control } = useFormContext<OnboardingValues>();
  const { field, fieldState } = useController({ control, name });
  // An empty list still shows one empty row to type into.
  const lines: string[] = Array.isArray(field.value) && field.value.length > 0 ? field.value : [''];
  const id = name.replace('.', '-');
  const keys = useStableKeys(lines.length);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const filled = lines.filter((l) => l.trim()).length;
  const listError = errorMessage(fieldState.error);

  // Focus a row after it is added, filled from an example or its neighbour is removed; caret at the end.
  useEffect(() => {
    if (focusIndex === null) return;
    const el = document.getElementById(`${id}-${focusIndex}`);
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    setFocusIndex(null);
  }, [focusIndex, id]);

  function setLines(next: string[]) {
    field.onChange(next);
  }

  function add(text = '') {
    if (lines.length >= max) return;
    const empty = lines.findIndex((l) => !l.trim());
    // An example fills the first empty line. The example chips unmount once a line is filled, so focus
    // moves to that line rather than falling to the page.
    if (text && empty >= 0) {
      setLines(lines.map((l, i) => (i === empty ? text : l)));
      setFocusIndex(empty);
      return;
    }
    keys.push();
    setLines([...lines, text]);
    setFocusIndex(lines.length);
  }

  function removeAt(index: number) {
    if (lines.length === 1) {
      setLines(['']);
      setFocusIndex(0);
      return;
    }
    keys.remove(index);
    setLines(lines.filter((_, i) => i !== index));
    if (index > 0) setFocusIndex(index - 1);
    else requestAnimationFrame(() => document.getElementById(`${id}-0`)?.focus());
  }

  const unusedExamples = (examples ?? []).filter(
    (ex) => !lines.some((l) => l.trim().toLowerCase() === ex.toLowerCase()),
  );

  return (
    <fieldset
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-hint ${id}-error`}
      className="min-w-0"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id={`${id}-title`} className="text-body font-medium text-ink">
          {title}
        </h2>
        <span className="tabular shrink-0 text-small text-ink-soft">
          {filled} of {max}
        </span>
      </div>
      <p id={`${id}-hint`} className="mt-0.5 text-small text-ink-muted">
        {hint}
      </p>

      <ol className="mt-3 flex flex-col gap-2">
        {lines.map((line, index) => {
          const err = itemError(fieldState.error, index);
          // A list-level error ("add at least one") marks the first row so focus can land there.
          const flagged = Boolean(err) || (index === 0 && Boolean(listError) && filled === 0);
          const showCount = multiline || line.length >= itemMax * 0.8;
          const inputId = `${id}-${index}`;
          const common = {
            id: inputId,
            value: line,
            name: `${name}.${index}`,
            onBlur: field.onBlur,
            'aria-label': `${itemLabel} ${index + 1}`,
            'aria-invalid': flagged ? true : undefined,
            'aria-describedby': `${inputId}-error${showCount ? ` ${inputId}-count` : ''}${index === 0 ? ` ${id}-error` : ''}`,
            placeholder: index === 0 ? placeholder : undefined,
          } as const;
          const removable = lines.length > 1 || line.length > 0;
          return (
            <li key={keys.list[index]}>
              <div className="flex items-start gap-1.5">
                {multiline ? (
                  <textarea
                    {...common}
                    rows={3}
                    onChange={(e) =>
                      setLines(lines.map((l, i) => (i === index ? e.target.value : l)))
                    }
                    className={cx(textareaClass, 'min-h-[96px] flex-1')}
                  />
                ) : (
                  <input
                    {...common}
                    type="text"
                    autoComplete="off"
                    onChange={(e) =>
                      setLines(lines.map((l, i) => (i === index ? e.target.value : l)))
                    }
                    onKeyDown={(e) => {
                      // Enter on a filled last line opens the next one, like a list in a doc.
                      if (
                        e.key === 'Enter' &&
                        line.trim() &&
                        index === lines.length - 1 &&
                        lines.length < max
                      ) {
                        e.preventDefault();
                        add();
                      }
                    }}
                    className={cx(inputClass, 'flex-1')}
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  disabled={!removable}
                  aria-label={`Remove ${itemLabel.toLowerCase()} ${index + 1}`}
                  className={cx(
                    styles.press,
                    'grid size-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-page hover:text-ink disabled:invisible',
                  )}
                >
                  <X aria-hidden strokeWidth={1.5} className="size-5" />
                </button>
              </div>
              <div className="flex items-start justify-between gap-3 pr-[3.125rem]">
                <FieldError id={`${inputId}-error`} message={err} />
                {showCount ? (
                  <span className="mt-1.5 ml-auto">
                    <CharCount id={`${inputId}-count`} value={line.length} max={itemMax} />
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
      <FieldError id={`${id}-error`} message={listError} />

      <button
        type="button"
        onClick={() => add()}
        disabled={lines.length >= max}
        className="btn mt-2 h-11 px-3.5 text-small text-ink hover:bg-page sm:h-10"
      >
        <Plus aria-hidden strokeWidth={1.5} className="size-4" />
        {addLabel}
      </button>

      {filled === 0 && unusedExamples.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-small text-ink-muted">Examples</span>
          {unusedExamples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => add(ex)}
              className={cx(
                styles.press,
                'inline-flex h-11 items-center gap-1.5 rounded-full border border-line bg-card-strong px-3 text-small text-ink-soft hover:border-(--line-strong) hover:text-ink sm:h-8',
              )}
            >
              <Plus aria-hidden strokeWidth={1.5} className="size-3.5" />
              <span className="sr-only">Add </span>
              {ex}
            </button>
          ))}
        </div>
      ) : null}
    </fieldset>
  );
}

/** Keys that follow rows through adds and removes, so React never swaps typed text between rows. */
function useStableKeys(length: number) {
  const counter = useRef(0);
  const list = useRef<string[]>([]);
  while (list.current.length < length) list.current.push(`k${counter.current++}`);
  if (list.current.length > length) list.current = list.current.slice(0, length);
  return {
    list: list.current,
    push() {
      list.current = [...list.current, `k${counter.current++}`];
    },
    remove(index: number) {
      list.current = list.current.filter((_, i) => i !== index);
    },
  };
}
