import { parseLoginIdentifier } from '@fellow-owners/shared';

/**
 * The credentials typed on /create-account (or on /login for an unconfirmed account) wait here, in
 * memory only, for the code screen. The API confirms an account that has a password only together with
 * that password (api/src/auth/index.ts), so /verify-otp sends it with the code, then logs in with it.
 * Someone who signed up first with another person's email therefore cannot keep the account.
 *
 * Never sessionStorage or localStorage: a reload drops the password on purpose, and the code screen
 * then asks for it.
 */
let pending: { identifier: string; password: string } | null = null;

export function holdPendingLogin(identifier: string, password: string): void {
  pending = { identifier: identifier.trim(), password };
}

/**
 * The held password for the email being confirmed. A held email that is not that one is ignored; a
 * username is kept, because the code screen only knows the email.
 */
export function heldPassword(email: string): string | null {
  if (!pending) return null;
  const parsed = parseLoginIdentifier(pending.identifier);
  if (parsed.kind === 'email' && parsed.email !== email.trim().toLowerCase()) return null;
  return pending.password;
}

export function forgetPendingLogin(): void {
  pending = null;
}
