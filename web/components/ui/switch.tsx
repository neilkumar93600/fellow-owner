'use client';

import { Switch as SwitchPrimitive } from '@base-ui/react/switch';
import { cn } from './cn';

export type SwitchProps = Omit<SwitchPrimitive.Root.Props, 'className'> & { className?: string };

/**
 * Switch: a setting that applies at once ("Feedback wanted", "Media kit is public"). A 44 by 24 pill:
 * off is white with a smoke border and a smoke knob, on is Lake Blue with a white knob (hover darkens
 * it to lake-hover). The knob slides in 150ms, instantly under reduced motion. The hit area is 44px tall
 * for fan pages. Label it by wrapping, or with `aria-labelledby` when the words sit apart:
 *
 * <label className="flex min-h-11 items-center justify-between gap-4 text-small text-ink">
 *   Feedback wanted <Switch defaultChecked />
 * </label>
 */
export function Switch({ className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-line-field bg-white p-0.5 transition-colors duration-150 ease-out-quart',
        'after:absolute after:inset-x-0 after:-inset-y-2.5',
        'not-data-disabled:not-data-checked:not-aria-invalid:hover:border-ink-muted',
        'not-data-disabled:data-checked:hover:border-lake-hover not-data-disabled:data-checked:hover:bg-lake-hover',
        'aria-invalid:border-danger data-checked:border-lake data-checked:bg-lake',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-[18px] rounded-full bg-smoke transition-[translate,background-color] duration-150 ease-out-quart data-checked:translate-x-5 data-checked:bg-white"
      />
    </SwitchPrimitive.Root>
  );
}
