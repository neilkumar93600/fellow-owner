import { Archive } from 'lucide-react';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A question naming the thing: "Archive Fitness Crew?" */
  title: string;
  /** What happens, and whether it can be undone. */
  body: React.ReactNode;
  /** Repeats the verb of the button that opened it: "Archive community". */
  confirmLabel: string;
  /** Runs, then the dialog closes. */
  onConfirm: () => void;
  /** The confirm button's Signal Red icon. */
  icon?: React.ReactNode;
}

/**
 * DESIGN.md Dialog, for destructive confirmation only: Cancel (secondary) and the confirming verb as a
 * secondary pill with a Signal Red icon and Brick Red words. Focus is trapped while open and returns to
 * the trigger; Esc and Cancel close it.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  onConfirm,
  icon = <Archive />,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{body}</DialogDescription>
        <DialogFooter>
          <DialogClose render={<Button variant="secondary" />}>Cancel</DialogClose>
          <Button
            variant="destructive-secondary"
            icon={icon}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
