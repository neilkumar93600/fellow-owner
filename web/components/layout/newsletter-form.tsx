'use client';

import { Check } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Label } from '@/components/ui/field';
import { ApiError, apiFetch } from '@/lib/fetcher';

type Status = { kind: 'idle' } | { kind: 'ok' } | { kind: 'error'; message: string };

// ponytail: a light shape check; the API is the real validator (400 validation_error).
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Footer newsletter signup. POST /api/newsletter; the status line has a reserved height so nothing shifts. */
export function NewsletterForm() {
  const id = useId();
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const value = email.trim();
    if (!EMAIL.test(value)) {
      setStatus({
        kind: 'error',
        message: 'Enter a valid email, like you@example.com.',
      });
      return;
    }
    setPending(true);
    try {
      await apiFetch('/api/newsletter', {
        method: 'POST',
        json: { email: value, source: 'footer' },
      });
      setEmail('');
      setStatus({ kind: 'ok' });
    } catch (error) {
      const code = error instanceof ApiError ? error.code : '';
      setStatus({
        kind: 'error',
        message:
          code === 'validation_error'
            ? 'Enter a valid email, like you@example.com.'
            : code === 'rate_limited'
              ? 'Too many tries. Please wait a minute.'
              : 'Something went wrong. Please try again.',
      });
    } finally {
      setPending(false);
    }
  }

  const invalid = status.kind === 'error';

  return (
    <section aria-labelledby={`${id}-title`} className="flex w-full flex-col">
      <h2 id={`${id}-title`} className="font-display text-[1.375rem] leading-[1.2] text-ink">
        Creator notes, once a month
      </h2>
      <form onSubmit={onSubmit} noValidate className="mt-3 flex flex-col">
        <Label htmlFor={`${id}-email`}>Your email</Label>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: pointer-only nicety (a click on the pill's padding focuses the field); keyboard users tab straight to the input. */}
        <div
          onMouseDown={(event) => {
            if ((event.target as HTMLElement).closest('input, button')) return;
            event.preventDefault();
            event.currentTarget.querySelector('input')?.focus();
          }}
          className={cn(
            'flex w-full items-center rounded-full border border-line-field bg-white p-1 shadow-xs transition-colors duration-150 ease-out-quart',
            'hover:border-ink-muted',
            'has-focus-visible:border-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink',
            invalid && 'border-danger has-focus-visible:border-danger',
          )}
        >
          <input
            id={`${id}-email`}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="Your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={invalid || undefined}
            aria-describedby={`${id}-status ${id}-fine`}
            className="h-10 min-w-0 flex-1 border-0 bg-transparent pr-2 pl-4 text-body text-ink outline-none placeholder:text-ink-muted max-sm:text-[1rem]"
          />
          <Button type="submit" size="md" loading={pending} className="h-10 shrink-0 px-5">
            Subscribe
          </Button>
        </div>
        <p
          id={`${id}-status`}
          aria-live="polite"
          className={`mt-2 flex min-h-5 items-start gap-1.5 text-small ${invalid ? 'text-danger-deep' : 'text-ink'}`}
        >
          {status.kind === 'ok' ? (
            <>
              <Check
                aria-hidden="true"
                strokeWidth={2}
                className="mt-0.5 size-4 shrink-0 text-ink"
              />
              Thanks, you&rsquo;re on the list.
            </>
          ) : status.kind === 'error' ? (
            status.message
          ) : null}
        </p>
      </form>
    </section>
  );
}
