import { createElement } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/fetcher';

const FALLBACK = 'Something went wrong. Try again.';

/** The words to show for a failure: the API's own message, else `fallback`. */
export function errorMessage(error: unknown, fallback = FALLBACK): string {
  return error instanceof ApiError ? error.message : fallback;
}

/** A success toast (role="status"). It stays 6s (the Toaster default) and pauses while hovered. */
export function toastSuccess(message: string): void {
  toast.success(createElement('span', { role: 'status' }, message));
}

/**
 * A failure toast (role="alert") that stays until dismissed, with a close button and, when `retry` is
 * given, a Retry action. Callers revert their optimistic change before or after calling this.
 */
export function toastError(
  error: unknown,
  opts: { retry?: () => void; fallback?: string } = {},
): void {
  // Anything that is not an API answer is a bug worth seeing in the console.
  if (!(error instanceof ApiError)) console.error(error);
  toast.error(createElement('span', { role: 'alert' }, errorMessage(error, opts.fallback)), {
    duration: Number.POSITIVE_INFINITY,
    closeButton: true,
    action: opts.retry ? { label: 'Retry', onClick: opts.retry } : undefined,
  });
}
