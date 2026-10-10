import Link from 'next/link';
import { MIN_AGE } from '@/lib/legal';
import { cx, TEXT_LINK } from './auth-classes';

/**
 * The age and terms line, next to the button that creates or opens the account. A plain statement
 * rather than a checkbox: a tick box people click without reading is worse evidence, and one more
 * thing to mistype on a phone. Social log-ins can create accounts too, so /login carries it as well,
 * and /create-account repeats it under the social buttons (`social`). Terms and Privacy open in a new
 * tab, so reading them never wipes a half-filled form.
 */
export function AuthLegal({ social, className }: { social?: boolean; className?: string }) {
  return (
    <p className={cx('text-small text-pretty text-ink-muted', className)}>
      By continuing{social ? ' with Google, Apple or Facebook' : ''}, you confirm you’re {MIN_AGE}{' '}
      or older and agree to our{' '}
      <Link href="/terms" target="_blank" rel="noopener noreferrer" className={TEXT_LINK}>
        Terms of Service<span className="sr-only"> (opens in a new tab)</span>
      </Link>{' '}
      and{' '}
      <Link href="/privacy-policy" target="_blank" rel="noopener noreferrer" className={TEXT_LINK}>
        Privacy Policy<span className="sr-only"> (opens in a new tab)</span>
      </Link>
      .
    </p>
  );
}
