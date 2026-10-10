'use client';

import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';
import type * as React from 'react';
import { useId } from 'react';
import { cn } from './cn';

export interface TooltipProps {
  /** The tip: one short line in Small ink. */
  content: React.ReactNode;
  /** The trigger, rendered as is (a button, a link, or a focusable span such as the fit pill). */
  children: React.ReactElement;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  /**
   * Point the trigger's aria-describedby at the tip (default). Pass false when the trigger's own label
   * already says the same words, as on icon rail items whose aria-label is the tip.
   */
  describe?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  /** The popup. */
  className?: string;
}

/**
 * DESIGN.md Tooltip: Pure White, radius 12, Small ink, 280px at most, Overlay Soft. Opens after 300ms of
 * hover and at once on keyboard focus. WCAG 1.4.13: Esc closes it without moving focus, the pointer can
 * move onto it, and it stays while hovered or focused. Base UI leaves the ARIA to us: the popup is
 * role="tooltip" and stays mounted (hidden) so the trigger's aria-describedby always resolves.
 */
export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  describe = true,
  open,
  defaultOpen,
  onOpenChange,
  disabled,
  className,
}: TooltipProps) {
  const id = useId();
  return (
    <TooltipPrimitive.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      disabled={disabled}
    >
      <TooltipPrimitive.Trigger
        delay={300}
        render={children}
        aria-describedby={describe ? id : undefined}
      />
      <TooltipPrimitive.Portal keepMounted={describe}>
        <TooltipPrimitive.Positioner
          side={side}
          align={align}
          sideOffset={8}
          collisionPadding={8}
          className="z-50"
        >
          <TooltipPrimitive.Popup
            id={id}
            role="tooltip"
            className={cn(
              'max-w-[280px] rounded-sm bg-white px-3 py-2 text-small text-ink shadow-overlay',
              'transition-opacity duration-150 ease-out-quart data-ending-style:opacity-0 data-starting-style:opacity-0',
              className,
            )}
          >
            {content}
          </TooltipPrimitive.Popup>
        </TooltipPrimitive.Positioner>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
