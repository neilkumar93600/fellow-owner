'use client';

import type { StudioSpace } from '@fellow-owners/shared';
import { useId } from 'react';
import { useUpdateSettings } from '@/hooks/queries/use-settings';
import { useStudioSpace } from '@/hooks/use-space';

/** Settings, Profile tab: whether fans' pitch trackers show a Read step (saves on change). */
export function ReadReceiptsToggle({ space: initialSpace }: { space: StudioSpace }) {
  const id = useId();
  const { data: space } = useStudioSpace(initialSpace);
  const update = useUpdateSettings();
  const checked = update.isPending
    ? (update.variables?.showReadReceipts ?? true)
    : (space?.showReadReceipts ?? initialSpace.showReadReceipts);

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="glass-strong flex flex-col gap-2 rounded-panel p-6"
    >
      <h2 id={`${id}-title`} className="text-h2 text-ink">
        Read receipts
      </h2>
      <label htmlFor={id} className="flex min-h-10 items-center gap-3 text-body text-ink">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={update.isPending}
          onChange={(event) => update.mutate({ showReadReceipts: event.target.checked })}
          className="size-5 shrink-0 accent-ink"
        />
        Let fans see when I’ve read their pitch
      </label>
      <p className="text-small text-ink-muted">
        When this is off, fans see Sent, Shortlisted and Replied, but never when you opened a pitch.
      </p>
    </section>
  );
}
