'use client';

import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import type * as React from 'react';
import { cn } from './cn';

/**
 * DESIGN.md Dialog, for destructive confirmation only: strong frosted glass, radius 28, 440px wide (the screen
 * minus 32px on phones), Overlay Soft, over the ink 20% scrim at every width. Focus is trapped inside
 * and returns to the trigger on close; Esc and Cancel (a `DialogClose`) close it. Controlled through
 * `open` and `onOpenChange` when a menu item opens it.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

/** The ink 20% scrim behind dialogs (and side panels below 1024px). Fades with its popup. */
export const SCRIM = cn(
  'fixed inset-0 bg-scrim transition-opacity duration-250 ease-out-expo',
  'data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:opacity-0',
);

export type DialogContentProps = Omit<DialogPrimitive.Popup.Props, 'className'> & {
  className?: string;
};

export function DialogContent({ className, ...props }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className={cn(SCRIM, 'z-50')} />
      <DialogPrimitive.Popup
        data-lenis-prevent=""
        className={cn(
          'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[440px] max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto overscroll-contain glass-strong rounded-panel p-6 text-ink shadow-overlay outline-none',
          'transition-opacity duration-250 ease-out-expo data-ending-style:opacity-0 data-ending-style:duration-150 data-starting-style:opacity-0',
          className,
        )}
        {...props}
      />
    </DialogPrimitive.Portal>
  );
}

/** H2, labels the dialog. */
export function DialogTitle({
  className,
  ...props
}: Omit<DialogPrimitive.Title.Props, 'className'> & { className?: string }) {
  return <DialogPrimitive.Title className={cn('text-h2 text-ink', className)} {...props} />;
}

/** Body ink-soft under the title; describes the dialog. */
export function DialogDescription({
  className,
  ...props
}: Omit<DialogPrimitive.Description.Props, 'className'> & { className?: string }) {
  return (
    <DialogPrimitive.Description
      className={cn('mt-2 text-body text-ink-soft', className)}
      {...props}
    />
  );
}

/** Actions at the end of the dialog: Cancel first, the confirming verb last, side by side. */
export function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}
