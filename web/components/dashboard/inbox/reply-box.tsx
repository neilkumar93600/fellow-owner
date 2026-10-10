'use client';

import { LIMITS, pitchReplySchema } from '@fellow-owners/shared';
import { Send, Sparkles, Undo2 } from 'lucide-react';
import type * as React from 'react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, TextArea } from '@/components/ui/field';
import { useSuggestReply } from './use-suggest-reply';

const MAX = LIMITS.pitch.reply.max;

/** Three dots that bounce in turn (still under reduced motion). */
export function TypingDots() {
  return (
    <span aria-hidden="true" className="inline-flex items-center gap-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          style={{ animationDelay: `${delay}ms` }}
          className="size-1.5 rounded-full bg-current motion-safe:animate-bounce"
        />
      ))}
    </span>
  );
}

export interface ReplyBoxProps {
  /** The message this answers: "Draft in my voice" asks the AI for a reply to it. */
  pitchId: string;
  /** The sender, for the label: "Reply to Uma". */
  name: string;
  /** Gets the trimmed reply once it passes pitchReplySchema. */
  onSend: (reply: string) => void;
  /** Shortlist and Archive (or Restore), above the reply. Omit it where the box stands alone. */
  actions?: React.ReactNode;
}

/**
 * A reply to one fan message: the optional status actions, "Draft in my voice" (the AI writes, the text
 * lands in the field and stays editable; the creator still presses Send), the reply with its character
 * count, then Send reply. Validates with the shared schema the API uses. Key it by message, so a draft
 * never carries over to another one.
 */
export function ReplyBox({ pitchId, name, onSend, actions }: ReplyBoxProps) {
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);
  // What the field held before the last draft, so one click brings it back.
  const before = useRef<string | null>(null);
  const { draft, stop, pending, typing, error: draftError } = useSuggestReply(pitchId, setReply);
  const busy = pending || typing;

  return (
    <form
      noValidate
      className="flex w-full flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        stop();
        const result = pitchReplySchema.safeParse(reply);
        if (!result.success) {
          setError(result.error.issues[0]?.message ?? 'Write a reply');
          return;
        }
        onSend(result.data);
        setReply('');
        setError(null);
        before.current = null;
      }}
    >
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="md"
          surface="white"
          icon={<Sparkles />}
          aria-busy={pending}
          // aria-disabled (not disabled) keeps focus on the button while the draft is written.
          aria-disabled={busy || undefined}
          onClick={() => {
            if (busy) return;
            before.current = reply;
            void draft();
          }}
        >
          {pending ? (
            <>
              Drafting <TypingDots />
            </>
          ) : (
            'Draft in my voice'
          )}
        </Button>
        {before.current !== null && !busy && reply !== before.current ? (
          <Button
            type="button"
            variant="ghost"
            size="md"
            surface="white"
            icon={<Undo2 />}
            className="text-ink-soft"
            onClick={() => {
              setReply(before.current ?? '');
              before.current = null;
            }}
          >
            Undo draft
          </Button>
        ) : null}
        <span role="status" className="sr-only">
          {pending ? 'Drafting a reply in your voice' : ''}
        </span>
      </div>
      <Field
        label={`Reply to ${name.split(' ')[0]}`}
        helper={
          draftError ? (
            <span role="alert" className="text-danger-deep">
              {draftError}
            </span>
          ) : (
            'The AI only drafts. You edit it and press Send. They see it in My space.'
          )
        }
        count={{ value: reply.length, max: MAX }}
        error={error}
      >
        <TextArea
          name="reply"
          rows={4}
          value={reply}
          placeholder="Thanks for writing. Here is what happens next."
          onChange={(event) => {
            stop();
            setReply(event.target.value);
            if (error) setError(null);
          }}
        />
      </Field>
      <Button type="submit" icon={<Send />} className="w-full" disabled={busy}>
        Send reply
      </Button>
    </form>
  );
}
