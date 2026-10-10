import type * as React from 'react';
import {
  Sheet,
  SheetBody,
  SheetContent,
  type SheetContentProps,
  SheetFooter,
  SheetHeader,
} from '@/components/ui/sheet';

export interface SidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The H2; it takes focus when the panel opens. */
  title: React.ReactNode;
  /** A status pill beside the title. */
  status?: React.ReactNode;
  children: React.ReactNode;
  /** The sticky action footer: reply box, Shortlist, Archive, the coral primary. */
  footer?: React.ReactNode;
  /** Where focus lands on close: pass the row's primary link (DESIGN.md), else the previous focus. */
  finalFocus?: SheetContentProps['finalFocus'];
}

/**
 * DESIGN.md Side panel: the 480px Pure White sheet from the right with its header (H2, status pill,
 * close), a scrolling body and a sticky footer. Modal with a scrim below 1024px; beside the page on
 * desktop. The screen controls it, so the row's ?item= (or local state) decides what it shows.
 */
export function SidePanel({
  open,
  onOpenChange,
  title,
  status,
  children,
  footer,
  finalFocus,
}: SidePanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent finalFocus={finalFocus}>
        <SheetHeader title={title} status={status} />
        <SheetBody>{children}</SheetBody>
        {footer ? <SheetFooter>{footer}</SheetFooter> : null}
      </SheetContent>
    </Sheet>
  );
}
