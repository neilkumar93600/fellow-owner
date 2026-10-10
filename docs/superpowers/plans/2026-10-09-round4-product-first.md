# Round 4 Implementation Plan: product-first landing, rainbow CTA, product loop, collapsible sidebar, platform auto-fetch, one identity

> **For agentic workers:** executed as Workflow waves (multi-agent, file ownership per task). Each task's implementer reads the spec section named in its row and follows TDD where a test is listed.

**Goal:** Ship the owner-approved Round 4 changes and push to GitHub.

**Architecture:** Same monorepo (web Next.js 16, api Express 5 + Drizzle, shared zod/types). New: Apify-backed platform lookup with fixtures and simulated fallback, an AI setup-suggestions task, a daily follower-refresh cron, a unified handle namespace, a scroll-scrubbed product recording behind a live UI layer, and a cookie-persisted collapsible sidebar.

**Spec:** `docs/superpowers/specs/2026-10-09-round4-product-first-design.md`. The owner decisions table at its top overrides anything below it.

## Global Constraints

- Rainbow button: only on the marketing "Try the live demo" CTA. At most one per viewport. App screens keep coral `#C8432A`.
- Demo creator Mira appears only inside product UI and in "Demo" disclosures. She never appears in a heading, sub line or CTA.
- Canonical demo facts come from one export in `web/components/landing/demo-data.ts`:
  - 1.14M followers (YouTube 620K, Instagram 380K, TikTok 140K)
  - Budget Travel 502
  - "Lisbon on $60 a day" by Priya
  - crew Priya, Inês, Maya, Leo
  - one click count
- `APIFY_TOKEN` is server-only (`api/.env`): never `NEXT_PUBLIC_*`, never logged, never written elsewhere. Platform URLs are parsed against a host allowlist and never forwarded raw. Avatar fetch is allowlisted by CDN host, `image/*` only, at most 256KB.
- Handle namespace: 3–30 characters, `^[a-z0-9_.]+$`, reserved words rejected. A handle is free only if no user has it as a username and no space has it as a handle.
- Sidebar: collapsed at 72px by default, expanded at 248px only at 1024px and wider, `[` toggles, state in the `fo_sidebar` cookie. Mobile keeps the bottom dock.
- WCAG 2.2 AA, `prefers-reduced-motion` honoured, 390px with no horizontal scroll, LF line endings, biome clean.
- Never touch Neon. Use local Docker Postgres and the assigned test DB only. Never start or stop servers (web :3006, API :4100). Do not commit; the orchestrator commits and pushes at the end.

## Review Focus

1. **Hostile platform URLs** (`javascript:`, foreign hosts, `@` in the authority, IP addresses, punycode lookalikes) must be rejected before any network call. Covered by a URL-parser unit test in Task 7.
2. **Apify failure modes** (private account, empty dataset, quota exhausted, timeout over 60s, especially X) must return `failed`, or labelled sample data for X, never a 500. One platform failing must not block the others. Covered by mapper tests with saved samples plus a timeout test in Task 7.
3. **Handle collisions across the two tables** (username vs space handle) under concurrent sign-up and space creation return 409, never a duplicate. Covered by an integration test in Task ID-API.
4. **The sidebar cookie missing or tampered** (unknown value) falls back to collapsed with no layout flash or hydration mismatch. Covered by a check in Task 6.
5. **Scroll-scrub frames missing or slow** must never show a blank canvas: the poster is the CSS background and reduced motion fetches nothing. Covered by verification in Task 12.

## Waves and tasks

| Wave | Task | Owner files (exclusive) | Spec | Model / effort | Test DB |
|---|---|---|---|---|---|
| 1 | T1 Rainbow | `web/components/ui/rainbow-button.tsx` (restore from scratchpad/removed), `web/app/globals.css`, `web/components/landing/demo-button.tsx`, `demo-cta.tsx`, `cta.module.css`, `DESIGN.md` | §2 Rainbow, Demo CTA | sonnet / medium | — |
| 1 | T3 Demo data + device frames + live layer | `web/components/landing/{demo-data,loop-data,loop-live-data}.ts`, `{device-frames,loop-live,loop-static}.tsx` | §1 canonical facts, §3 Live layer, §2 How it works copy | opus / high | — |
| 1 | T6 Sidebar | `web/components/layout/{dashboard-nav.ts,sidebar.tsx,app-shell.tsx}`, `web/app/(dashboard)/dashboard/layout.tsx` | §5 | sonnet / high | — |
| 1 | T7 Platform lookup + suggestions API | `shared/src/platform-lookup.ts`, `shared/src/index.ts`, `api/src/lib/platform-lookup.ts`, `api/src/lib/platform-fixtures/*`, `api/src/controllers/platform.controller.ts`, `api/src/routes/studio.routes.ts`, `api/src/config/env.ts`, `api/src/ai/{tasks/suggest-setup.ts,index.ts,types.ts,run.ts,fake.ts}`, `api/.env.example`, tests | §6 | opus / high | `fellow_owners_test_b1` |
| 1 | T8 API leftovers | `api/src/services/{challenges,posts}.service.ts`, `api/src/repositories/asks.repo.ts`, `api/src/db/seed/**` (+ re-seed dev DB), optional migration 0005 | §8 items 4, 5 | opus / medium | `fellow_owners_test_b2` |
| 1 | T9 Web leftovers | `web/app/providers.tsx`, `web/components/theme-provider.tsx`, `web/package.json`, `pnpm-lock.yaml`, `web/lib/legal.ts`, `web/app/sitemap.ts`, `web/components/dashboard/followers/import-panel.tsx`, `web/components/shared/{status-pill,toolbar}.tsx`, `web/components/dashboard/people/spotlight-panel.tsx` | §8 items 2, 3, 6–9 | sonnet / medium | — |
| 1 | ID-API One identity (server) | `shared/src/{limits.ts,schemas/auth.ts,types.ts}`, `api/src/auth/index.ts`, `api/src/services/{spaces,promotions}.service.ts`, `api/src/routes/public.routes.ts` (or a new `identity.routes.ts` registered in `routes/index.ts`), `api/src/controllers/public.controller.ts`, auth/space tests | §11 + §8 item 1 (API half: `isDemo` on PublicSpace/Showcase) | opus / high | `fellow_owners_test_b3` |
| 2 | T2 Product recording | `scratchpad/tools/record-product.mjs`, `web/public/frames/product/*` | §3 Recording | sonnet / high | — |
| 2 | T4 Landing copy swaps | `web/components/landing/{problem-*,fans-*,creators-*}`, `faq.tsx`, `web/components/layout/footer.tsx`, `footer.module.css` | §2 | haiku / low (reviewed in T15) | — |
| 2 | T5 Connect + Showcase + Trust | `web/components/landing/{connect-*,showcase-*,trust-*}` | §2 | sonnet / high | — |
| 2 | T10 Navbar | `web/components/layout/navbar.tsx`, `web/components/landing/{nav-scroll.ts,nav.module.css}` | §2 Nav | sonnet / medium | — |
| 2 | T11 Hero (chosen concept) | `web/components/landing/{hero,hero-product,hero-chips,hero-intro}.tsx`, `hero-product-data.ts`, `hero.module.css` | §4 + concept addendum | opus / high | — |
| 2 | T13 Onboarding + create-account (identity UI + auto-fetch UI) | `web/components/onboarding/**`, `web/components/auth/{create-account-form,username-field,login-form}.tsx`, `web/lib/platform-client.ts` (new) | §6 UI, §7 extras, §11 UI | opus / high | — |
| 2 | T14 Follower refresh + isDemo web side | `api/src/workers/refresh-followers.ts`, `api/src/controllers/cron.controller.ts`, `api/src/routes/cron.routes.ts`, `api/vercel.json`, `web/components/bio/{creator-header,og-image}.tsx`, both `[handle]` opengraph-image routes | §6 refresh, §8 item 1 (web half) | sonnet / medium | `fellow_owners_test_qa` |
| 3 | T12 Loop canvas engine | `web/components/landing/{loop-frames.ts,loop-canvas.tsx,loop-scene.tsx,loop-section.tsx,loop.module.css}` | §3 Engine, layer stack | opus / high | — |
| 3 | T15 Page order + copy review | `web/app/(public)/page.tsx`, spec §5 heading; reviews T4's haiku output (may fix T4 files) | §2 order | sonnet / medium | — |
| 4 | QA + visual | read-only | §1 table re-score, all verifies | sonnet / medium | `fellow_owners_test_qa` |
| 4 | Review | read-only: security (lookup, avatar fetch, identity), privacy, a11y | — | opus / high | `fellow_owners_test_rev` |
| 5 | Fix round, then commit and push | orchestrator | Delivery | — | — |

**Tests required (TDD; write failing first):**
- **T7:**
  - URL parser hostile inputs.
  - One mapper test per platform against a saved actor sample.
  - Timeout returns `failed`.
  - X failure falls back to `simulated`.
  - Setup suggestions: demand hint computed in code from indices; model numbers ignored.
  - Lookup rate limit returns 429.
- **ID-API:**
  - Handle equal to another user's username returns 409.
  - Username equal to a space handle returns 409.
  - Reserved handles are rejected on both paths.
  - Space creation with a changed handle updates the username.
  - `/api/handle-available` returns suggestions and is rate-limited.
- **T8:**
  - Fan shortlist excludes hidden and deleted entries.
  - Archived-community challenge is hidden or closed in the fan list.
  - Overdue close failure does not break the fan GET.
- **T6:** cookie values `expanded`, `collapsed` and junk render the right width server-side (no flash).

**Delivery (orchestrator, after Wave 4 and fixes):**
1. Add `.playwright-mcp/` (and `typecheck-output.txt`) to `.gitignore`.
2. Verify no secrets are staged: `git diff --cached` grep for `apify_api_`, `neondb_owner`, the fal key prefix, and `BEGIN`.
3. Create branch `creator-pivot`.
4. Commit in logical commits.
5. `git push -u origin creator-pivot`.
6. Report the compare URL.
