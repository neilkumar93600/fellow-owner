/**
 * Who operates the product, and how to reach us. Shared because the web app puts it on the legal
 * pages and in the footer, and the API puts it in the footer of every email it sends.
 *
 * FILL BEFORE LAUNCH. Five values here are placeholders and are visible to users until replaced:
 * `entity`, `address`, `country`, `law`, and the DOMAIN every contact address hangs off. A legal page
 * naming no entity, no postal address and no governing law is not usable for Google OAuth
 * verification (F28) or a real pilot. The rest of the legal copy lives in web/lib/legal.ts.
 */

/** Set once; every contact address below is derived from it. */
const DOMAIN = 'fellowowners.com'; // TODO(legal): confirm the registered domain.

export const OPERATOR = {
  /** The product name people know. */
  name: 'Fellow Owners',
  /** The registered legal entity that owns and operates the product. */
  entity: 'Fellow Owners Inc.',
  /** Registered postal address for formal notices and inquiries. */
  address: '2261 Market Street, Suite 5412, San Francisco, CA 94114',
  /** Where the operator is incorporated. */
  country: 'United States',
  /** Governing law and venue for the Terms. */
  law: 'the State of Delaware and the federal laws of the United States',
  domain: DOMAIN,
} as const;

export const CONTACT = {
  privacy: `privacy@${DOMAIN}`,
  legal: `legal@${DOMAIN}`,
  support: `support@${DOMAIN}`,
  /** Copyright and takedown notices. */
  copyright: `copyright@${DOMAIN}`,
} as const;

/**
 * Minimum age for an account: adults only, the product owner's call (2026-10-02). It also clears
 * GDPR Art. 8 in every member state without per-country logic. The Terms, the Privacy policy and the
 * "By continuing" line on /create-account and /login all read it from here.
 */
export const MIN_AGE = 18;
