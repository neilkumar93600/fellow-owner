'use client';

import { LIMITS, type StudioCommunity } from '@fellow-owners/shared';
import { Send } from 'lucide-react';
import { useState } from 'react';
import { SidePanel } from '@/components/shared/side-panel';
import { Button } from '@/components/ui/button';
import { Field, NativeSelect, TextArea, TextField } from '@/components/ui/field';
import { useCreateChallenge } from '@/hooks/queries/use-challenges';
import { toastSuccess } from '@/lib/toast';

const FORM_ID = 'new-challenge-form';
const TITLE = LIMITS.post.title;
const BODY_MAX = 2000;

/** "2026-10-16T18:00", the value a datetime-local input reads, in the browser's time zone. */
function localInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** A week from now at 6 pm: long enough to enter, short enough to feel live. */
function defaultDue(): string {
  const due = new Date(Date.now() + 7 * 864e5);
  due.setHours(18, 0, 0, 0);
  return localInput(due);
}

interface ChallengeFormValues {
  title: string;
  body?: string;
  communityId: string | null;
  dueAt: string;
}

export interface NewChallengeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communities: StudioCommunity[];
}

/**
 * New challenge, in the side panel: a title, the prompt, one community (or all) and a due date and time.
 * The form unmounts on close, so every open starts fresh. Coral Post challenge is the panel's one
 * primary action; nothing reaches fans until it is pressed.
 */
export function NewChallengeSheet({ open, onOpenChange, communities }: NewChallengeSheetProps) {
  const create = useCreateChallenge();
  return (
    <SidePanel
      open={open}
      onOpenChange={onOpenChange}
      title="New challenge"
      footer={
        <>
          <Button
            type="submit"
            form={FORM_ID}
            icon={<Send />}
            loading={create.isPending}
            className="flex-1"
          >
            Post challenge
          </Button>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </>
      }
    >
      <NewChallengeForm
        communities={communities}
        pending={create.isPending}
        onSubmit={(input) =>
          create.mutate(input, {
            onSuccess: () => {
              toastSuccess('Challenge posted. The fans it is for have been told.');
              onOpenChange(false);
            },
          })
        }
      />
    </SidePanel>
  );
}

function NewChallengeForm({
  communities,
  pending,
  onSubmit,
}: {
  communities: StudioCommunity[];
  pending: boolean;
  onSubmit: (input: ChallengeFormValues) => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [communityId, setCommunityId] = useState('');
  const [due, setDue] = useState(defaultDue);
  const [tried, setTried] = useState(false);
  const [minDue] = useState(() => localInput(new Date()));

  const cleanTitle = title.trim();
  const titleError =
    cleanTitle.length < TITLE.min || cleanTitle.length > TITLE.max
      ? `Give it a title of ${TITLE.min} to ${TITLE.max} characters.`
      : undefined;
  const dueAt = new Date(due);
  const dueError =
    Number.isNaN(dueAt.getTime()) || dueAt.getTime() <= Date.now()
      ? 'Pick a time in the future.'
      : undefined;

  return (
    <form
      id={FORM_ID}
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setTried(true);
        if (pending || titleError || dueError || body.length > BODY_MAX) return;
        onSubmit({
          title: cleanTitle,
          body: body.trim() || undefined,
          communityId: communityId || null,
          dueAt: dueAt.toISOString(),
        });
      }}
    >
      <Field
        label="Title"
        helper="A clear ask, like “Best $10 meal in your city”."
        error={tried ? titleError : undefined}
        count={{ value: title.length, max: TITLE.max }}
      >
        <TextField value={title} onChange={(event) => setTitle(event.target.value)} />
      </Field>
      <Field
        label="What to share"
        optional
        helper="Say what an entry needs: a photo, where it is, what it cost."
        count={{ value: body.length, max: BODY_MAX }}
      >
        <TextArea rows={4} value={body} onChange={(event) => setBody(event.target.value)} />
      </Field>
      <Field label="Who it is for">
        <NativeSelect value={communityId} onChange={(event) => setCommunityId(event.target.value)}>
          <option value="">All communities</option>
          {communities
            .filter((community) => !community.archivedAt)
            .map((community) => (
              <option key={community.id} value={community.id}>
                {community.name}
              </option>
            ))}
        </NativeSelect>
      </Field>
      <Field label="Due" error={tried ? dueError : undefined}>
        <TextField
          type="datetime-local"
          min={minDue}
          value={due}
          onChange={(event) => setDue(event.target.value)}
        />
      </Field>
    </form>
  );
}
