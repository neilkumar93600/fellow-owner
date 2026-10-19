'use client';

import { LIMITS } from '@fellow-owners/shared';
import { MessageSquareHeart } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { AccountCard } from '@/components/account/account-card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, TextArea } from '@/components/ui/field';
import { useStudioSpace } from '@/hooks/use-space';
import { submitSupportRequest } from '@/lib/api/support';
import { useSession } from '@/lib/auth-client';
import { errorMessage } from '@/lib/toast';

const S = LIMITS.support;
// The prefix and the consent suffix count against the API's message cap.
const PREFIX = '[Product feedback] ';
const SUFFIX_ROOM = '\n\nQuote consent: yes'.length;

/** Settings > Account: product feedback to the founder, with explicit consent to be quoted. */
export function FeedbackCard() {
  const space = useStudioSpace().data;
  const session = useSession().data;
  const [message, setMessage] = useState('');
  const [quote, setQuote] = useState(false);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();

  // The demo creator is not a real person; there is nobody to quote.
  if (!space || space.isDemo || !session?.user.email) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !session) return;
    if (message.trim().length < S.messageMin) {
      setError(`Write at least ${S.messageMin} characters.`);
      return;
    }
    setError(undefined);
    setPending(true);
    try {
      await submitSupportRequest({
        kind: 'contact',
        name: space?.ownerName || session.user.name || undefined,
        email: session.user.email,
        // ponytail: consent lives in the message text; add a kind + column if feedback volume grows.
        message: `${PREFIX}${message.trim()}\n\nQuote consent: ${quote ? 'yes' : 'no'}`,
      });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, 'Could not send that. Try again.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <AccountCard icon={MessageSquareHeart} tint="aqua" title="Tell the founder" wide>
      {done ? (
        <p aria-live="polite" className="text-body text-ink">
          Thanks. The founder reads every note.
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="flex w-full max-w-xl flex-col gap-3">
          <Field label={<span className="sr-only">Your note</span>} error={error}>
            <TextArea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={S.messageMax - PREFIX.length - SUFFIX_ROOM}
              placeholder="What works, what does not, what is missing?"
            />
          </Field>
          {/* biome-ignore lint/a11y/noLabelWithoutControl: the label wraps Base UI's checkbox (see ui/checkbox.tsx). */}
          <label className="flex min-h-11 items-center gap-3 text-small text-ink">
            <Checkbox checked={quote} onCheckedChange={(value) => setQuote(value === true)} />
            You can quote me by name in Fellow Owners' materials.
          </label>
          <Button type="submit" loading={pending} className="self-start">
            Send
          </Button>
        </form>
      )}
    </AccountCard>
  );
}
