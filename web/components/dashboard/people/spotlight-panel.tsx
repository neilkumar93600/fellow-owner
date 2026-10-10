'use client';

import type { FanSpotlight } from '@fellow-owners/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { SidePanel } from '@/components/shared/side-panel';
import { Button } from '@/components/ui/button';
import { Field, TextArea } from '@/components/ui/field';
import { studioKeys } from '@/hooks/use-space';
import { ApiError, apiFetch } from '@/lib/fetcher';
import { toastError, toastSuccess } from '@/lib/toast';

/** The note's ceiling (spotlightSchema: 1 to 280 characters). */
const MAX = 280;

const base = (membershipId: string) =>
  `/api/studio/people/${encodeURIComponent(membershipId)}/spotlight`;

export interface SpotlightPanelProps {
  /** The fan's membership id; null closes the panel. */
  membershipId: string | null;
  /** The fan's name when the list has them; the panel still works without it. */
  name?: string;
  onClose: () => void;
}

/**
 * The Spotlight side panel: the AI drafts a shout-out in Mira's voice, she edits it (280 characters at
 * most, counted) and saves it with PUT. Nothing goes to the fan until she saves. A 404 from the draft or
 * save means the fan left her space; a 501 or 503 draft leaves an empty box to write in.
 */
export function SpotlightPanel({ membershipId, name, onClose }: SpotlightPanelProps) {
  const [note, setNote] = useState('');
  const [unavailable, setUnavailable] = useState(false);
  // The id last drafted for, so reopening the panel for a new fan drafts again.
  const drafted = useRef<string | null>(null);
  // The text of the last AI draft, so a hand-edited note is not replaced without asking.
  const lastDraft = useRef('');

  const gone = () => {
    toast.info('This fan is no longer in your space');
    onClose();
  };

  const draft = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ note: string }>(`${base(id)}/draft`, { method: 'POST', json: {} }),
    // A response for a fan the panel has since moved off is stale: ignore it.
    onSuccess: (data, id) => {
      if (id !== drafted.current) return;
      setUnavailable(false);
      lastDraft.current = data.note.slice(0, MAX);
      setNote(lastDraft.current);
    },
    onError: (error, id) => {
      if (id !== drafted.current) return;
      if (error instanceof ApiError && error.status === 404) return gone();
      if (error instanceof ApiError && (error.status === 501 || error.status === 503)) {
        setUnavailable(true);
        return;
      }
      toastError(error, {
        fallback: 'The draft did not come through. Write your own or try again.',
      });
    },
  });

  const save = useMutation({
    mutationFn: (input: { id: string; note: string }) =>
      apiFetch<FanSpotlight>(base(input.id), { method: 'PUT', json: { note: input.note } }),
    onSuccess: () => {
      toastSuccess(`${name ?? 'The fan'} is in your spotlight.`);
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 404) return gone();
      toastError(error);
    },
  });

  const queryClient = useQueryClient();
  const clear = useMutation({
    mutationFn: (id: string) => apiFetch<void>(base(id), { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: studioKeys.all });
      toastSuccess(`${name ?? 'The fan'} is no longer in your spotlight.`);
      onClose();
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 404) return gone();
      toastError(error);
    },
  });

  const { mutate: requestDraft } = draft;
  useEffect(() => {
    if (!membershipId) {
      drafted.current = null;
      return;
    }
    if (drafted.current === membershipId) return;
    drafted.current = membershipId;
    setNote('');
    lastDraft.current = '';
    setUnavailable(false);
    requestDraft(membershipId);
  }, [membershipId, requestDraft]);

  const trimmed = note.trim();
  const tooLong = note.length > MAX;

  return (
    <SidePanel
      open={membershipId !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={name ? `Spotlight ${name}` : 'Spotlight a fan'}
      footer={
        <>
          <Button
            variant="ghost"
            icon={<Trash2 />}
            loading={clear.isPending}
            disabled={!membershipId || clear.isPending || save.isPending}
            onClick={() => {
              if (!membershipId) return;
              if (!window.confirm('Remove this fan from your spotlight?')) return;
              clear.mutate(membershipId);
            }}
          >
            Remove spotlight
          </Button>
          <Button
            variant="secondary"
            icon={<RefreshCw />}
            loading={draft.isPending}
            onClick={() => {
              if (!membershipId) return;
              if (
                note.trim() &&
                note !== lastDraft.current &&
                !window.confirm('Replace your edited note with a new draft?')
              )
                return;
              requestDraft(membershipId);
            }}
          >
            New draft
          </Button>
          <Button
            icon={<Check />}
            loading={save.isPending}
            disabled={!membershipId || trimmed.length === 0 || tooLong || draft.isPending}
            onClick={() => membershipId && save.mutate({ id: membershipId, note: trimmed })}
          >
            Save spotlight
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-body text-ink">
          A short shout-out that shows on your page under Fans of the week. The AI drafts it in your
          voice, you edit it, and nothing is shared until you save.
        </p>
        {unavailable ? (
          <p role="status" className="text-small text-ink-soft">
            Drafting is not available right now. Write your own note below.
          </p>
        ) : null}
        <Field label="Your note" count={{ value: note.length, max: MAX }}>
          <TextArea
            value={draft.isPending ? '' : note}
            rows={7}
            placeholder={draft.isPending ? 'Drafting in your voice...' : 'Say why this fan shines'}
            readOnly={draft.isPending}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        {draft.isPending ? (
          <p role="status" className="inline-flex items-center gap-2 text-small text-ink-soft">
            <Sparkles aria-hidden="true" className="size-4" />
            Drafting in your voice
          </p>
        ) : null}
      </div>
    </SidePanel>
  );
}
