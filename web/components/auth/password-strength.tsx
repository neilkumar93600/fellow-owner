import { LIMITS } from '@fellow-owners/shared';
import styles from './auth.module.css';

const MIN = LIMITS.password.min;

/** Strength from length and variety: 1 is under the minimum, 2 to 4 are valid. Live while typing. */
export function scorePassword(value: string): 0 | 1 | 2 | 3 | 4 {
  if (!value) return 0;
  if (value.length < MIN) return 1;
  const kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(value)).length;
  if (value.length >= 16 || (value.length >= 12 && kinds >= 3)) return 4;
  if (value.length >= 12 || kinds >= 3) return 3;
  return 2;
}

const LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'] as const;

/**
 * A four segment meter with its level named beside it (color is never the only cue). One line, no
 * tip: the field's own error says what is missing.
 */
export function PasswordStrength({ password }: { password: string }) {
  const score = scorePassword(password);
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className={styles.meter} data-score={score}>
        <span />
        <span />
        <span />
        <span />
      </span>
      <span aria-live="polite" className="w-12 shrink-0 text-right font-medium text-ink-soft">
        {LABELS[score]}
      </span>
    </div>
  );
}
