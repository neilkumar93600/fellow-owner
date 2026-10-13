'use client';

import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';
import { Check } from 'lucide-react';
import { cn } from './cn';

export type CheckboxProps = Omit<CheckboxPrimitive.Root.Props, 'className'> & {
  className?: string;
};

/**
 * Checkbox: a 20px white box with a smoke border (3:1, like the fields) that turns Lake Blue with a white
 * check when ticked (6.1:1). Hover steps the border to ink-muted, `aria-invalid` turns it red, disabled
 * dims to 50%, keyboard focus is the global 2px ink ring. A transparent 44px hit area surrounds the box
 * for fan pages, so keep rows at least 44px apart (`min-h-11`) and their hit areas never overlap.
 *
 * Label it by wrapping, which makes the whole row pressable:
 * <label className="flex min-h-11 items-center gap-3 text-small text-ink">
 *   <Checkbox name="platforms" value="instagram" defaultChecked /> Instagram
 * </label>
 * Several that share one value array: wrap them in Base UI's CheckboxGroup (@base-ui/react/checkbox-group).
 */
export function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'relative inline-flex size-5 shrink-0 items-center justify-center rounded-[6px] border border-line-field bg-white text-white transition-colors duration-150 ease-out-quart',
        'after:absolute after:-inset-3',
        'not-data-disabled:not-data-checked:not-aria-invalid:hover:border-ink-muted',
        'aria-invalid:border-danger data-checked:border-lake data-checked:bg-lake',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="flex">
        <Check aria-hidden="true" strokeWidth={2.5} className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
