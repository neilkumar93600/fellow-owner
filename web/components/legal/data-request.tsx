'use client';

import { emailSchema } from '@fellow-owners/shared';
import { Send } from 'lucide-react';
import { type FormEvent, useRef, useState } from 'react';
import { submitSupportRequest } from '@/api/support';
import { CopyButton } from '@/components/shared/copy-button';
import { Button } from '@/components/ui/button';
import { Field, TextField } from '@/components/ui/field';
import { ApiError } from '@/lib/fetcher';
import { CONTACT, MIN_AGE } from '@/lib/legal';
import { toastSuccess } from '@/lib/toast';

type Kind = 'delete' | 'export' | 'minor' | 'consent';

const SUPPORT_KIND = {
  delete: 'privacy_delete',
  export: 'privacy_export',
  minor: 'privacy_delete',
  consent: 'privacy_other',
} as const;

const KINDS: readonly { value: Kind; label: string; subject: string; ask: string }[] = [
  {
    value: 'delete',
    label: 'Delete my account',
    subject: 'Request: delete my account and personal data',
    ask: 'Please delete my Fellow Owners account and the personal data linked to it, under GDPR Article 17, the CCPA/CPRA and any other privacy law that applies to me. I understand this removes my account, profile, community joins and private ideas, and that backups roll off within 30 days.',
  },
  {
    value: 'export',
    label: 'Export my data',
    subject: 'Request: a copy of my personal data',
    ask: 'Please send me a copy of the personal data you hold about my account, in a structured, machine-readable format, under GDPR Article 20 and the CCPA/CPRA.',
  },
  {
    value: 'minor',
    label: 'Delete a minor’s account',
    subject: `Request: delete the account of someone under ${MIN_AGE}`,
    ask: `I am a parent or legal guardian. This account belongs to someone under ${MIN_AGE}. Please delete the account and everything it posted, as your privacy policy describes. You can reach me at this address.`,
  },
  {
    value: 'consent',
    label: 'Withdraw consent',
    subject: 'Request: withdraw consent',
    ask: 'I withdraw any optional consent I have given. Please send this address nothing but sign-in codes and privacy notices.',
  },
];

/**
 * The privacy request writer, inline in the privacy policy (it replaces the old modal). Pick a request,
 * add the account email, and it sends the request to the support API (stored, emailed to the team, with
 * a confirmation to the sender). Copy still copies the text. The email is checked with the shared schema.
 */
export function DataRequest() {
  const [kind, setKind] = useState<Kind>('delete');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const request = KINDS.find((item) => item.value === kind) ?? KINDS[0];
  const body = `Hello,\n\n${request.ask}\n\nAccount email: ${email.trim() || '[your account email]'}\n\nThank you`;

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Enter a valid email');
      inputRef.current?.focus();
      return;
    }
    setPending(true);
    try {
      await submitSupportRequest({
        kind: SUPPORT_KIND[kind],
        email,
        message: `${request.subject}\n\n${request.ask}`,
      });
      toastSuccess('Request received. We sent a confirmation to your email.');
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === 'rate_limited'
          ? 'Too many requests from here. Please try again in an hour.'
          : `Something went wrong. Copy the request and email it to ${CONTACT.privacy}.`,
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      noValidate
      onSubmit={send}
      className="mt-4 mb-3 rounded-3xl border border-white/70 bg-white/60 p-5 sm:p-6"
    >
      <h3 className="text-label-strong text-ink">Write a privacy request</h3>
      <p className="mt-1 max-w-[60ch] text-small text-ink-soft">
        Pick what you need and add the account email. We send the request to our privacy team and
        email you a confirmation.
      </p>

      <fieldset className="mt-5">
        <legend className="text-small-strong text-ink">What do you need?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {KINDS.map((item) => (
            <label
              key={item.value}
              className="press flex min-h-11 cursor-pointer items-center gap-3 rounded-full border border-line px-4 py-2 text-body text-ink hover:bg-page has-checked:border-ink has-checked:text-label-strong"
            >
              <input
                type="radio"
                name="request"
                value={item.value}
                checked={kind === item.value}
                onChange={() => setKind(item.value)}
                className="size-4 shrink-0 accent-ink"
              />
              {item.label}
            </label>
          ))}
        </div>
      </fieldset>

      <Field
        label="Account email"
        helper="The address the account signs in with. We reply to it."
        error={error}
        className="mt-5"
      >
        <TextField
          ref={inputRef}
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (error) setError(null);
          }}
        />
      </Field>

      <div className="mt-5 rounded-lg border border-ink/10 bg-white/60 p-4">
        <p className="text-small text-ink-soft">
          To <span className="text-ink">{CONTACT.privacy}</span>
        </p>
        <p className="mt-1 text-small-strong text-ink">{request.subject}</p>
        <p className="mt-3 text-small whitespace-pre-line text-ink">{body}</p>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <CopyButton
          variant="secondary"
          label="Copy the request"
          message="Request copied"
          value={`To: ${CONTACT.privacy}\nSubject: ${request.subject}\n\n${body}`}
          className="w-full sm:w-auto"
        />
        <Button type="submit" icon={<Send />} loading={pending} className="w-full sm:w-auto">
          Send the request
        </Button>
      </div>
    </form>
  );
}
