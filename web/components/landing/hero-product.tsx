'use client';

import { ArrowRight } from 'lucide-react';
import { useId, useState } from 'react';
import {
  normalizeUsernameInput,
  type UsernameStatus,
  useUsernameStatus,
} from '@/components/auth/username-field';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import styles from './hero.module.css';

function statusText(status: UsernameStatus, suggestions: string[]): string {
  switch (status.state) {
    case 'idle':
      return 'Pick the link fans will use. You can leave it empty and choose later.';
    case 'invalid':
      return status.message;
    case 'checking':
      return `Checking ${status.username}…`;
    case 'available':
      return `fellowowners.app/${status.username} is free.`;
    case 'taken':
      return suggestions.length
        ? `Taken: try ${suggestions.join(', ')}.`
        : 'That link is taken. Try another.';
    case 'unavailable':
      return 'Could not check right now. You can still continue.';
  }
}

/**
 * The hero's one control (owner rule: one button): a plain GET form to /start with the handle. /start
 * picks the next step on the server and passes a valid handle on to pre-fill sign-up; an empty handle is
 * fine. Availability is checked live as a hint only (debounced, cached, polite).
 */
export function HeroClaim() {
  const id = useId();
  const [handle, setHandle] = useState('');
  const { status, suggestions } = useUsernameStatus(handle);
  const text = statusText(status, suggestions);
  const tone =
    status.state === 'available'
      ? 'ok'
      : status.state === 'taken' || status.state === 'invalid'
        ? 'bad'
        : 'idle';

  return (
    <form action={routes.start()} method="get" className={cn('glass-strong', styles.claim)}>
      <label htmlFor={`${id}-handle`} className={styles.claimLabel}>
        Claim your link
      </label>
      <div className={styles.claimRow}>
        <div className={styles.claimField}>
          <span className={styles.claimPrefix} aria-hidden="true">
            fellowowners.app/
          </span>
          <input
            id={`${id}-handle`}
            name="handle"
            value={handle}
            onChange={(event) => setHandle(normalizeUsernameInput(event.target.value))}
            placeholder="yourname"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={30}
            aria-describedby={`${id}-status`}
            className={styles.claimInput}
          />
        </div>
        {/* The hero's one Lake Blue button; data-hero-cta tells the navbar to step back to glass. */}
        <button type="submit" data-hero-cta className={cn('btn btn-primary', styles.claimButton)}>
          Get started
          <ArrowRight aria-hidden="true" size={16} />
        </button>
      </div>
      <p id={`${id}-status`} className={styles.claimStatus} data-tone={tone}>
        {text}
      </p>
      {/* Settled verdicts only, so "Checking…" never chases each keystroke. */}
      <p aria-live="polite" className="sr-only">
        {status.state === 'idle' || status.state === 'checking' ? '' : text}
      </p>
    </form>
  );
}
