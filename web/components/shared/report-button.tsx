'use client';

import {
  LIMITS,
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  type ReportReason,
} from '@fellow-owners/shared';
import { Flag } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, NativeSelect, TextArea } from '@/components/ui/field';
import { useFileReport } from '@/hooks/queries/use-reports';

/** A quiet "Report" button that opens a short form: a reason and an optional note. */
export function ReportButton({
  target,
  id,
  label = 'Report',
}: {
  target: 'post' | 'comment';
  id: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('spam');
  const [note, setNote] = useState('');
  const report = useFileReport();

  return (
    <>
      <Button
        variant="ghost"
        size="md"
        surface="glass"
        icon={<Flag />}
        aria-label={`${label} this ${target}`}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>Report this {target}</DialogTitle>
          <DialogDescription>
            The owner of this space sees your report. Your name is not shown to the author.
          </DialogDescription>
          <div className="flex flex-col gap-4">
            <Field label="Reason">
              <NativeSelect
                value={reason}
                onChange={(event) => setReason(event.target.value as ReportReason)}
              >
                {REPORT_REASONS.map((value) => (
                  <option key={value} value={value}>
                    {REPORT_REASON_LABELS[value]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Anything to add?" optional>
              <TextArea
                rows={3}
                maxLength={LIMITS.reports.noteMax}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
          </div>
          <DialogFooter>
            <DialogClose render={<Button variant="secondary" />}>Cancel</DialogClose>
            <Button
              loading={report.isPending}
              onClick={() =>
                report.mutate(
                  { target, id, reason, note: note.trim() },
                  { onSuccess: () => setOpen(false) },
                )
              }
            >
              Send report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
