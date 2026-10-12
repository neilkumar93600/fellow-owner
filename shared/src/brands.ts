import { z } from 'zod';
import type { AnalysisStatus } from './enums.js';
import type { MediaKitSettings } from './media-kit.js';
import { cursorQuerySchema, httpUrlSchema } from './schemas/space.js';
import type { ISODate, Page } from './types.js';

// F5 Brand inbox (creator only, except the public form and the webhooks). Requests arrive from the
// public /{handle}/work-with-me form, the per-creator forwarding address
// <alias>@INBOUND_EMAIL_DOMAIN (signed webhook POST /api/inbound/email) and, behind the META switch,
// Instagram DMs (POST /api/webhooks/instagram). The AI scores each one (task brandTriage), Today
// shows a daily "Don't miss" pick, and the tick `brand_digest` emails a daily digest. Replies go out
// from the creator's own mail (mailto / copy); nothing is sent automatically.

export const BRAND_REQUEST_SOURCES = ['form', 'email', 'instagram'] as const;
export type BrandRequestSource = (typeof BRAND_REQUEST_SOURCES)[number];

export const BRAND_REQUEST_STATUSES = [
  'new',
  'shortlisted',
  'replied',
  'accepted',
  'declined',
  'archived',
  'spam',
] as const;
export type BrandRequestStatus = (typeof BRAND_REQUEST_STATUSES)[number];

export const BRAND_REQUEST_STATUS_LABELS: Record<BrandRequestStatus, string> = {
  new: 'New',
  shortlisted: 'Shortlisted',
  replied: 'Replied',
  accepted: 'Accepted',
  declined: 'Declined',
  archived: 'Archived',
  spam: 'Spam',
};

/** The budget a brand picks on the form (USD). */
export const BRAND_BUDGET_RANGES = [
  'under_500',
  '500_2000',
  '2000_5000',
  '5000_10000',
  '10000_plus',
  'not_sure',
] as const;
export type BrandBudgetRange = (typeof BRAND_BUDGET_RANGES)[number];

export const BRAND_BUDGET_LABELS: Record<BrandBudgetRange, string> = {
  under_500: 'Under $500',
  '500_2000': '$500 to $2,000',
  '2000_5000': '$2,000 to $5,000',
  '5000_10000': '$5,000 to $10,000',
  '10000_plus': '$10,000 or more',
  not_sure: 'Not sure yet',
};

/** What the AI triage may flag on a request (legitimacy and urgency). */
export const BRAND_FLAGS = [
  'no_website',
  'budget_missing',
  'free_product_only',
  'vague_ask',
  'suspicious_link',
  'payment_upfront',
  'off_brand',
  'urgent',
] as const;
export type BrandFlag = (typeof BRAND_FLAGS)[number];

export const BRAND_FLAG_LABELS: Record<BrandFlag, string> = {
  no_website: 'No website',
  budget_missing: 'No budget given',
  free_product_only: 'Product only, no fee',
  vague_ask: 'Vague ask',
  suspicious_link: 'Suspicious link',
  payment_upfront: 'Asks you to pay',
  off_brand: 'Off brand for you',
  urgent: 'Urgent',
};

export const BRAND_URGENCIES = ['low', 'normal', 'high'] as const;
export type BrandUrgency = (typeof BRAND_URGENCIES)[number];

export const BRAND_LIMITS = {
  brandName: { min: 1, max: 120 },
  contactName: { max: 100 },
  email: { max: 254 },
  /** An Instagram username (without @). */
  senderHandle: { max: 100 },
  deliverables: { max: 1000 },
  timeline: { max: 200 },
  subject: { max: 200 },
  /** The form asks for a real message; email and DM bodies are stored cut to `max`. */
  message: { min: 20, max: 5000 },
  /** Work-with-me submissions per IP per 10 minutes, and per space per UTC day. */
  formPerIpPer10Min: 3,
  formPerSpacePerDay: 50,
  /** Stored forwarded emails and DMs per space per UTC day. */
  inboundPerSpacePerDay: 200,
  /** AI triage runs per space per UTC day (ai/run.ts TASK_CAPS.brandTriage). */
  triagePerDay: 100,
  summaryMax: 140,
  /** <alias>@INBOUND_EMAIL_DOMAIN (spaces.inbound_email_alias). */
  alias: { pattern: /^[a-z0-9][a-z0-9._-]{2,62}$/ },
} as const;

const B = BRAND_LIMITS;

// ---------------------------------------------------------------- request schemas

/**
 * POST /api/spaces/:handle/work-with-me (public). `consent` must be ticked; `turnstileToken` is
 * checked when TURNSTILE_SECRET_KEY is set; `fax` is a honeypot the form keeps empty (a filled one
 * is dropped silently with the same answer).
 */
export const workWithMeSchema = z.object({
  brandName: z
    .string()
    .trim()
    .min(B.brandName.min, 'Add the brand name')
    .max(B.brandName.max, `Up to ${B.brandName.max} characters`),
  contactName: z
    .string()
    .trim()
    .max(B.contactName.max, `Up to ${B.contactName.max} characters`)
    .optional(),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email').max(B.email.max)),
  website: httpUrlSchema.optional(),
  budgetRange: z.enum(BRAND_BUDGET_RANGES, 'Pick a budget'),
  deliverables: z
    .string()
    .trim()
    .max(B.deliverables.max, `Up to ${B.deliverables.max} characters`)
    .optional(),
  timeline: z.string().trim().max(B.timeline.max, `Up to ${B.timeline.max} characters`).optional(),
  message: z
    .string()
    .trim()
    .min(B.message.min, `At least ${B.message.min} characters`)
    .max(B.message.max, `Up to ${B.message.max} characters`),
  consent: z.literal(true, 'Tick the box so we can pass this on'),
  turnstileToken: z.string().max(2048).optional(),
  fax: z.string().max(200).optional(),
});
export type WorkWithMeInput = z.input<typeof workWithMeSchema>;

/** GET /api/spaces/:handle/brand-requests */
export const brandRequestsQuerySchema = cursorQuerySchema.extend({
  status: z.enum(BRAND_REQUEST_STATUSES).optional(),
  source: z.enum(BRAND_REQUEST_SOURCES).optional(),
  q: z.string().trim().max(100).optional(),
});
export type BrandRequestsQuery = z.output<typeof brandRequestsQuerySchema>;

/** PATCH /api/spaces/:handle/brand-requests/:id */
export const updateBrandRequestSchema = z.object({ status: z.enum(BRAND_REQUEST_STATUSES) });
export type UpdateBrandRequestInput = z.input<typeof updateBrandRequestSchema>;

/**
 * POST /api/inbound/email: one parsed email as JSON, signed with INBOUND_EMAIL_SECRET
 * (HMAC-SHA256 of the raw body, hex, in the `x-inbound-signature` header). Provider-neutral:
 * the mail worker in front (Cloudflare Email Routing, Postmark, ...) maps its payload to this.
 */
export const inboundEmailSchema = z.object({
  /** The address it was sent to: <alias>@INBOUND_EMAIL_DOMAIN. */
  to: z.string().trim().toLowerCase().min(3).max(320),
  from: z.string().trim().toLowerCase().min(3).max(320),
  fromName: z.string().trim().max(200).optional(),
  subject: z.string().max(998).default(''),
  text: z.string().max(200_000).default(''),
  /** The Message-ID header: a redelivery is stored once (brand_requests.external_id). */
  messageId: z.string().trim().min(1).max(998),
  receivedAt: z.iso.datetime({ offset: true }).optional(),
});
export type InboundEmail = z.output<typeof inboundEmailSchema>;

/** GET /api/instagram/callback: Meta's OAuth redirect (the signed `state` names the space). */
export const instagramCallbackQuerySchema = z.object({
  code: z.string().max(2048).optional(),
  state: z.string().max(2048),
  error: z.string().max(200).optional(),
  error_reason: z.string().max(200).optional(),
  error_description: z.string().max(500).optional(),
});
export type InstagramCallbackQuery = z.output<typeof instagramCallbackQuerySchema>;

/** GET /api/webhooks/instagram: Meta's subscription check (answer hub.challenge as text). */
export const instagramVerifyQuerySchema = z.object({
  'hub.mode': z.literal('subscribe'),
  'hub.verify_token': z.string().max(500),
  'hub.challenge': z.string().max(500),
});
export type InstagramVerifyQuery = z.output<typeof instagramVerifyQuerySchema>;

/**
 * POST /api/webhooks/instagram: Meta's change notification, signed with META_APP_SECRET
 * (`x-hub-signature-256: sha256=<hex>` over the raw body). Entries are read by the service.
 */
export const instagramWebhookSchema = z.object({
  object: z.string().max(50),
  entry: z.array(z.record(z.string(), z.unknown())).max(100),
});
export type InstagramWebhook = z.output<typeof instagramWebhookSchema>;

// ---------------------------------------------------------------- responses

/** The AI's read of a request (owner view only). */
export interface BrandTriage {
  status: AnalysisStatus;
  /** 0..100: fit with the taste profile, budget and legitimacy together. */
  score: number | null;
  /** One line, at most BRAND_LIMITS.summaryMax characters. */
  summary: string | null;
  flags: BrandFlag[];
  urgency: BrandUrgency | null;
}

export interface BrandRequest {
  id: string;
  source: BrandRequestSource;
  status: BrandRequestStatus;
  brandName: string;
  contactName: string | null;
  email: string | null;
  /** Instagram username for DMs. */
  senderHandle: string | null;
  website: string | null;
  budgetRange: BrandBudgetRange | null;
  deliverables: string | null;
  timeline: string | null;
  /** The email subject (email source). */
  subject: string | null;
  excerpt: string;
  ai: BrandTriage;
  receivedAt: ISODate;
  /** First time the creator opened it; null while unread. */
  readAt: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/** GET /api/spaces/:handle/brand-requests/:id (marks it read). */
export interface BrandRequestDetail extends BrandRequest {
  message: string;
  /** A mailto: link with the subject filled in; null without an email address. */
  replyHref: string | null;
  /** When the form's consent box was ticked (form source). */
  consentedAt: ISODate | null;
}

/** GET /api/spaces/:handle/brand-requests: newest first. Counts cover every request. */
export interface BrandRequestsPage extends Page<BrandRequest> {
  counts: Record<BrandRequestStatus, number>;
  unread: number;
}

/** GET /api/spaces/:handle/brand-pick: Today's "Don't miss" (null when nothing stands out). */
export interface BrandPick {
  request: BrandRequest | null;
  /** One plain sentence on why it was picked. */
  reason: string | null;
  pickedAt: ISODate | null;
}

/** The Instagram DM switch, as the settings card shows it. */
export interface InstagramConnection {
  /** META_APP_ID, META_APP_SECRET and META_VERIFY_TOKEN are set on the server. */
  available: boolean;
  connected: boolean;
  username: string | null;
  connectedAt: ISODate | null;
  lastEventAt: ISODate | null;
}

/** GET /api/spaces/:handle/brand-settings (Settings, Brand deals tab). */
export interface BrandSettings {
  /** <alias>@INBOUND_EMAIL_DOMAIN; null until made, or when forwarding is not set up on the server. */
  forwardingAddress: string | null;
  /** INBOUND_EMAIL_DOMAIN and INBOUND_EMAIL_SECRET are set on the server. */
  emailForwardingAvailable: boolean;
  instagram: InstagramConnection;
  mediaKit: MediaKitSettings;
}

/** POST /api/spaces/:handle/work-with-me (201): the same answer for a dropped honeypot. */
export interface WorkWithMeReceipt {
  received: true;
}

/** POST /api/spaces/:handle/instagram/connect: send the browser to Meta. */
export interface InstagramConnectStart {
  authorizeUrl: string;
}
