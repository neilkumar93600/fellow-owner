'use client';

import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';
import { cn } from './cn';

export type ToggleGroupProps<Value extends string> = Omit<
  ToggleGroupPrimitive.Props<Value>,
  'className'
> & { className?: string };

/**
 * Toggle group: 2 to 6 options in a frosted glass pill (the 7 / 30 / 90 day range, Week / Month / List,
 * a platform multi-pick). Items are 40px mono caps pills: unpressed graphite with a white wash on hover,
 * pressed a periwinkle chip with an Ash hairline in ink (aria-pressed). Arrow keys move between items.
 * The pill scrolls sideways inside its own width when the options outrun a phone. Name it with
 * `aria-label`. The value is always an array; `multiple` allows several.
 *
 * One choice that can never be empty: control it and ignore the empty array a press on the pressed item
 * sends.
 * <ToggleGroup aria-label="Range" value={[days]} onValueChange={(next) => next[0] && setDays(next[0])}>
 *   <ToggleGroupItem value="7">7 days</ToggleGroupItem>
 *   <ToggleGroupItem value="30">30 days</ToggleGroupItem>
 * </ToggleGroup>
 * An icon-only item needs `aria-label`.
 */
export function ToggleGroup<Value extends string>({
  className,
  ...props
}: ToggleGroupProps<Value>) {
  return (
    <ToggleGroupPrimitive<Value>
      data-slot="toggle-group"
      className={cn(
        'glass scrollbar-band flex w-fit max-w-full items-center gap-1 rounded-full p-1',
        className,
      )}
      {...props}
    />
  );
}

export type ToggleGroupItemProps = Omit<TogglePrimitive.Props, 'className'> & {
  className?: string;
};

export function ToggleGroupItem({ className, ...props }: ToggleGroupItemProps) {
  return (
    <TogglePrimitive
      data-slot="toggle-group-item"
      className={cn(
        'press inline-flex h-10 min-w-10 shrink-0 items-center justify-center gap-2 rounded-full border border-transparent px-4 text-small tracking-tight whitespace-nowrap text-ink-soft uppercase',
        'not-data-pressed:not-data-disabled:hover:bg-white/60 not-data-pressed:not-data-disabled:hover:text-ink',
        'data-pressed:border-line data-pressed:bg-periwinkle data-pressed:font-medium data-pressed:text-ink',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.5]',
        className,
      )}
      {...props}
    />
  );
}
