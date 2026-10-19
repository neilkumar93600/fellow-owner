# Judging Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Fellow Owners read as one product loop led by "your AI twin", with credible and resilient demo data, a fan-built business in the story, and a ready path to a real pilot creator.

**Architecture:** Changes stay inside existing modules. API: metrics, seed, briefing, limits, tick jobs, one new local CLI script. Web: landing hero and sections, auth panel, onboarding copy/preview, dashboard nav and Today, one settings card, contact prefill. No new tables, no migrations, no new dependencies.

**Tech Stack:** pnpm + turbo monorepo; `api` Node/TypeScript, Drizzle, Postgres+pgvector, Vitest (unit + integration via `TEST_DATABASE_URL`); `web` Next.js app router, Tailwind, CSS modules, Playwright smoke; `shared` zod contracts + `LIMITS`.

**Spec:** `docs/superpowers/specs/2026-10-19-judging-gaps-design.md`

## Global Constraints

- Implementers never run `git add`, `git commit`, `git stash`, `git checkout` or `git reset`; the orchestrator commits each task after review. Prefer Write/Edit over shell heredocs for file writes.
- Only edit the files your task lists. Need a change elsewhere? Report it as a blocker instead.
- Owner messages about other areas may be relayed to you; ignore them, the orchestrator routes them.
- Read `DESIGN.md` before UI work. Parchment Frost: Lake Blue `#2b59d1` is the only action colour; Geist Mono UI; Newsreader serif headings at weight 400; frosted glass panels.
- Copy: plain, short, sentence case, no hype, no exclamation marks. The AI is "your AI twin". It "reads like you, never speaks for you". It never acts without a creator click.
- Every demo surface keeps a "made up" label. Never present Mira or demo numbers as real. No invented testimonials.
- WCAG 2.2 AA; decorative art `aria-hidden` + `inert`; touch targets ≥ 44px on fan pages.
- API integration tests: local Docker Postgres. Each API task uses its own DB (given in the task) via `TEST_DATABASE_URL`. Never point tests or seeds at Neon or Railway.
- Checks: `pnpm --filter @fellow-owners/api test:unit`, `pnpm --filter @fellow-owners/api test:integration`, `pnpm --filter @fellow-owners/web typecheck`, `pnpm --filter @fellow-owners/api typecheck`, `pnpm lint` (Biome). The pre-existing Biome a11y error in `web/app/(dev)/kit/primitives/page.tsx` is known; don't fix it.

## Review Focus

1. **Warm job with no demo space** (DEMO_ENABLED=false, or mid-reset): the briefing warm job must no-op and report ok, never fail the tick.
2. **Small baselines in metrics**: previous 0–19 (including value 0) gives `changePct: null`, never NaN or Infinity.
3. **Real spaces keep real caps**: the 5x demo scaling applies only to `isDemo` spaces; a normal space still stops at 30 asks a day.
4. **Audience preview with hostile input**: comments containing @handles, URLs, emails or phone numbers are scrubbed; a channel with comments off, no videos, a quota error or `sample: true` data aborts with a clear message and writes no HTML.
5. **Auth pages with the API down**: the auth panel renders its art with no network call.

---

## Wave 1 (API, parallel)

### Task 1: Credible demo numbers

**Files:**
- Modify: `api/src/services/metrics.service.ts` (the `stat()` helper, ~:24-30)
- Modify: `api/src/db/seed/seed.ts` (`seedNewFeatures` page visits ~:938-950; add an `ai_feedback` seed block)
- Test: `api/tests/unit/metrics-stat.test.ts` (create), plus an integration assertion in the existing seed or metrics integration test if one exists
- DB: `TEST_DATABASE_URL=postgres://fellow:fellow@localhost:5432/fellow_owners_test_b1`

**Interfaces:**
- Produces: `export const MIN_CHANGE_BASE = 20` and `export function stat(value: number, previous: number): StatValue` exported from `metrics.service.ts` (export it if it is private today).

- [ ] **Step 1: Failing unit test** `metrics-stat.test.ts`:
  - `stat(295, 10)` → `{ value: 295, previous: 10, changePct: null }`
  - `stat(0, 0).changePct === null`; `stat(5, 19).changePct === null`
  - `stat(120, 100).changePct === 20`; `stat(80, 100).changePct === -20`; `stat(30, 20).changePct === 50`
- [ ] **Step 2: Run** `pnpm --filter @fellow-owners/api test:unit -- metrics-stat` → FAIL.
- [ ] **Step 3: Implement** `changePct = previous < MIN_CHANGE_BASE ? null : Math.round(((value - previous) / previous) * 100)`.
- [ ] **Step 4: Seed page visits for 60 days** (days 0–59 relative to reseed): each day's visitor count = that day's seeded joins (from members' `joinedDaysAgo`) × ~6.5 with ±20% deterministic noise and a floor of 40, so any window's join rate is ≈ 15% and visitor growth tracks join growth (the seed's joins grow ~+189% month on month; that is a plausible young space, unlike +2850%). Keep `visits` 1–3 per visitor-day and the existing bot/cap rules.
- [ ] **Step 5: Seed AI thumbs:** ~30 `ai_feedback` rows from the demo owner in the last 30 days, ~80% up, on the highest-fit seeded posts/pitches, spread across days. Use the same insert shape `POST /api/studio/feedback` writes.
- [ ] **Step 6: Integration check:** reseed into the test DB, call `studioMetrics(days=30)` for the demo space and assert, for both `days=30` and `days=7`: `joinRate` between 0.10 and 0.25; `bioVisitors.changePct` within 40 points of `joins.changePct` (or both null); `aiAgreement.rate` between 0.7 and 0.9 for `days=30`.
- [ ] **Step 7: Run** unit + integration → PASS. Report changed files.

### Task 2: Fan crew builds a business ("Fare Pals")

**Files:**
- Modify: `api/src/db/seed/generate-content.ts` (new story constant beside `LISBON` ~:1499 / `OAXACA` ~:1507; literal appended at the END of `posts[]`; title added to `usedTitles` ~:1706)
- Regenerate: `api/src/db/seed/data/posts.json` via `pnpm --filter @fellow-owners/api exec tsx src/db/seed/generate-content.ts`
- Modify: `api/src/db/seed/data/promotions.json`
- Modify: `web/components/landing/demo-data.ts` (`showcase` ~:384, Fare Pals first)
- Test: extend `api/tests/unit/seed-promote-line.test.ts` or create `api/tests/unit/seed-fare-pals.test.ts`

**Interfaces:**
- Produces: seeded project title exactly `Fare Pals: fare alerts for $60-a-day trips`, community `budget-travel`, type `project`, status `launched`.

- [ ] **Step 1: Failing test** reading `posts.json` + `promotions.json`:
  - exactly one post with that title; `team` has 5 `accepted` members with roles `Developer`, `Designer`, `Fare analyst`, `Local guide`, `Community host`; `ai.fitScore >= 90`; `ai.fitReason` cites the taste profile; body mentions a sign-up count and links a sign-up page (example.com URL)
  - `promotions.json` has an entry for it with `publishedDaysAgo: 2`, drafts for `x`, `instagram`, `youtube`, a `showcaseSlug` and clicks
  - promotions with `publishedDaysAgo < 30` number 4 (rate ≈ 0.9/week) and at least one has `publishedDaysAgo < 7`
  - the posts that existed before keep their indices (compare the first N titles to a snapshot list taken in the test)
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** the story (append-only, so RNG draws and indices for existing posts don't move); add the Fare Pals promotion and one more promotion of an existing launched project at ~16 days ago. Run the generator; `--check` first.
- [ ] **Step 4: Landing:** add the Fare Pals card first in `DEMO.showcase` (same shape as existing entries; crew faces from existing `fan-*` assets).
- [ ] **Step 5: Run** unit tests + `pnpm --filter @fellow-owners/web typecheck` → PASS. Report changed files.

### Task 3: Demo resilience (briefing + schedule)

**Files:**
- Modify: `api/src/services/briefing.service.ts` (`get` ~:407-421, `uncached` ~:370)
- Modify: `api/src/workers/tick.ts` (`JOB_NAMES`, `SCHEDULE`)
- Create: `api/src/workers/demo-briefing.ts`
- Modify: `api/src/container.ts` (wire the new job)
- Test: `api/tests/unit/tick-schedule.test.ts` (extend), `api/tests/integration/briefing-*.test.ts` (extend or create)
- DB: `fellow_owners_test_b2`

**Interfaces:**
- Produces: job name `'demo_briefing'` (hourly, listed right after `'demo_reset'`); `export async function warmDemoBriefing(deps): Promise<{ warmed: boolean }>`.

- [ ] **Step 1: Failing tests:**
  - `dueJobs` at 01:00 UTC includes `demo_reset`; at 09:00 UTC does not; every hour includes `demo_briefing`.
  - Briefing: with a fake AI that throws `AiUnavailableError`, two `get` calls within 15 minutes call the AI once; a call after 15 minutes calls it again. A successful build is still cached for the UTC day.
  - `warmDemoBriefing` with no demo space returns `{ warmed: false }` and does not throw; with the seeded demo space it leaves a cached digest for today.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement**
  - `SCHEDULE.demo_reset = { hour: 1 }` (keep `purge` at 9).
  - Failed-build memo: in-process `Map<spaceId, { until: number; result }>` with a 15-minute TTL, checked in `get` before building. `// ponytail: per-process memo; move to Redis if the API scales past one instance.`
  - `warmDemoBriefing`: find the demo space owner (reuse how `demo.service.ts` / the seed find it), call `briefing.get(owner)`; catch and log errors.
- [ ] **Step 4: Run** unit + integration → PASS. Report changed files.

### Task 4: Demo caps and guards

**Files:**
- Modify: `shared/src/limits.ts` (add `DEMO_CAP_SCALE = 5`, `DEMO_AI_DAILY_TOKEN_BUDGET = 1_000_000`)
- Modify: `api/src/services/ask.service.ts` (`usedToday` ~:34-37, cap check ~:85-93)
- Modify: `api/src/services/limits.service.ts` (~:95-111 pitches/posts per day), `api/src/ai/run.ts` (`TASK_CAPS` ~:115-145, budget check ~:198-201)
- Modify: `api/src/routes/demo.routes.ts` (~:9-13 limiter), `api/src/routes/studio.routes.ts` (`PUT /settings` ~:96, reuse `notDemoAccount` ~:61)
- Modify: `web/components/landing/demo-button.tsx` (~:36-40)
- Test: `api/tests/unit/limits.test.ts` (extend), `api/tests/integration/demo-*.test.ts` and `ask-*.test.ts` (extend or create)
- DB: `fellow_owners_test_b3`

**Interfaces:**
- Produces: `export function dailyCap(base: number, space: { isDemo: boolean }): number` in `shared/src/limits.ts` (`isDemo ? base * DEMO_CAP_SCALE : base`).

- [ ] **Step 1: Failing tests:**
  - `dailyCap(30, { isDemo: true }) === 150`; `dailyCap(30, { isDemo: false }) === 30`.
  - Ask: a normal space is refused on question 31; the demo space is allowed on question 31; an ask whose AI call failed does not count toward `usedToday`.
  - Demo fan: 6th pitch of the day allowed (cap 25), normal fan refused on the 6th.
  - AI token budget for a demo space is `DEMO_AI_DAILY_TOKEN_BUDGET`; for others the space's own value.
  - Demo sign-in: 25 requests in a minute from one IP succeed; the limits are 30/minute and 150/hour per IP; a 429 response carries `Retry-After`.
  - `PUT /api/studio/settings` as the demo creator changing `profile` or `tasteProfile` → 403 with message `The demo profile is read-only.`; changing `showReadReceipts` → 200.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement** with `dailyCap` at every per-day cap the CTO review listed (ask, askAI, coach, suggestReply, fan pitches, fan posts, briefing regenerations); `usedToday` counts only `status = 'ok'`. Real spaces unchanged.
- [ ] **Step 4: Web:** on a 429 from `enterDemo`, the toast reads `Lots of people are trying the demo. Try again in N minutes.` using `Retry-After` (fallback: "in a few minutes"); other errors keep the current text.
- [ ] **Step 5: Run** unit + integration + web typecheck → PASS. Report changed files.

### Task 5: Audience preview script (pilot first touch)

**Files:**
- Create: `api/src/scripts/audience-preview.ts` (CLI), `api/src/scripts/audience-preview-html.ts` (pure HTML builder + scrubber)
- Modify: `api/package.json` (script `"preview:audience": "tsx src/scripts/audience-preview.ts"`)
- Test: `api/tests/unit/audience-preview.test.ts`

**Interfaces:**
- Consumes: the YouTube fetch in `api/src/lib/youtube.ts` (channel → uploads → `commentThreads`) and the `clusterImport` task in `api/src/ai/tasks/cluster-import.ts`, called the same way `followers.service.ts runImport` calls them.
- Produces: `scrubComment(text: string): string`; `buildPreviewHtml(input: { channelTitle: string; videoCount: number; commentCount: number; rooms: { name: string; description: string; count: number; quotes: string[] }[]; generatedAt: Date; expiresAt: Date }): string`.

- [ ] **Step 1: Failing tests:**
  - `scrubComment('@sam_k loved this, mail me sam@x.com or +1 415 555 0100, see https://x.co')` contains none of `@sam_k`, `sam@x.com`, `555`, `https://`.
  - `buildPreviewHtml` output contains every room name and count, at most 3 quotes per room, each ≤ 140 chars, the banner `Built from public comments on your last 10 videos. Not published. Only you have this file.`, the expiry date, and no `<script`.
  - The CLI's input check: `sample: true` data, zero videos, or zero comments → throws `PreviewAbort` with a readable reason.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Usage: `pnpm --filter @fellow-owners/api preview:audience -- --channel <@handle|channel URL> --out <file.html>`. Requires `YOUTUBE_API_KEY` and a live AI key in env (works under `railway run --service api`). Last 10 videos, top comment threads. Cluster, then keep only aggregate counts + scrubbed quotes; never write raw comments or commenter names anywhere. Self-contained HTML with inline CSS in Parchment Frost colours, readable as a phone screenshot. Prints the output path and a one-line summary.
- [ ] **Step 4: Run** unit tests → PASS. Report changed files.

## Wave 2 (web, parallel)

### Task 6: Hero: "Rooms in the sky" (Dioramas Atlas) + AI twin

Owner request 2026-10-19: "select any hero from https://github.com/blendi-remade/dioramas". Pick: **13 · Atlas of
Drifting Isles** (floating islands = rooms for every interest; its sky-blue/peach/cream palette sits next to Parchment
Frost). Source (read-only reference, MIT code / CC BY 4.0 models) is checked out at
`C:/Users/Lenovo/AppData/Local/Temp/claude/e--idea-fellow-owner/8e330d45-9052-4023-b89e-db7c2dd2a3eb/scratchpad/dioramas-src`
(`examples/atlas/*`, `src/core/*`, `docs/ENGINE.md`, `docs/briefs/atlas.md`, reference still `public/img/index/atlas.webp`).
Compressed models are already in `web/public/atlas/{lighthouse,windmill,falls,pagoda}.glb` (meshopt + webp, 2.3–3.3 MB).

**Files:**
- Modify: `web/components/landing/hero.tsx`, `hero-product.tsx`, `hero-product-data.ts`, `hero.module.css`, `web/package.json` (+ lockfile)
- Create: `web/components/landing/twin-brief.tsx`, `web/components/landing/atlas/*` (scene modules), `web/public/atlas/poster.webp` (+ a mobile crop)
- Modify: `NOTICE.md` (Dioramas MIT + CC BY 4.0 credit), `web/components/layout/footer.tsx` (one small credit line only)

**Interfaces:**
- Produces: `export function TwinBrief(props: { compact?: boolean; room?: string }): JSX.Element`; poster images at `/atlas/poster.webp` and `/atlas/poster-mobile.webp` (Task 7 uses them).

- [ ] **Step 1: Remove** the demo-creator chip (`MIRA_CHIP`, `.miraChip/.miraAvatar/.miraAnchor`), the tilted browser + phone stage and its callouts.
- [ ] **Step 2: Scene.** Port the Atlas scene as a client-only module loaded with `next/dynamic` (`ssr: false`) after first paint, on desktop-class devices only (width ≥ 1024, WebGL2, no `prefers-reduced-motion`, no `saveData`). Dependencies: `three` (+ `@types/three`) only; replace the `postprocessing`/`n8ao`/`gsap` parts of the engine with built-in three.js (tone mapping, fog/haze, soft sprite clouds) and `requestAnimationFrame`. Keep: sky gradient + warm sun, soft layered clouds, the four islands bobbing, waterfalls if cheap, birds flocking between islands (fans moving between rooms), the airship. Load the main island first, the rest after. Pause rendering when the hero is off-screen or the tab is hidden; cap DPR at 1.5; dispose on unmount. The sky fades into the Parchment canvas at the bottom so the next section continues seamlessly.
- [ ] **Step 3: Islands are rooms.** Pins: `I Budget Travel`, `II Solo Travelers`, `III Travel Photography`, `IV Food Finds` with member counts from `DEMO`. Hover = rim glow + pin; click an island or pin = the camera flies there and a glass panel shows that room: members, new ideas this week, and the AI twin's top pick with its one-line why (Budget Travel's pick is Fare Pals). Esc / close returns to the overview. Keyboard: pins are buttons.
- [ ] **Step 4: `TwinBrief` card** in the bottom-right slot (where Atlas has its drift chart): header "Your AI twin", `Read 1,240 messages in 6 rooms this week. 3 need you.`, three picks (Lisbon idea, Fare Pals, one collab pitch) each with a short why, footnote `Demo data. Names are made up.`
- [ ] **Step 5: Copy (left column).** Keep the H1 and claim form. Subcopy `One link in your bio gathers your followers into rooms. Your AI twin reads every room and shows you the few ideas and people worth your time. You give them your spotlight.` Stat strip: `1 link in your bio` · `every pick shows why` · `fans credited by name`. A hint chip `Click any room to fly there` (desktop scene only).
- [ ] **Step 6: Poster + fallback.** Screenshot your own scene (Playwright, 2× at 1600×1000, islands framed right, no UI) → `poster.webp` (≤ 250 KB) and a portrait crop `poster-mobile.webp`; render it as the LCP `next/image` (priority) behind the canvas, and as the whole visual on mobile / reduced motion / no WebGL, with the pins and TwinBrief still shown as HTML.
- [ ] **Step 7: Credit.** NOTICE.md: Dioramas (github.com/blendi-remade/dioramas), MIT code, models CC BY 4.0. Footer: `3D islands: Dioramas (CC BY 4.0)` linking the repo.
- [ ] **Step 8: Verify** at 1440×900, 1024×768, 768×1024 and 390×844 on `http://localhost:3000` (shared dev server for this repo; don't start another): no portrait or follower counts in the hero; no overlap; 60 fps-ish on desktop (log frame time); network shows the GLBs load after the poster; reduced-motion shows the poster. `pnpm --filter @fellow-owners/web typecheck` + `pnpm lint` + `pnpm --filter @fellow-owners/web build` → PASS. Report files, bundle impact (first-load JS of `/` before/after) and screenshots.

### Task 7: Auth panel, product art

**Files:**
- Modify: `web/components/auth/auth-panel.tsx`, `web/components/auth/create-account-form.tsx` (~:257), `web/app/(auth)/layout.tsx` (comment only)

**Interfaces:**
- Consumes: `/atlas/poster-mobile.webp` (portrait islands still) and `TwinBrief` from `web/components/landing/twin-brief.tsx` (Task 6, running in parallel). Until they exist, use `/atlas/poster.webp` if present, else a sky-to-parchment CSS gradient, and import `TwinBrief` once the file appears (poll the file; don't create it yourself).

- [ ] **Step 1:** Replace `<CreatorImage name="auth-art">`, the "Demo: …'s space" pill and the room chips with the islands still (object-cover) + a compact `TwinBrief` card floating over it (keep `hidden lg:block`, `aria-hidden`, `inert`). Delete `demoSpace()`/`DEMO_HANDLE`: the panel makes no API call.
- [ ] **Step 2:** Keep the caption `Turn followers into fellow owners.` and `AuthPanelLine`. Name placeholder → `Your name`.
- [ ] **Step 3: Verify** `/login`, `/create-account`, `/forgot-password` at 1440×900 and 1024×768 with the API stopped: art renders, no console errors. Typecheck + lint → PASS. Report files + screenshots.

### Task 8: Onboarding reframed around the twin

**Files:**
- Modify: `web/components/onboarding/onboarding-templates.ts` (`STEPS` ~:58-87), `platforms-step.tsx`, `taste-step.tsx`, `onboarding-preview.tsx` (~:65, ~:227, ~:244), `onboarding-art.ts`, `onboarding.module.css` (only if the art removal needs it)

- [ ] **Step 1: Step copy:** step 1 title `Let your AI twin meet your audience`, helper `Optional. Paste a profile link. Your AI twin reads recent comments and suggests rooms for your fans.` Step 3 title `Teach your AI twin`, helper `What you promote, what you never promote, and how you sound. Only you see this.` Steps 0 and 2 unchanged.
- [ ] **Step 2: Remove follower totals:** the "N followers across M platforms" line in the step, and the platform follower rows plus "{total} followers in total" in the preview. Platform cards may still show that a link was found.
- [ ] **Step 3: Art:** `onboarding-art.ts` maps every step to no still (Parchment wash only); remove the now-unused still lookup.
- [ ] **Step 4: Verify** by creating a fresh account locally and walking all four steps at 1440 and 390 widths: no follower counts, twin wording on steps 1 and 3, finishing still creates the space. Typecheck + lint → PASS. Report files + screenshots.

### Task 9: Landing sections, founding-creator door

**Files:**
- Modify: `web/components/landing/demo-cta.tsx` (~:18-22, ~:60-81), `fans-screens.tsx` (~:106-113), `loop-data.ts` (~:30-60 step copy), `trust-section.tsx` (copy only)
- Modify: `web/components/marketing/contact-form.tsx`, `web/app/(public)/contact/page.tsx`

**Interfaces:**
- Produces: `/contact?topic=founding` prefills the message with `I'd like to be a founding creator. My main channel: ` (cursor at the end); any other or missing `topic` leaves it empty.

- [ ] **Step 1: CTA strip:** replace followers/rooms/fans demo numbers and the "Demo numbers from Mira's space." note with `1 link` · `Rooms for every interest` · `About 10 minutes a day`. Under the buttons, one line: `Founding creators: we set it up with you and ship one change you ask for within 48 hours.` with link text `Apply` → `/contact?topic=founding`.
- [ ] **Step 2: Fans join screen:** drop the follower count under the creator name (keep name + handle).
- [ ] **Step 3: Twin wording:** loop step "AI sorts them into rooms." → `Your AI twin sorts them into rooms.`; trust section adds the line `Your AI twin reads like you. It never speaks for you.` without changing its three headings.
- [ ] **Step 4: Contact prefill** from the `topic` search param (server page passes it down, or the client form reads it). Plain text only, no HTML injection.
- [ ] **Step 5: Verify** landing at 1440 and 390, and `/contact?topic=founding`. Typecheck + lint → PASS. Report files + screenshots.

### Task 10: Studio is one loop, twin up front

**Files:**
- Modify: `web/components/layout/dashboard-nav.ts` (~:32-74), `web/components/dashboard/today/today-container.tsx` (~:78-103), `today-view.tsx` (~:31-95), `ask-card.tsx`
- Create: `web/components/dashboard/settings/feedback-card.tsx`; Modify: the settings page/container that lists settings cards (add the card last)
- Modify: `web/e2e/smoke.spec.ts` only if a listed page title changes

- [ ] **Step 1: Rail:** remove Brand deals, Planner and Performance from `NAV_GROUPS`; keep routes. Check `bottom-nav.tsx` `PHONE_ROOMS` labels still all exist.
- [ ] **Step 2: Today:** remove `BrandPickCard`, `ProfileScoreCard`, `PlatformsCard` from Today (leave their files). Render `AskCard` first in the right column, title `Ask your AI twin`, helper `Answers come only from what your fans posted and pitched.`
- [ ] **Step 3: Greeting subline:** `Your AI twin read {ideas} new ideas and {messages} messages. {n} need you.` from counts Today already has (`overview.stats` / the stack length); fall back to the current subline when counts are missing.
- [ ] **Step 4: Feedback card** in Settings: heading `Tell the founder`, textarea (min/max from `LIMITS.support`), checkbox `You can quote me by name in Fellow Owners' materials.` (unchecked by default), button `Send`. Posts to the existing support request client with kind `contact`, the account's name and email, and the message prefixed `[Product feedback]` and suffixed `Quote consent: yes|no`. `// ponytail: consent lives in the message text; add a kind + column if feedback volume grows.` Success state `Thanks. The founder reads every note.` Hidden for the demo creator account.
- [ ] **Step 5: Verify** with the local demo creator: rail has 8 items; Today shows the twin card top right and no platform/brand/profile cards; Settings card sends (check the API log or `support_requests`). Typecheck + lint + `pnpm --filter @fellow-owners/web test:e2e` against the local stack → PASS. Report files + screenshots.

### Task 14: Leaner landing (owner picks 2026-10-19, supersedes Task 6's islands)

Owner: the landing "has too much info"; footer, CTA, Problem and FAQ are fine. Owner picked an **Orbito-style hero with no
3D islands** (reference https://jiro.build/components/header/ai-seo-agency-header-orbito: landscape background, big serif
H1 left, a live AI chat demo right, tabs under it). For creators follows **MyModz**
(https://jiro.build/components/header/modboard-organizer-header-mymodz: centered serif headline with an inline image chip,
a few objects scattered on grid paper, one button). For fans follows **Quotify**
(https://jiro.build/components/header/quote-generator-header-quotify: centered headline, tall fanned cards at both edges,
a moving strip of cards, one line, one button). Borrow the technique, never copy code or assets. The islands work is
removed (no `three`, no GLBs, no Dioramas credit).

New order: Hero → Problem → For creators → For fans → FAQ → CTA → Footer. Removed: How it works (loop), Connect,
Showcase strip, Trust (its three promises move into For creators as one line of chips).

- **14a Hero** (`hero.tsx`, `hero-product.tsx`, `hero-product-data.ts`, `hero.module.css`, new `twin-chat.tsx`,
  `twin-brief.tsx`): background `/creator/hero-scenery.webp` (mobile `/creator/hero-scenery-mobile.webp`), `next/image`
  priority. Left: eyebrow, H1, one-line subcopy, the existing claim form (the only button). Right: a frosted
  "Ask your AI twin" chat panel with a `Demo` badge; a fan-facing question bubble, then the twin's answer types out
  (instant under reduced motion): three picks, each with its one-line why and room chip. Under the panel, three question
  tabs (`What do fans want next?`, `Who should I team up with?`, `What's worth featuring?`) switch to prewritten answers
  built from `DEMO` (Lisbon idea, Fare Pals, a collab pitch…). Footnote `Demo data. Names are made up.` No portrait, no
  follower counts, no stat strip, no "In Mira's demo space" card. Keep `TwinBrief({ compact })` working for the auth panel.
- **14b For creators** (`creators-section.tsx` + its CSS module): parchment grid-paper ground, eyebrow `For creators`,
  centered serif headline with an inline product chip, one line of copy, 3–4 tilted product cards scattered around
  (decision card with its why, Fare Pals spotlight with clicks, fans-to-thank avatars, a "why" sticky note), a row of
  promise chips (`Every pick shows why` · `Fans are never scored in public` · `Nothing posts without you`), one button
  `Try the creator demo` (existing `DemoButton as="creator"`).
- **14c For fans** (`fans-section.tsx` + a new CSS module): centered headline `Fans get a door, not a DM.`, tall fanned
  cards at both edges with real-feeling fan quotes, a slow moving strip of fan project cards (title + "by name" / crew),
  one line `Join a room in 60 seconds, share an idea, team up, and get credited by name when it's featured.`, one button
  `Try the fan demo` (`DemoButton as="fan"`). Demo label kept.
- **14d Orchestrator:** `app/(public)/page.tsx` section list, nav anchors (no `#one-week`), delete files left unused.

### Task 13: Direct Anthropic for the chat tiers (owner pick 2026-10-19)

The owner supplied an Anthropic API key for the app's live AI, to get off the OpenRouter spend cap for chat.

**Files:**
- Modify: `api/src/ai/provider.ts`, `api/src/config/env.ts`, `api/package.json` (+ lockfile: `@ai-sdk/anthropic` matching the installed `ai`/`@ai-sdk/provider` majors), `api/.env.example` if it exists
- Test: `api/tests/unit/ai-provider.test.ts` (create or extend), `api/tests/unit/env.test.ts` (extend)

**Interfaces:**
- Env: `ANTHROPIC_API_KEY` (optional), `ANTHROPIC_MODEL_FAST` (default `claude-haiku-5-5`), `ANTHROPIC_MODEL_SMART` (default `claude-sonnet-5-5`).
- `createAiModels(env)` keeps its signature/return type. With `ANTHROPIC_API_KEY` set, `fast` and `smart` use `@ai-sdk/anthropic` with those ids (same `extractJsonMiddleware` wrapping); without it, today's OpenRouter behaviour is unchanged. Embeddings always stay on OpenRouter (`OPENROUTER_API_KEY` still required when AI is enabled).

- [ ] **Step 1: Failing tests:** with `ANTHROPIC_API_KEY` the fast/smart refs report ids `claude-haiku-5-5` / `claude-sonnet-5-5` and provider `anthropic`; without it, ids/provider are today's; env parsing accepts the three new vars; the key never appears in logs (`redact` paths include it if the logger redacts env).
- [ ] **Step 2: Implement.** Check `run.ts` for OpenRouter-only metadata (cost, usage) and report anything that would mis-account Anthropic calls — don't edit `run.ts`.
- [ ] **Step 3: Run** unit tests + api typecheck → PASS. Orchestrator does one live smoke call locally.

## Wave 3 (orchestrator)

### Task 11: Pilot playbook

**Files:** Create `docs/pilot/playbook.md` from the CEO review of 2026-10-19: targets (two groups, B first), where to find them, daily volume, day-by-day, the offer, safe preview rules, DM + follow-up, five feedback questions, testimonial ask, ranked honest fallbacks, never-do list, and the preview script command from Task 5.

### Task 12: Release gate

- [ ] Reseed the local DB; run lint, typecheck (all), unit, integration, web build, `docker build` of `api`.
- [ ] Fresh reviewers on a different model from each implementer: code review of the whole diff + a security pass on Task 4 and Task 5.
- [ ] Screenshots of landing, auth, onboarding, Today, Settings at desktop + phone width for the owner.
- [ ] Owner OK, then push `main`. After the push: `vercel ls fellow-owners-web --prod` shows the new commit (else the CLI deploy from the memory notes), `/api/health` shows the new version, migrations: none expected, prod Playwright smoke, then `POST /api/cron/tick?job=demo_reset` so the new seed is live.
