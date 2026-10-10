'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { X } from 'lucide-react';
import type * as React from 'react';
import { useId } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Button } from './button';
import { cn } from './cn';
import { SCRIM } from './dialog';

export type SheetProps = Omit<DialogPrimitive.Root.Props, 'modal' | 'disablePointerDismissal'>;

/**
 * DESIGN.md Side panel. Below 1024px it is modal: the scrim shows, focus is trapped, the page cannot
 * scroll and a press outside closes it. From 1024px the page beside it stays usable: no scrim, no trap,
 * and presses or focus outside leave it open (a click on another row switches it through the screen's
 * ?item=). Esc closes it at every width. Screens control it with `open` and `onOpenChange`.
 */
export function Sheet(props: SheetProps) {
  const desktop = useMediaQuery('(min-width: 1024px)');
  return <DialogPrimitive.Root {...props} modal={!desktop} disablePointerDismissal={desktop} />;
}

export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

export type SheetContentProps = Omit<DialogPrimitive.Popup.Props, 'className' | 'initialFocus'> & {
  className?: string;
};

/**
 * The panel: 480px from the right edge, strong frosted glass (72%), 28px left corners, Overlay Soft; full width with
 * no radius below 640px. Enters with a 24px slide and a fade over 250ms ease-out-expo and leaves in
 * 150ms; under reduced motion it appears in place (no slide, and the global rule zeroes the fade). Focus
 * moves to the SheetHeader title on open and,
 * on close, to `finalFocus` (pass the row link so it does not land on the body).
 */
export function SheetContent({ className, ...props }: SheetContentProps) {
  const id = useId();
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className={cn(SCRIM, 'z-40 lg:hidden')} />
      <DialogPrimitive.Popup
        {...props}
        id={id}
        data-lenis-prevent=""
        initialFocus={() =>
          document.getElementById(id)?.querySelector<HTMLElement>('[data-sheet-title]') ?? true
        }
        className={cn(
          'glass-strong fixed inset-y-0 right-0 z-40 flex w-full flex-col rounded-none border-y-0 border-r-0 text-ink shadow-overlay outline-none sm:w-[480px] sm:rounded-l-panel',
          'transition-[translate,opacity] duration-250 ease-out-expo',
          'data-starting-style:translate-x-6 data-starting-style:opacity-0',
          'data-ending-style:translate-x-6 data-ending-style:opacity-0 data-ending-style:duration-150 data-ending-style:ease-out-quart',
          'motion-reduce:data-starting-style:translate-x-0 motion-reduce:data-ending-style:translate-x-0',
          className,
        )}
      />
    </DialogPrimitive.Portal>
  );
}

export interface SheetHeaderProps {
  /** The H2. It takes focus when the panel opens (tabIndex -1). */
  title: React.ReactNode;
  /** A status pill beside the title. */
  status?: React.ReactNode;
  closeLabel?: string;
  className?: string;
}

export function SheetHeader({ title, status, closeLabel = 'Close', className }: SheetHeaderProps) {
  return (
    <div className={cn('flex shrink-0 items-start gap-3 px-6 pt-6 pb-4', className)}>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2 pt-1.5">
        <DialogPrimitive.Title
          data-sheet-title=""
          tabIndex={-1}
          className="min-w-0 text-h2 text-ink outline-none"
        >
          {title}
        </DialogPrimitive.Title>
        {status}
      </div>
      <DialogPrimitive.Close render={<Button variant="ghost" aria-label={closeLabel} />}>
        <X />
      </DialogPrimitive.Close>
    </div>
  );
}

/** The panel's content; it scrolls while the header and footer stay put. */
export function SheetBody({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6', className)}
      {...props}
    />
  );
}

/** The action footer, pinned to the bottom (reply box, Shortlist, Archive, the coral primary). */
export function SheetFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-wrap items-center gap-3 px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]',
        className,
      )}
      {...props}
    />
  );
}
