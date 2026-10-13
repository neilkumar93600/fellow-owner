'use client';

import { Radio as RadioPrimitive } from '@base-ui/react/radio';
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group';
import { cn } from './cn';

export type RadioGroupProps<Value> = Omit<RadioGroupPrimitive.Props<Value>, 'className'> & {
  className?: string;
};

/**
 * Radio group: one choice of a few (a poll vote, a budget range). Arrow keys move the choice, Tab leaves
 * the group. Name it with `aria-labelledby` (a visible question or legend) or `aria-label`.
 *
 * <RadioGroup aria-labelledby="budget-label" name="budgetRange" defaultValue="500_2000">
 *   <label className="flex min-h-11 items-center gap-3 text-small text-ink">
 *     <RadioGroupItem value="500_2000" /> $500 to $2,000
 *   </label>
 * </RadioGroup>
 */
export function RadioGroup<Value>({ className, ...props }: RadioGroupProps<Value>) {
  return (
    <RadioGroupPrimitive<Value>
      data-slot="radio-group"
      className={cn('grid gap-1', className)}
      {...props}
    />
  );
}

export type RadioGroupItemProps<Value> = Omit<RadioPrimitive.Root.Props<Value>, 'className'> & {
  className?: string;
};

/**
 * A 20px white circle with a smoke border that fills Lake Blue with a white dot when chosen. States and
 * the 44px hit area match Checkbox: keep rows at least 44px apart (`min-h-11`).
 */
export function RadioGroupItem<Value>({ className, ...props }: RadioGroupItemProps<Value>) {
  return (
    <RadioPrimitive.Root
      data-slot="radio-group-item"
      className={cn(
        'relative inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-line-field bg-white transition-colors duration-150 ease-out-quart',
        'after:absolute after:-inset-3',
        'not-data-disabled:not-data-checked:not-aria-invalid:hover:border-ink-muted',
        'aria-invalid:border-danger data-checked:border-lake data-checked:bg-lake',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <RadioPrimitive.Indicator
        data-slot="radio-group-indicator"
        className="size-2 rounded-full bg-white"
      />
    </RadioPrimitive.Root>
  );
}
