import type {
  BrandPick,
  BrandRequest,
  BrandRequestDetail,
  BrandRequestsPage,
  BrandRequestsQuery,
  BrandSettings,
  InboundEmail,
  UpdateBrandRequestInput,
  WorkWithMeReceipt,
  workWithMeSchema,
} from '@fellow-owners/shared';
import type { z } from 'zod';
import type { CoreDeps } from '../container.js';
import { notImplemented } from '../lib/errors.js';
import type { OwnerContext } from './access.service.js';
import type { MediaKitService } from './media-kit.service.js';
import type { NotificationEmailsService } from './notification-emails.service.js';
import type { NotificationsService } from './notifications.service.js';

export type WorkWithMeBody = z.output<typeof workWithMeSchema>;

export type BrandsServiceDeps = Pick<
  CoreDeps,
  'env' | 'repos' | 'ai' | 'background' | 'mailer' | 'logger'
> & {
  /** brand_request_received (in-app) ... */
  notifications: NotificationsService;
  /** ... and the daily digest email, honouring the same prefs (getPrefs + emailAllowed). */
  notificationEmails: NotificationEmailsService;
  /** settings() includes the media kit settings. Instagram's status comes from repos.instagram. */
  mediaKit: MediaKitService;
};

/** What a visitor's request tells us (for caps and the honeypot; the raw IP is never stored). */
export interface VisitorInfo {
  ip: string;
  userAgent: string | null;
}

/** What one daily digest run did (tick `brand_digest`). */
export interface BrandDigestResult {
  spaces: number;
  emailed: number;
  /** Why nothing ran, when nothing did. */
  skipped?: string;
}

/**
 * F5 Brand inbox: requests from the public form, forwarded email and (with the META switch)
 * Instagram DMs; AI triage (ai.brandTriage) on arrival, the daily "Don't miss" pick and digest.
 * Wave A stubs: every endpoint method answers 501 until B4 lands; sendDigests is a no-op so the
 * daily tick records `ok`.
 */
export function createBrandsService(_deps: BrandsServiceDeps) {
  const notBuilt = () => notImplemented('The brand inbox');
  return {
    /** POST /api/spaces/:handle/work-with-me (public). A filled honeypot gets the same receipt. */
    async submit(
      _handle: string,
      _input: WorkWithMeBody,
      _visitor: VisitorInfo,
    ): Promise<WorkWithMeReceipt> {
      throw notBuilt();
    },

    /** GET /api/spaces/:handle/brand-requests */
    async list(_owner: OwnerContext, _query: BrandRequestsQuery): Promise<BrandRequestsPage> {
      throw notBuilt();
    },

    /** GET /api/spaces/:handle/brand-requests/:id (sets readAt the first time). */
    async get(_owner: OwnerContext, _id: string): Promise<BrandRequestDetail> {
      throw notBuilt();
    },

    /** PATCH /api/spaces/:handle/brand-requests/:id { status } */
    async update(
      _owner: OwnerContext,
      _id: string,
      _input: UpdateBrandRequestInput,
    ): Promise<BrandRequest> {
      throw notBuilt();
    },

    /** GET /api/spaces/:handle/brand-pick: Today's "Don't miss". */
    async pick(_owner: OwnerContext): Promise<BrandPick> {
      throw notBuilt();
    },

    /** GET /api/spaces/:handle/brand-settings (forwarding address, Instagram, media kit). */
    async settings(_owner: OwnerContext): Promise<BrandSettings> {
      throw notBuilt();
    },

    /** POST /api/spaces/:handle/brand-settings/alias: makes (or replaces) the forwarding alias. */
    async rotateAlias(_owner: OwnerContext): Promise<BrandSettings> {
      throw notBuilt();
    },

    /** POST /api/inbound/email (signed): stores the email for the alias's space, once per messageId. */
    async receiveEmail(_email: InboundEmail): Promise<void> {
      throw notBuilt();
    },

    /** Tick `brand_digest` (daily, 14:00 UTC): the day's new requests and the pick, by email. */
    async sendDigests(_now: Date): Promise<BrandDigestResult> {
      return { spaces: 0, emailed: 0, skipped: 'not built yet' };
    },
  };
}

export type BrandsService = ReturnType<typeof createBrandsService>;
