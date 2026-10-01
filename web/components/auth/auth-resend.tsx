'use client';

import { useId } from 'react';
import { cx } from './auth-classes';
import { formatCountdown } from './auth-storage';
import { FOCUS_RING, Spinner } from './auth-ui';

/**
 * "Didn't get it? Resend code". Locked for 30 seconds after each send. The countdown sits beside the
 * control at full contrast and is tied to it with aria-describedby; it is not a live region, so screen
 * readers are not interrupted every second.
 */
export function ResendCode({
  secondsLeft,
  pending,
  onResend,
  className,
}: {
  secondsLeft: number;
  pending: boolean;
  onResend: () => void;
  className?: string;
}) {
  const countdownId = useId();
  const cooling = secondsLeft > 0;
  const inactive = cooling || pending;

  return (
    <p
      className={cx(
        'flex flex-wrap items-center justify-center gap-x-1 text-body text-ink-muted',
        className,
      )}
    >
      <span>Didn’t get it?</span>
      <button
        type="button"
        onClick={inactive ? undefined : onResend}
        aria-disabled={inactive || undefined}
        aria-busy={pending || undefined}
        aria-describedby={cooling ? countdownId : undefined}
        className={cx(
          'inline-flex min-h-11 items-center gap-1.5 rounded-full px-1.5 font-medium',
          FOCUS_RING,
          inactive
            ? 'cursor-not-allowed text-ink-muted'
            : 'text-ink underline decoration-line-row underline-offset-4 hover:decoration-ink',
        )}
      >
        {pending ? <Spinner className="size-3.5" /> : null}
        Resend code
      </button>
      {cooling ? (
        <span id={countdownId} className="tabular">
          in {formatCountdown(secondsLeft)}
        </span>
      ) : null}
    </p>
  );
}
