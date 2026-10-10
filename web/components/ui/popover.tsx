'use client';

import { Popover as PopoverPrimitive } from '@base-ui/react/popover';
import { cn } from './cn';

/**
 * DESIGN.md Popover and menu: white at 90% with a frost, radius 16, 8px padding, Overlay Soft, Body ink. Esc closes it
 * and focus returns to the trigger (Base UI). Compose a styled trigger through `render`:
 * `<PopoverTrigger render={<Button variant="ghost" aria-label="…" />}>…</PopoverTrigger>`.
 */
export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverClose = PopoverPrimitive.Close;

/** The popup surface, shared with the menu and the select list. Fades in 150ms; nothing moves. */
export const POPUP_SURFACE = cn(
  'max-h-[var(--available-height)] min-w-48 overflow-y-auto overscroll-contain rounded-lg border border-white/70 bg-white/90 p-2 text-body backdrop-blur-xl backdrop-saturate-150 text-ink shadow-overlay outline-none',
  'transition-opacity duration-150 ease-out-quart data-ending-style:opacity-0 data-starting-style:opacity-0',
);

export type PopoverContentProps = Omit<PopoverPrimitive.Popup.Props, 'className'> & {
  className?: string;
  side?: PopoverPrimitive.Positioner.Props['side'];
  align?: PopoverPrimitive.Positioner.Props['align'];
  sideOffset?: number;
};

export function PopoverContent({
  className,
  side = 'bottom',
  align = 'end',
  sideOffset = 8,
  ...props
}: PopoverContentProps) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        className="z-50"
      >
        {/* data-lenis-prevent: wheel events scroll the popup itself, not the smooth-scrolled page. */}
        <PopoverPrimitive.Popup
          data-lenis-prevent=""
          className={cn(POPUP_SURFACE, className)}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  );
}
