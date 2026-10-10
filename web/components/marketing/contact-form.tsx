'use client';

import { emailSchema, LIMITS } from '@fellow-owners/shared';
import { type FormEvent, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, TextArea, TextField } from '@/components/ui/field';
import { submitSupportRequest } from '@/lib/api/support';
import { ApiError } from '@/lib/fetcher';

const S = LIMITS.support;

/** The contact form on /contact. POST /api/support/requests; the hidden `website` field is a honeypot. */
export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<{ email?: string; message?: string; form?: string }>({});
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const next: typeof errors = {};
    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) next.email = parsedEmail.error.issues[0]?.message;
    if (message.trim().length < S.messageMin) {
      next.message = `Write at least ${S.messageMin} characters.`;
    }
    setErrors(next);
    if (next.email || next.message) return;
    setPending(true);
    try {
      await submitSupportRequest({
        kind: 'contact',
        name: name.trim() || undefined,
        email,
        message,
        website,
      });
      setDone(true);
    } catch (error) {
      setErrors({
        form:
          error instanceof ApiError && error.code === 'rate_limited'
            ? 'Too many messages from here. Please try again in an hour.'
            : 'Something went wrong. Please try again, or email us at the address above.',
      });
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <section
        aria-live="polite"
        className="mt-5 rounded-3xl border border-white/70 bg-white/60 p-6"
      >
        <h2 className="text-h2 text-ink">Message received</h2>
        <p className="mt-2 text-body text-ink">
          Thank you. We will reply to your email. A short confirmation goes there too (once a day at
          most).
        </p>
      </section>
    );
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-labelledby="contact-form-title"
      className="relative mt-5 rounded-3xl border border-white/70 bg-white/60 p-6"
    >
      <h2 id="contact-form-title" className="text-h2 text-ink">
        Send a message
      </h2>
      <p className="mt-1 text-small text-ink-soft">
        Prefer a form? Write here and we will reply to your email.
      </p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Field label="Name" optional>
          <TextField
            autoComplete="name"
            maxLength={S.nameMax}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <Field label="Email" error={errors.email}>
          <TextField
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </Field>
      </div>
      <Field label="Message" error={errors.message} className="mt-5">
        <TextArea
          maxLength={S.messageMax}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </Field>
      {/* Honeypot: hidden from people and assistive tech; bots fill it. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>
      </div>
      <p aria-live="polite" className="mt-3 min-h-5 text-small text-danger-deep">
        {errors.form}
      </p>
      <div className="mt-2 flex sm:justify-end">
        <Button type="submit" loading={pending} className="w-full sm:w-auto">
          Send message
        </Button>
      </div>
    </form>
  );
}
