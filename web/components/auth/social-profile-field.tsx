'use client';

import { Select } from '@base-ui/react/select';
import {
  LIMITS,
  PLATFORM_LABELS,
  SOCIAL_PLATFORMS,
  type SocialPlatform,
} from '@fellow-owners/shared';
import { Check, ChevronDown } from 'lucide-react';
import type * as React from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import styles from './auth.module.css';
import { cx } from './auth-classes';
import { FieldMessage } from './auth-ui';
import { PlatformIcon } from './platform-icons';

/** The platform picker as react-hook-form's Controller hands it over. */
export interface PlatformControl {
  value: SocialPlatform;
  onChange: (value: SocialPlatform) => void;
  onBlur: () => void;
  ref: React.Ref<HTMLButtonElement>;
}

/**
 * "Social profile (optional)": one field box, like the onboarding handle, holding a platform picker,
 * an "@" and the handle. The picker's trigger shows only the platform's mark: aria-label names it
 * "Platform", and the visually hidden name inside Value becomes its value (Chrome exposes the
 * combobox as "Platform", value "Instagram"). The list keeps the names beside the marks. The box takes the focus ring from
 * whichever control has focus; the trigger segment also tints and draws its own inset ring, so it is
 * clear which one that is.
 */
export function SocialProfileField({
  platform,
  handle,
  error,
  className,
}: {
  platform: PlatformControl;
  handle: UseFormRegisterReturn<'socialHandle'>;
  error?: string;
  className?: string;
}) {
  return (
    <fieldset className={cx('min-w-0', className)}>
      <legend className="text-small font-medium text-ink">
        Social profile<span className="font-normal text-ink-muted"> (optional)</span>
      </legend>
      <div className={cx(styles.box, 'mt-1.5')} data-invalid={error ? 'true' : undefined}>
        <Select.Root<SocialPlatform>
          value={platform.value}
          onValueChange={(value) => {
            if (value) platform.onChange(value);
          }}
        >
          <Select.Trigger
            ref={platform.ref}
            id="social-platform"
            aria-label="Platform"
            aria-describedby="social-hint"
            onBlur={platform.onBlur}
            className="flex w-16 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-l-[15px] border-r border-line pl-1 transition-colors duration-150 ease-(--ease-out-quart) select-none hover:bg-page focus-visible:bg-page focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink data-popup-open:bg-page"
          >
            <Select.Value className="flex">
              {(value: SocialPlatform) => (
                <>
                  <PlatformIcon platform={value} />
                  <span className="sr-only">{PLATFORM_LABELS[value]}</span>
                </>
              )}
            </Select.Value>
            <Select.Icon className="flex text-ink-soft">
              <ChevronDown size={16} strokeWidth={1.5} />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            {/* Below the trigger and aligned to its start, never laid over it. */}
            <Select.Positioner
              alignItemWithTrigger={false}
              side="bottom"
              align="start"
              sideOffset={8}
              collisionPadding={16}
              className="z-50 outline-none"
            >
              <Select.Popup className="min-w-48 origin-(--transform-origin) rounded-lg bg-card-strong p-2 shadow-[0_24px_64px_-16px_rgba(45,45,48,0.22)] outline-none transition-[opacity,scale] duration-150 ease-(--ease-out-quart) data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:transition-none">
                <Select.List
                  aria-label="Platform"
                  className="max-h-(--available-height) overflow-y-auto outline-none"
                >
                  {SOCIAL_PLATFORMS.map((value) => (
                    <Select.Item
                      key={value}
                      value={value}
                      className="grid h-10 cursor-pointer grid-cols-[20px_1fr_16px] items-center gap-3 rounded-sm px-3 text-body text-ink outline-none select-none data-highlighted:bg-page pointer-coarse:h-11"
                    >
                      <PlatformIcon platform={value} />
                      <Select.ItemText>{PLATFORM_LABELS[value]}</Select.ItemText>
                      <Select.ItemIndicator className="col-start-3 flex">
                        <Check size={16} strokeWidth={1.5} />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
        <span aria-hidden className={styles.at}>
          @
        </span>
        <input
          id="social-handle"
          type="text"
          aria-label="Handle"
          aria-invalid={error ? true : undefined}
          aria-describedby={cx('social-hint', error && 'social-error')}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoComplete="off"
          maxLength={LIMITS.socialHandle.max + 1}
          placeholder="yourhandle"
          className={styles.bareInput}
          {...handle}
        />
      </div>
      <p id="social-hint" className="mt-1.5 text-small text-ink-muted">
        Your main platform, so creators and fans can find you.
      </p>
      <FieldMessage id="social-error" message={error} />
    </fieldset>
  );
}
