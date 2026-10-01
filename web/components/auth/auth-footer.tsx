import Link from 'next/link';
import { TEXT_LINK } from './auth-classes';

/** Shared footer under every auth form. */
export function AuthFooter() {
  return (
    <p className="mx-auto max-w-[400px] text-small text-ink-soft">
      By continuing you agree to the{' '}
      <Link href="/terms" className={TEXT_LINK}>
        Terms
      </Link>{' '}
      and{' '}
      <Link href="/privacy-policy" className={TEXT_LINK}>
        Privacy policy
      </Link>
      .
    </p>
  );
}
