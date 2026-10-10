import type { SupportRequestInput } from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { notImplemented } from '../lib/errors.js';

export type SupportServiceDeps = Pick<CoreDeps, 'env' | 'repos' | 'mailer' | 'logger'>;

/** Contact and privacy requests: stored, emailed to ADMIN_EMAILS, acknowledged. Stub: F11. */
export function createSupportService(_deps: SupportServiceDeps) {
  return {
    /** A filled honeypot is silently dropped (the route still answers 202). */
    async submit(_input: SupportRequestInput, _userId: string | null): Promise<void> {
      throw notImplemented('Support requests');
    },
  };
}

export type SupportService = ReturnType<typeof createSupportService>;
