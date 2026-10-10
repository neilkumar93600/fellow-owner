'use client';

import type { PromotionState } from '@fellow-owners/shared';
import { Check, ExternalLink, EyeOff, Send } from 'lucide-react';
import { useId, useState } from 'react';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { CopyButton } from '@/components/shared/copy-button';
import { Button } from '@/components/ui/button';

export interface PublishBarProps {
  state: PromotionState;
  /** Why the coral action is blocked, said beside it; null when it can run. */
  blocked: string | null;
  /** Drafts differ from the last save (a live promotion saves them; a draft publishes them). */
  dirty: boolean;
  /** A save, publish or unpublish is running. */
  pending?: boolean;
  /** The post as it goes out, for Copy. */
  copyText: string;
  /** The platform's composer (x.com/intent/post?text=… for X), opened in a new tab. */
  openHref: string;
  openLabel: string;
  onPublish: () => void;
  onSave: () => void;
  onUnpublish: () => void;
}

/**
 * The composer's actions under the summary well: the screen's one coral button (Publish, or Save drafts
 * once live), then Copy and Open in X side by side, then Take it down behind a confirm while live.
 */
export function PublishBar({
  state,
  blocked,
  dirty,
  pending = false,
  copyText,
  openHref,
  openLabel,
  onPublish,
  onSave,
  onUnpublish,
}: PublishBarProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const noteId = useId();
  const live = state === 'live';
  const note = blocked ?? (live && !dirty ? 'Live now. Edit a draft to save changes.' : null);

  return (
    <div className="flex flex-col gap-3">
      {live ? (
        <Button
          className="w-full"
          icon={<Check />}
          disabled={Boolean(blocked) || !dirty || pending}
          loading={pending}
          aria-describedby={note ? noteId : undefined}
          onClick={onSave}
        >
          Save drafts
        </Button>
      ) : (
        <Button
          className="w-full"
          icon={<Send />}
          disabled={Boolean(blocked) || pending}
          loading={pending}
          aria-describedby={note ? noteId : undefined}
          onClick={onPublish}
        >
          Publish
        </Button>
      )}
      {note ? (
        <p id={noteId} className="text-small text-ink-soft">
          {note}
        </p>
      ) : null}

      <div className="grid gap-3 @sm/panel:grid-cols-2">
        <CopyButton
          variant="secondary"
          surface="white"
          label="Copy"
          value={copyText}
          message="Post copied. Paste it where you post."
          className="w-full"
        />
        <Button
          variant="secondary"
          surface="white"
          icon={<ExternalLink />}
          className="w-full"
          render={<a href={openHref} target="_blank" rel="noopener noreferrer" />}
        >
          {openLabel}
          <span className="sr-only"> (opens in a new tab)</span>
        </Button>
      </div>

      {live ? (
        <Button
          variant="destructive"
          icon={<EyeOff />}
          className="self-start"
          disabled={pending}
          onClick={() => setConfirmOpen(true)}
        >
          Take it down
        </Button>
      ) : null}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Take down this spotlight?"
        body="Its page comes down and the link says it is no longer featured. The people who opened it so far stay in your numbers."
        confirmLabel="Take it down"
        icon={<EyeOff />}
        onConfirm={onUnpublish}
      />
    </div>
  );
}
