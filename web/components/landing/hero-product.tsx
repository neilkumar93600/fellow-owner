'use client';

import { ArrowRight } from 'lucide-react';
import { lazy, Suspense, useId, useState } from 'react';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import styles from './hero.module.css';
import { CLAIM_IDLE_TEXT } from './hero-product-data';

// ponytail: mirrors normalizeUsernameInput (components/auth/username-field) so the hero does not load that
// module, and with it zod and the onboarding helpers, before anyone types.
function normalizeHandle(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
}

/** The idle hint, rendered by the server and until the live check has loaded: same lines, so nothing shifts. */
function IdleStatus({ id }: { id: string }) {
  return (
    <>
      <p id={id} className={styles.claimStatus} data-tone="idle">
        {CLAIM_IDLE_TEXT}
      </p>
      <p aria-live="polite" className="sr-only" />
    </>
  );
}

const loadStatus = () => import('./hero-claim-status');
const HeroClaimStatus = lazy(() => loadStatus().then((mod) => ({ default: mod.HeroClaimStatus })));

/**
 * The hero's one control (owner rule: one button): a plain GET form to /start with the handle. /start
 * picks the next step on the server and passes a valid handle on to pre-fill sign-up; an empty handle is
 * fine. Availability is checked live as a hint only (debounced, cached, polite).
 */
export function HeroClaim() {
  const id = useId();
  const [handle, setHandle] = useState('');
  // The live check loads on the first keystroke and then stays mounted, so its verdict cache survives.
  const [typed, setTyped] = useState(false);

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
            onChange={(event) => {
              setTyped(true);
              setHandle(normalizeHandle(event.target.value));
            }}
            onFocus={() => void loadStatus()}
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
      {typed ? (
        <Suspense fallback={<IdleStatus id={`${id}-status`} />}>
          <HeroClaimStatus id={`${id}-status`} handle={handle} />
        </Suspense>
      ) : (
        <IdleStatus id={`${id}-status`} />
      )}
    </form>
  );
}
