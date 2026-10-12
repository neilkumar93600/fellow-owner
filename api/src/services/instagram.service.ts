import type {
  InstagramCallbackQuery,
  InstagramConnectStart,
  InstagramVerifyQuery,
  InstagramWebhook,
} from '@fellow-owners/shared';
import type { CoreDeps } from '../container.js';
import { notImplemented } from '../lib/errors.js';
import type { OwnerContext } from './access.service.js';
import type { BrandsService } from './brands.service.js';

export type InstagramServiceDeps = Pick<CoreDeps, 'env' | 'repos' | 'logger'> & {
  /**
   * DMs become brand requests (source `instagram`, external id = the message id) through the
   * brands service. One direction only: brands.settings reads repos.instagram itself.
   */
  brands: BrandsService;
};

/**
 * F5 Instagram DM sync, behind the META switch (env.INSTAGRAM_ENABLED; the routes answer 503
 * feature_disabled without it). Tokens are stored with lib/crypto.ts (fieldCipherFrom(env)); without
 * FIELD_ENCRYPTION_KEY the connect flow must refuse to store one. The OAuth `state` is a signed,
 * expiring token (lib/signed-token.ts) naming the space and the user. Wave A stubs: 501 until B4.
 */
export function createInstagramService(_deps: InstagramServiceDeps) {
  const notBuilt = () => notImplemented('Instagram messages');
  return {
    /** POST /api/spaces/:handle/instagram/connect -> where to send the browser (Meta's consent page). */
    async connectStart(_owner: OwnerContext): Promise<InstagramConnectStart> {
      throw notBuilt();
    },

    /**
     * GET /api/instagram/callback: trades `code` for a long-lived token, stores it encrypted and
     * resolves with the web path to land on (Settings, Brand deals tab, with an outcome flag).
     */
    async callback(_query: InstagramCallbackQuery, _userId: string | null): Promise<string> {
      throw notBuilt();
    },

    /** DELETE /api/spaces/:handle/instagram: forgets the connection and its token. */
    async disconnect(_owner: OwnerContext): Promise<void> {
      throw notBuilt();
    },

    /** GET /api/webhooks/instagram: hub.verify_token must equal META_VERIFY_TOKEN; returns hub.challenge. */
    verifyWebhook(_query: InstagramVerifyQuery): string {
      throw notBuilt();
    },

    /** POST /api/webhooks/instagram (signature already checked): stores new DMs as brand requests. */
    async receiveWebhook(_payload: InstagramWebhook): Promise<void> {
      throw notBuilt();
    },
  };
}

export type InstagramService = ReturnType<typeof createInstagramService>;
