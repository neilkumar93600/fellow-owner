'use client';

import { Select as SelectPrimitive } from '@base-ui/react/select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from './cn';
import { POPUP_SURFACE } from './popover';

export interface SelectOption<V extends string> {
  value: V;
  label: string;
}

export interface SelectProps<V extends string> {
  /** The accessible name. With `showLabel` it also leads the trigger: "Sort: Fit". */
  label: string;
  showLabel?: boolean;
  options: readonly SelectOption<V>[];
  value?: V;
  defaultValue?: V;
  onValueChange?: (value: V) => void;
  disabled?: boolean;
  /** Submits the value with a form. */
  name?: string;
  /** Which trigger edge the list lines up with; toolbar dropdowns sit at the right, so `end`. */
  align?: 'start' | 'end';
  /** The trigger. */
  className?: string;
}

/**
 * DESIGN.md toolbar dropdown (also the chart range control): a Pure White button, 40px tall, radius 12,
 * no outline, Body label and a 16px chevron, matched to the search square. It opens a Pure White list
 * below it (radius 16, Overlay Soft, 40px rows) with a check on the selected row. Values are strings,
 * so they round-trip through the URL.
 */
export function Select<V extends string>({
  label,
  showLabel = false,
  options,
  value,
  defaultValue,
  onValueChange,
  disabled,
  name,
  align = 'end',
  className,
}: SelectProps<V>) {
  return (
    <SelectPrimitive.Root
      items={options}
      value={value}
      defaultValue={defaultValue}
      onValueChange={(next) => {
        if (next !== null) onValueChange?.(next);
      }}
      disabled={disabled}
      name={name}
    >
      <SelectPrimitive.Trigger
        aria-label={label}
        className={cn(
          'press inline-flex h-10 shrink-0 items-center gap-2 rounded-sm border border-white/60 bg-white/72 px-4 text-body backdrop-blur-xl whitespace-nowrap text-ink select-none',
          'not-data-disabled:hover:bg-white/90 data-popup-open:bg-white/90 data-disabled:cursor-not-allowed data-disabled:opacity-50',
          className,
        )}
      >
        {showLabel ? <span aria-hidden="true">{label}:</span> : null}
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon className="flex">
          <ChevronDown aria-hidden="true" strokeWidth={1.5} className="size-4" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner
          alignItemWithTrigger={false}
          side="bottom"
          align={align}
          sideOffset={8}
          collisionPadding={8}
          className="z-50"
        >
          <SelectPrimitive.Popup
            data-lenis-prevent=""
            className={cn(POPUP_SURFACE, 'min-w-[max(var(--anchor-width),12rem)]')}
          >
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className={cn(
                  'grid h-10 cursor-pointer grid-cols-[1fr_1rem] items-center gap-3 rounded-sm px-3 text-body text-ink select-none',
                  'transition-colors duration-150 ease-out-quart data-highlighted:bg-ink/5',
                )}
              >
                <SelectPrimitive.ItemText className="truncate">{option.label}</SelectPrimitive.ItemText>
                <SelectPrimitive.ItemIndicator className="flex">
                  <Check aria-hidden="true" strokeWidth={1.5} className="size-4" />
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
