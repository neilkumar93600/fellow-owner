'use client';

import { type UsernameStatus, useUsernameStatus } from '@/components/auth/username-field';
import styles from './hero.module.css';
import { CLAIM_IDLE_TEXT } from './hero-product-data';

function statusText(status: UsernameStatus, suggestions: string[]): string {
  switch (status.state) {
    case 'idle':
      return CLAIM_IDLE_TEXT;
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
 * The claim form's status line and its polite announcement. Split out of HeroClaim and loaded on the
 * first keystroke, because the live check (zod handle rules, the onboarding helpers) is most of the
 * hero's JavaScript and an untouched form only ever shows the idle hint.
 */
export function HeroClaimStatus({ id, handle }: { id: string; handle: string }) {
  const { status, suggestions } = useUsernameStatus(handle);
  const text = statusText(status, suggestions);
  const tone =
    status.state === 'available'
      ? 'ok'
      : status.state === 'taken' || status.state === 'invalid'
        ? 'bad'
        : 'idle';

  return (
    <>
      <p id={id} className={styles.claimStatus} data-tone={tone}>
        {text}
      </p>
      {/* Settled verdicts only, so "Checking…" never chases each keystroke. */}
      <p aria-live="polite" className="sr-only">
        {status.state === 'idle' || status.state === 'checking' ? '' : text}
      </p>
    </>
  );
}
