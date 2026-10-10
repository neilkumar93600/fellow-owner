'use client';

import { LIMITS, PLATFORM_LABELS, PLATFORMS } from '@fellow-owners/shared';
import { ChevronDown, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import styles from './onboarding.module.css';
import { cx, errorMessage, FieldError, FieldLabel, inputClass } from './onboarding-fields';
import {
  detectPlatform,
  emptyPlatform,
  formatCompact,
  formatFull,
  type OnboardingValues,
  PLATFORM_URL_EXAMPLE,
  parseFollowers,
  totalFollowers,
  withProtocol,
} from './onboarding-templates';
import { ImportPanel, type PlatformImport } from './platform-import';

const MAX = LIMITS.space.platforms.max;

export function PlatformsStep({ imp }: { imp: PlatformImport }) {
  const {
    control,
    register,
    getValues,
    setValue,
    formState: { errors, dirtyFields },
  } = useFormContext<OnboardingValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'platforms' });
  const platforms = useWatch({ control, name: 'platforms' }) ?? [];
  const handle = useWatch({ control, name: 'handle' }) || 'yourname';
  const { total, count } = totalFollowers(platforms);
  const listError = errorMessage(errors.platforms);
  const addRef = useRef<HTMLButtonElement>(null);
  const [focusRow, setFocusRow] = useState<number | null>(null);

  // A fresh visit always offers one empty row to start from.
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (getValues('platforms').length === 0) append(emptyPlatform(), { shouldFocus: false });
  }, [append, getValues]);

  useEffect(() => {
    if (focusRow === null) return;
    document.getElementById(`ob-platform-${focusRow}`)?.focus();
    setFocusRow(null);
  }, [focusRow]);

  function addRow() {
    append(emptyPlatform(getValues('platforms').map((p) => p.platform)), { shouldFocus: false });
    setFocusRow(fields.length);
  }

  function removeRow(index: number) {
    remove(index);
    const left = fields.length - 1;
    if (left === 0) requestAnimationFrame(() => addRef.current?.focus());
    else setFocusRow(Math.max(0, index - 1));
  }

  return (
    <div className="flex flex-col gap-4">
      <ImportPanel
        imp={imp}
        onSkip={() =>
          requestAnimationFrame(() =>
            (document.getElementById('ob-url-0') ?? addRef.current)?.focus(),
          )
        }
      />
      <h2 id="ob-platforms-title" className="mt-2 text-body font-medium text-ink">
        Your platforms
      </h2>
      {fields.length === 0 ? (
        <p className="rounded-2xl border border-line bg-card px-4 py-5 text-body text-ink-muted">
          No platforms yet. Add the places fans know you from, or skip this for now.
        </p>
      ) : (
        <ol aria-labelledby="ob-platforms-title" className="flex flex-col gap-3">
          {fields.map((field, index) => {
            const rowErrors = errors.platforms?.[index];
            const platform = platforms[index]?.platform ?? field.platform;
            const label = PLATFORM_LABELS[platform];
            const urlField = register(`platforms.${index}.url`);
            return (
              <li
                key={field.id}
                aria-label={`Platform ${index + 1}: ${label}`}
                className="rounded-2xl border border-line bg-card p-3 sm:p-4"
              >
                <div className={styles.platformRow}>
                  <div data-area="platform" className="min-w-0">
                    <FieldLabel htmlFor={`ob-platform-${index}`}>Platform</FieldLabel>
                    <div className="relative mt-1.5">
                      <select
                        id={`ob-platform-${index}`}
                        {...register(`platforms.${index}.platform`)}
                        className={cx(inputClass, 'appearance-none pr-10')}
                      >
                        {PLATFORMS.map((p) => (
                          <option key={p} value={p}>
                            {PLATFORM_LABELS[p]}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        aria-hidden
                        strokeWidth={1.5}
                        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-soft"
                      />
                    </div>
                  </div>
                  {/* Phones: remove sits beside the platform, so it comes right after it in tab order. */}
                  <RemoveButton
                    label={label}
                    onClick={() => removeRow(index)}
                    className="grid sm:hidden"
                  />
                  <div data-area="followers" className="mt-3 sm:mt-0">
                    <FieldLabel htmlFor={`ob-followers-${index}`}>Followers</FieldLabel>
                    <Controller
                      control={control}
                      name={`platforms.${index}.followers`}
                      render={({ field: f, fieldState }) => (
                        <FollowersInput
                          id={`ob-followers-${index}`}
                          value={f.value}
                          onChange={f.onChange}
                          onBlur={f.onBlur}
                          inputRef={f.ref}
                          invalid={Boolean(fieldState.error)}
                        />
                      )}
                    />
                  </div>
                  {/* From 640px: remove ends the platform and followers line. */}
                  <RemoveButton
                    label={label}
                    onClick={() => removeRow(index)}
                    className="hidden sm:grid"
                  />
                  <div data-area="followers-error">
                    <FieldError
                      id={`ob-followers-${index}-error`}
                      message={
                        rowErrors?.followers
                          ? 'Enter followers as a number, like 410K or 410000'
                          : undefined
                      }
                    />
                  </div>
                  <div data-area="url" className="mt-3">
                    <FieldLabel htmlFor={`ob-url-${index}`}>Profile link</FieldLabel>
                    <input
                      id={`ob-url-${index}`}
                      {...urlField}
                      onBlur={(e) => {
                        const fixed = withProtocol(e.target.value);
                        if (fixed !== e.target.value) {
                          setValue(`platforms.${index}.url`, fixed, {
                            shouldDirty: true,
                            shouldValidate: Boolean(rowErrors?.url),
                          });
                        }
                        // Pasting a TikTok link into a row still set to YouTube fixes the row,
                        // unless the person picked the platform themselves.
                        const detected = detectPlatform(fixed);
                        const picked = dirtyFields.platforms?.[index]?.platform;
                        if (detected && detected !== platform && !picked) {
                          setValue(`platforms.${index}.platform`, detected);
                        }
                        void urlField.onBlur(e);
                      }}
                      type="url"
                      inputMode="url"
                      autoComplete="url"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder={PLATFORM_URL_EXAMPLE[platform](handle)}
                      aria-invalid={rowErrors?.url ? true : undefined}
                      aria-describedby={`ob-url-${index}-error`}
                      className={cx(inputClass, 'mt-1.5')}
                    />
                  </div>
                  <div data-area="url-error">
                    <FieldError id={`ob-url-${index}-error`} message={rowErrors?.url?.message} />
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <button
          ref={addRef}
          type="button"
          onClick={addRow}
          disabled={fields.length >= MAX}
          aria-describedby={fields.length >= MAX ? 'ob-platforms-max' : undefined}
          className="btn btn-secondary h-11 px-4"
        >
          <Plus aria-hidden strokeWidth={1.5} className="size-4" />
          Add platform
        </button>
        <p className="tabular text-small text-ink-soft" aria-live="polite">
          {count > 0 ? (
            <>
              <span className="font-medium text-ink">{formatCompact(total)}</span> followers across{' '}
              {count} {count === 1 ? 'platform' : 'platforms'}
            </>
          ) : null}
        </p>
      </div>
      {fields.length >= MAX ? (
        <p id="ob-platforms-max" className="text-small text-ink-muted">
          That’s the limit of {MAX} platforms.
        </p>
      ) : null}
      <FieldError id="ob-platforms-error" message={listError} />
    </div>
  );
}

function RemoveButton({
  label,
  onClick,
  className,
}: {
  label: string;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      data-area="remove"
      onClick={onClick}
      aria-label={`Remove ${label}`}
      className={cx(
        styles.press,
        className,
        'size-11 place-items-center rounded-full text-ink-soft hover:bg-page hover:text-ink',
      )}
    >
      <X aria-hidden strokeWidth={1.5} className="size-5" />
    </button>
  );
}

/** Accepts "410K", "1.2M" or "410,000"; shows the full number once the field is left. */
function FollowersInput({
  id,
  value,
  onChange,
  onBlur,
  inputRef,
  invalid,
}: {
  id: string;
  value: number;
  onChange: (n: number) => void;
  onBlur: () => void;
  inputRef: React.Ref<HTMLInputElement>;
  invalid: boolean;
}) {
  const [text, setText] = useState(() => formatFull(value));
  const lastValue = useRef(value);

  // Follow outside changes (draft restore, cleaning blank rows) without fighting the person typing.
  useEffect(() => {
    const same = Object.is(value, lastValue.current);
    lastValue.current = value;
    if (!same && !Object.is(parseFollowers(text), value)) setText(formatFull(value));
  }, [value, text]);

  return (
    <input
      id={id}
      ref={inputRef}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseFollowers(e.target.value);
        lastValue.current = n;
        onChange(n);
      }}
      onBlur={() => {
        const n = parseFollowers(text);
        if (Number.isFinite(n)) setText(formatFull(n));
        onBlur();
      }}
      type="text"
      inputMode="text"
      autoComplete="off"
      spellCheck={false}
      placeholder="410K"
      aria-invalid={invalid ? true : undefined}
      aria-describedby={`${id}-error`}
      className={cx(inputClass, 'tabular mt-1.5')}
    />
  );
}
