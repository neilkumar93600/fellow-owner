import type { NewsletterSource } from '@fellow-owners/shared';
import type { Repos } from '../repositories/index.js';

export function createNewsletterService(deps: { repos: Repos }) {
  return {
    /**
     * Stores the sign-up and never says whether the email was already on the list.
     * ponytail: no mail provider is configured, so no welcome or confirmation email is sent;
     * add double opt-in here once one is.
     */
    async subscribe(email: string, source: NewsletterSource): Promise<void> {
      await deps.repos.newsletter.subscribe(email, source);
    },
  };
}

export type NewsletterService = ReturnType<typeof createNewsletterService>;
