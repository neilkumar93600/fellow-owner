# Creator Pivot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-skin and re-story Fellow Owners from a developer tool into a creator + fan platform: a US lifestyle/travel demo creator, "Golden Hour Frost" frosted glass, an icon rail with decision cards, and six new creator/fan features.

**Architecture:** This is the existing pnpm/turbo monorepo: `web` (Next.js 16, Tailwind v4, motion), `api` (Express 5, Drizzle, Postgres + pgvector) and `shared` (zod schemas, enums, types). The work runs as two workflow runs:

- **Run 1, Foundation:** tokens and primitives, shared/DB changes, seed content, imagery, and a prototype of the landing hero and the Today screen. The run ends with a screenshot sign-off from the user.
- **Run 2, Fan-out:** 12 parallel agents split by file ownership, then review and QA.

**Tech Stack:** Next.js 16.3 (read `web/node_modules/next/dist/docs/` before Next-specific code), React 19.2, Tailwind v4 `@theme`, `motion` 13, `lucide-react`, TanStack Query 5, Express 5, Drizzle ORM + drizzle-kit, vitest + supertest, Playwright, Biome, fal.ai (images and video).

**Spec:** `docs/superpowers/specs/2026-10-09-creator-pivot-design.md`. Every executor reads it first.

## Global Constraints

- The demo creator is **Mira Lane**, handle `mira`, a Los Angeles lifestyle and travel vlogger. Followers: YouTube 620000, Instagram 380000, TikTok 140000.
- Communities, by slug: `budget-travel`, `solo-travelers`, `travel-photography`, `food-finds`, `road-trips`, `slow-living`. Names, icons and tints follow spec §3.
- The demo fan is **Priya Shah** (Austin), in Solo Travelers and Food Finds.
- The hero story is **"Lisbon on $60 a day"** (Budget Travel, a fan-made guide built by a team of 4).
- Pitch type `investment` is renamed to `brand_deal` (label "Brand deal"). Inbox tab `investment` becomes `brand_deals`.
- Labels: signal `build` reads "Count me in". Post status labels: Open / Finding a crew / In the works / Made it.
- Vocabulary follows spec §9. No developer or SaaS words appear in UI copy: triage, fit score, pipeline, ship, build in public, members (use fans), projects (use collabs), investment.
- Colour tokens:
  - ink `#1E1B26`, ink-soft `#55506A`
  - coral `#F0603A` and coral-hover `#D94E2A`, used for **one primary action per screen**
  - sky `#3B82C4`, success `#15803D`, warn-ink `#A45A00`
  - cream `#FBF7F2`
  - aurora peach `#FFD9C2`, sky `#BFDDF7`, lilac `#DCCFF7`, mint `#CFEFE3`
- Glass: `backdrop-filter: blur(24px) saturate(160%)`, white fill at 55–72%, a 1px `rgba(255,255,255,.7)` inner highlight, shadow `0 20px 60px -20px rgba(40,30,60,.18)`, radius 24–28px. Where `@supports not (backdrop-filter: blur(1px))`, use a 92% white fill.
- Fonts: Inter for UI (`--font-inter`, already set up). Instrument Serif for display (`--font-display`), used only at ≥ 28px.
- Removed everywhere: the lime active fill, the purple primary button, the 40px pewter shell frame, the sphere canvas, the clay loop video and its frames, and the clay auth/onboarding art.
- WCAG 2.2 AA: text on glass ≥ 4.5:1, a visible focus ring, `prefers-reduced-motion` honoured, touch targets ≥ 44px on fan pages.
- The AI never sends anything to fans without a creator click.
- Never touch Neon. Use local Docker Postgres `postgres://fellow:fellow@localhost:5432/<db>`. Each agent uses only its assigned test DB.
- Never kill processes on :3000 or :4000. Agents that need servers use :3006 (web) and :4100 (API).
- Do not commit. The repo is mostly untracked and the user decides when to commit. Leave changes in the working tree.

## Review Focus

1. **Text contrast on frosted glass over the bright aurora**, especially the peach and mint zones. It must stay ≥ 4.5:1. Task 1 adds a contrast check script; reviewers run it on the screenshots.
2. **Browsers without `backdrop-filter`** (older in-app webviews). Panels must fall back to a near-opaque fill, never transparent text on a busy backdrop. Task 1 adds an `@supports` fallback and a Playwright check that emulates it.
3. **Missing generated images** (no `FAL_KEY`, or generation failed). Every image slot must render a same-ratio gradient placeholder with no layout shift and no broken-image icon. Task 1's `CreatorImage` test covers it.
4. **The decision-card stack on keyboard and screen reader**: arrow keys move, Enter acts, and focus never lands on a hidden card. An empty stack shows "You're all caught up". Task 6 adds tests.
5. **Challenge closed or past due while a fan is submitting.** The API must reject the entry with 409 and the UI must show a plain message. Task 9 adds an integration test.

---

# RUN 1: Foundation (6 agents; ends with user screenshot sign-off)

Order: Tasks 1 and 2 run in parallel, then Tasks 3, 4, 5 and 6 run in parallel.

### Task 1: Golden Hour Frost design system — **opus · high**

**Files:**
- Modify: `web/app/globals.css` (replace Clubhouse tokens with Golden Hour Frost `@theme` tokens; add `.glass`, `.glass-strong`, `.glass-chip`, `.aurora`, `.grain`, focus ring, `@supports` fallback)
- Modify: `web/lib/fonts.ts` (add Instrument Serif), `web/app/layout.tsx` (font variables, aurora backdrop, cream body)
- Modify: `web/components/ui/*` (button variants: `primary` = coral, `secondary` = glass, `ghost`; remove purple/lime)
- Modify: `web/components/shared/*` (restyle: stat-card, tab-bar, segmented-pill, toolbar, side-panel, status-pill, community-card, community-chip, idea-card, empty-state, page-heading, pagination, data-table)
- Create: `web/components/shared/glass-panel.tsx`, `web/components/shared/aurora-backdrop.tsx`, `web/components/shared/match-label.tsx`, `web/components/shared/creator-image.tsx`, `web/lib/creator-assets.ts`
- Rewrite: `DESIGN.md`, `DESIGN.json` (Golden Hour Frost; delete Clubhouse content)
- Create: `web/scripts/contrast-check.mjs`
- Test: `web/components/shared/match-label.check.mjs` (node assert script, same style as `web/lib/format.check.mjs`)

**Interfaces — Produces:**
```ts
// web/components/shared/glass-panel.tsx
export function GlassPanel(props: {
  as?: 'div' | 'section' | 'article' | 'aside' | 'header' | 'nav';
  strength?: 'soft' | 'strong';      // soft = 55% fill, strong = 72%
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>): JSX.Element;

// web/components/shared/aurora-backdrop.tsx  (fixed, inset-0, -z-10, aria-hidden; static under reduced motion)
export function AuroraBackdrop(): JSX.Element;

// web/components/shared/match-label.tsx
export type MatchTier = 'strong' | 'worth' | 'not';
export function matchTier(score: number | null | undefined): MatchTier | null; // >=80 strong, 60-79 worth, <60 not, null->null
export const MATCH_LABELS: Record<MatchTier, string>; // 'Strong match' | 'Worth a look' | 'Not for you'
export function MatchLabel(props: { score: number | null | undefined; className?: string }): JSX.Element | null;

// web/lib/creator-assets.ts
export type CreatorAsset =
  | 'mira-portrait' | 'mira-portrait-alt'
  | 'vlog-lisbon' | 'vlog-night-market' | 'vlog-van-coast' | 'vlog-cafe' | 'vlog-mountain' | 'vlog-hostel'
  | 'cover-budget-travel' | 'cover-solo-travelers' | 'cover-travel-photography'
  | 'cover-food-finds' | 'cover-road-trips' | 'cover-slow-living'
  | 'fan-1' | 'fan-2' | 'fan-3' | 'fan-4' | 'fan-5' | 'fan-6'
  | 'auth-art';
export const CREATOR_ASSETS: Record<CreatorAsset, { src: string; width: number; height: number; ready: boolean; tone: 'peach' | 'sky' | 'lilac' | 'mint' }>;
export const CREATOR_CLIP: { src: string; poster: CreatorAsset; ready: boolean }; // '/creator/one-week.mp4'

// web/components/shared/creator-image.tsx
// Renders next/image when CREATOR_ASSETS[name].ready, otherwise a same-aspect gradient div in `tone`
// with role="img" and the alt text. Never a broken image.
export function CreatorImage(props: { name: CreatorAsset; alt: string; priority?: boolean; sizes?: string; className?: string; fill?: boolean }): JSX.Element;
```
Tailwind token names that other tasks use: `bg-cream`, `text-ink`, `text-ink-soft`, `bg-coral`, `hover:bg-coral-hover`, `text-sky`, `font-display`, `rounded-panel` (28px), `rounded-chip` (999px), `shadow-glass`. Utility classes: `glass`, `glass-strong`, `glass-chip`.

- [ ] **Step 1: Read context.** Read the spec §4, the current `web/app/globals.css`, `DESIGN.md`, `web/components/ui/button-variants.ts`, and `web/lib/format.check.mjs` (the check-script pattern).
- [ ] **Step 2: Write the failing check** in `web/components/shared/match-label.check.mjs`:
```js
import assert from 'node:assert/strict';
import { matchTier, MATCH_LABELS } from './match-label-core.mjs';
assert.equal(matchTier(94), 'strong');
assert.equal(matchTier(80), 'strong');
assert.equal(matchTier(79), 'worth');
assert.equal(matchTier(60), 'worth');
assert.equal(matchTier(59), 'not');
assert.equal(matchTier(null), null);
assert.equal(matchTier(undefined), null);
assert.equal(MATCH_LABELS.strong, 'Strong match');
assert.equal(MATCH_LABELS.worth, 'Worth a look');
assert.equal(MATCH_LABELS.not, 'Not for you');
console.log('match-label ok');
```
Also write `web/components/shared/creator-image.check.mjs` against a pure `creator-image-core.mjs`:
```js
import assert from 'node:assert/strict';
import { imageMode } from './creator-image-core.mjs';
assert.equal(imageMode({ ready: false }), 'placeholder');   // missing file never renders <img>
assert.equal(imageMode({ ready: true }), 'image');
assert.equal(imageMode(undefined), 'placeholder');          // unknown asset name
console.log('creator-image ok');
```
Run `node web/components/shared/match-label.check.mjs`. It should FAIL with "Cannot find module".
- [ ] **Step 3: Implement** `match-label-core.mjs` (pure tier logic, plain JS with a JSDoc type) and `match-label.tsx`, which imports from it and renders a glass chip with a text label. Run the check. It should print `match-label ok`.
- [ ] **Step 4: Tokens.** Replace the `@theme` block in `globals.css`:
```css
@theme {
  --color-cream: #FBF7F2;
  --color-ink: #1E1B26;
  --color-ink-soft: #55506A;
  --color-coral: #F0603A;
  --color-coral-hover: #D94E2A;
  --color-sky: #3B82C4;
  --color-success: #15803D;
  --color-warn-ink: #A45A00;
  --color-aurora-peach: #FFD9C2;
  --color-aurora-sky: #BFDDF7;
  --color-aurora-lilac: #DCCFF7;
  --color-aurora-mint: #CFEFE3;
  --radius-panel: 28px;
  --radius-chip: 999px;
  --shadow-glass: 0 20px 60px -20px rgb(40 30 60 / 0.18);
  --font-display: var(--font-instrument-serif), Georgia, serif;
}
.glass { background: rgb(255 255 255 / .55); backdrop-filter: blur(24px) saturate(160%); -webkit-backdrop-filter: blur(24px) saturate(160%); box-shadow: inset 1px 1px 0 rgb(255 255 255 / .7), var(--shadow-glass); border-radius: var(--radius-panel); }
.glass-strong { background: rgb(255 255 255 / .72); /* same filter/shadow as .glass */ }
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .glass, .glass-strong, .glass-chip { background: rgb(255 255 255 / .92); }
}
```
Keep any token other code still references until every caller migrates. List the old ones in a `/* legacy: remove in Task 15 */` block, so Task 15 can delete them once `rg` shows no callers.
- [ ] **Step 5: Fonts and layout.** Add `Instrument_Serif({ weight: '400', style: ['normal', 'italic'], subsets: ['latin'], variable: '--font-instrument-serif', display: 'swap' })` to `lib/fonts.ts`. Put both variables on `<html>` in `app/layout.tsx`, set `bg-cream text-ink` on body, and render `<AuroraBackdrop />` once.
- [ ] **Step 6: Primitives.** Write `GlassPanel`, `AuroraBackdrop` (three blurred radial blobs plus a `.grain` SVG-noise overlay at 3%, slow 40s drift via CSS keyframes, `animation: none` under `prefers-reduced-motion`), `creator-assets.ts` (every entry `ready: false`; `src: /creator/<name>.webp`; sizes 1600x1000 for vlogs and covers, 1200x1500 for portraits, 256x256 for fans) and `CreatorImage`.
- [ ] **Step 7: Restyle `components/ui/*` and `components/shared/*`** to the tokens:
  - buttons: coral primary, glass secondary
  - tabs: glass chip, coral underline dot
  - status pills: AA ink on a tinted fill
  - side-panel: glass-strong
  - data-table: header and row lines on glass
  - Replace every fit-number display in `fit-pill.tsx` with a re-export of `MatchLabel`. Keep the `FitPill` export name as an alias so callers still compile.
- [ ] **Step 8: Contrast script.** `web/scripts/contrast-check.mjs` takes pairs of hex colours as arguments and asserts ≥ 4.5. Run it for: ink on white-55-over-peach (composite `#FFF0E7`), ink-soft on the same, white on coral, coral on cream. If white on coral fails, darken coral until it passes, and update the token and this plan's Global Constraints line in DESIGN.md.
- [ ] **Step 9: DESIGN.md / DESIGN.json.** Rewrite them as "Golden Hour Frost" with tokens, glass rules, type scale, the one-coral-per-screen rule, image rules (realistic golden-hour photography of the fictional creator, no text, no logos) and a "Not this" list (Starline pewter shell, lime active pill, purple button).
- [ ] **Step 10: Verify.** Run `pnpm --filter @fellow-owners/web typecheck` and `pnpm biome check web`. Neither may add errors beyond the known one in `app/(dev)/kit/primitives/page.tsx`.

### Task 2: Shared enums, DB migration 0004, notification kinds — **opus · high** · test DB `fellow_owners_test`

**Files:**
- Modify: `shared/src/enums.ts`:
  - `PITCH_TYPES` (`investment` → `brand_deal`), `INBOX_TABS` (`investment` → `brand_deals`), `INBOX_TAB_PITCH_TYPE`
  - `PITCH_TYPE_LABELS` (`brand_deal: 'Brand deal'`)
  - `SIGNAL_LABELS.build = 'Count me in'`
  - `POST_STATUS_LABELS` (Open / Finding a crew / In the works / Made it)
  - `NOTIFICATION_KINDS` += `post_loved`, `spotlighted`, `challenge_shortlisted`
- Modify: `shared/src/types.ts` and `shared/src/schemas/*.ts` (types and schemas below)
- Modify: `api/src/db/schema/posts.ts` (`askId`, `lovedAt`), `api/src/db/schema/memberships.ts` (`spotlightAt`, `spotlightNote`), `api/src/db/schema/later.ts` (asks unchanged; the notifications CHECK picks up the new kinds automatically)
- Create: `api/src/db/migrations/0004_creator_pivot.sql` (+ meta snapshot and journal via drizzle-kit)
- Modify: `api/src/services/notifications.service.ts` (`NotificationPayloads` for the new kinds; `ask_posted` gets a real payload)
- Modify: every TS reference to `'investment'` or `InboxTab 'investment'` across `api/src`, `api/tests`, `web` (identifier sweep only; copy belongs to the screen owners)
- Test: `api/tests/integration/migration-0004.test.ts`

**Interfaces — Produces** (in `shared`):
```ts
export const PITCH_TYPES = ['collab', 'brand_deal', 'idea', 'press', 'fan_note', 'other'] as const;
export const NOTIFICATION_KINDS = [...existing, 'post_loved', 'spotlighted', 'challenge_shortlisted'] as const;

// schemas/post.ts
export const loveParamsSchema = z.object({ id: idSchema });              // POST/DELETE /api/studio/posts/:id/love
export const suggestReplyParamsSchema = z.object({ id: idSchema });      // POST /api/studio/inbox/:id/suggest-reply
// schemas/membership.ts
export const spotlightDraftSchema = z.object({});                         // POST /api/studio/people/:membershipId/spotlight/draft
export const spotlightSchema = z.object({ note: z.string().trim().min(1).max(280) }); // PUT .../spotlight
// schemas/ask.ts (new file, exported from index)
export const createChallengeSchema = z.object({
  title: z.string().trim().min(LIMITS.post.title.min).max(LIMITS.post.title.max),
  body: z.string().trim().max(2000).optional(),
  communityId: idSchema.nullable(),          // null = all communities
  dueAt: z.string().datetime(),              // must be in the future (checked in service)
});
export const challengeParamsSchema = z.object({ id: idSchema });
export const challengeWinnerSchema = z.object({ postId: idSchema });
export const challengeEntrySchema = z.object({ title: postTitleSchema, body: postBodySchema, links: postLinksSchema.default([]) }); // fan entry, type forced to 'idea' (createPostSchema is refined, so .pick is unavailable)

// types.ts
export interface ChallengeSummary { id: string; title: string; body: string | null; communityId: string | null;
  communityName: string | null; dueAt: string; status: 'open' | 'closed'; entryCount: number;
  shortlist: Array<{ postId: string; title: string; authorName: string; reason: string }> | null;
  winnerPostId: string | null; createdAt: string; }
export interface FanSpotlight { membershipId: string; name: string; avatarUrl: string | null; note: string; spotlightAt: string; communityName: string | null; }
export interface PostCredit { name: string; role: string; avatarUrl: string | null; }   // showcase "Made by"
// Add `lovedAt: string | null` to the post card/detail types that already carry `featuredAt`.
// Add `credits: PostCredit[]` to the public showcase type.
// Add `spotlights: FanSpotlight[]` to the public space page type.
// Add `challenge: { id: string; title: string; status: 'open'|'closed' } | null` to post types (entries).
```
`asks.response_summary` jsonb shape (stored by Task 9): `{ shortlist: ChallengeSummary['shortlist'], winnerPostId: string | null }`.

Notification payloads (in `notifications.service.ts`):
```ts
post_loved: { postId: string; title: string };
spotlighted: { note: string };
challenge_shortlisted: { askId: string; postId: string; title: string };
ask_posted: { askId: string; title: string; communityName: string | null };
```

- [ ] **Step 1: Write the failing migration test.**
```ts
// api/tests/integration/migration-0004.test.ts
import { sql } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { closeDb } from '../helpers/test-db.js';
const { db } = buildContainer();
afterAll(closeDb);
describe('migration 0004', () => {
  it('renames the investment pitch type to brand_deal', async () => {
    const rows = await db.execute(sql`select unnest(enum_range(null::pitch_type))::text as v`);
    const values = rows.map((r: { v: string }) => r.v);
    expect(values).toContain('brand_deal');
    expect(values).not.toContain('investment');
  });
  it('adds posts.ask_id, posts.loved_at, memberships.spotlight_at/spotlight_note', async () => {
    const cols = await db.execute(sql`select table_name, column_name from information_schema.columns
      where (table_name='posts' and column_name in ('ask_id','loved_at'))
         or (table_name='memberships' and column_name in ('spotlight_at','spotlight_note'))`);
    expect(cols.length).toBe(4);
  });
  it('accepts the new notification kinds', async () => {
    const def = await db.execute(sql`select pg_get_constraintdef(oid) as d from pg_constraint where conname='notifications_kind_check'`);
    expect(String(def[0]?.d)).toMatch(/post_loved/);
    expect(String(def[0]?.d)).toMatch(/spotlighted/);
    expect(String(def[0]?.d)).toMatch(/challenge_shortlisted/);
  });
});
```
Check the `db.execute` return shape in `api/src/db/client.ts` and adapt `rows` access if it differs. Run `cd api && TEST_DATABASE_URL=postgres://fellow:fellow@localhost:5432/fellow_owners_test pnpm db:migrate:test && TEST_DATABASE_URL=… pnpm vitest run tests/integration/migration-0004.test.ts`. It should FAIL.
- [ ] **Step 2: Shared changes.** Edit enums, schemas and types as listed, then build shared: `pnpm --filter @fellow-owners/shared build`.
- [ ] **Step 3: Drizzle schema.** In `posts.ts` add `askId: uuid('ask_id').references(() => asks.id, { onDelete: 'set null' })` and `lovedAt: timestamptz('loved_at')`, plus `index('posts_ask_idx').on(t.askId)`. Watch the import cycle: `later.ts` imports `communities` and `spaces`, not `posts`. In `memberships.ts` add `spotlightAt: timestamptz('spotlight_at')` and `spotlightNote: text('spotlight_note')` with a CHECK `spotlight_note is null or char_length(spotlight_note) <= 280`.
- [ ] **Step 4: Generate the migration.** `cd api && pnpm db:generate --name creator_pivot`. drizzle-kit may prompt about the enum change. Do not answer interactively. If it prompts or emits a DROP/CREATE of `pitch_type`, open the generated SQL and replace the enum part with exactly:
```sql
ALTER TYPE "public"."pitch_type" RENAME VALUE 'investment' TO 'brand_deal';
```
Keep drizzle's column, index and CHECK statements. Rename the file to `0004_creator_pivot.sql` and make sure `meta/_journal.json` points to it.
- [ ] **Step 5:** Run the migration on the test DB and the test from Step 1. It should PASS.
- [ ] **Step 6: Identifier sweep.** Run `rg -n "'investment'|\binvestment:" api/src api/tests web shared/src` and update each identifier to `brand_deal` / `brand_deals`. Update the `NotificationPayloads` types. Then run `pnpm typecheck` from the root. It must pass in all packages.
- [ ] **Step 7:** Run the full API unit and integration suites on `fellow_owners_test`. Fix only failures this task caused. Record the pre-existing failures (auth-password "reports whether a username is free") without fixing them.
- [ ] **Step 8:** Migrate the local dev DB: `cd api && DATABASE_URL=postgres://fellow:fellow@localhost:5432/fellow_owners pnpm db:migrate`.

### Task 3: Travel demo world (seed + AI fakes + API fixtures) — **sonnet · high** · test DB `fellow_owners_test_b3` · after Task 2

**Files:**
- Modify: `api/src/db/seed/generate-content.ts`:
  - `COMMUNITIES` banks: names, slugs, icons, tints and descriptions per spec §3, roles per Global Constraints, travel clause banks
  - `DEMO_FAN`: Priya Shah, `['solo-travelers', 'food-finds']`
  - all pitch bodies: brand deals, travel collabs, press, fan notes, spam ("buy 10K followers", "free cruise giveaway")
  - space: Mira Lane, bio, platforms YouTube/Instagram/TikTok, taste profile, voice samples
  - one `budget-travel` project titled exactly "Lisbon on $60 a day" with 4 accepted team members (Local guide, Photographer, Video editor, Itinerary planner) and the highest signal count
  - the two promotions: Lisbon + one Food Finds collab
  - the weighting comment and logic: Budget Travel + Solo Travelers carry most of the content
- Regenerate: `api/src/db/seed/data/*.json`
- Modify: `api/src/ai/fake.ts`, `api/src/auth/demo.ts`, `api/tests/fixtures/ai/*.json`, any `api/tests/**` string that asserts on old community names (rename consistently)
- Modify: `api/src/db/seed/seed.ts` only if new columns need seeding: set `loved_at` on 3 posts, `spotlight_at` + `spotlight_note` on 3 rising members, and one open challenge (`asks` row) in Food Finds, "Best $10 meal in your city", due in 5 days, with 6 entry posts linked by `ask_id`, plus one closed challenge in Travel Photography with a stored shortlist and winner.

- [ ] **Step 1: Read** spec §3 and §13. Then read `generate-content.ts` fully. Note its determinism contract: a fixed SEED, and banks composed rather than model-written.
- [ ] **Step 2: Rewrite the banks.** Change only the content (banks, demo space, pitches). Keep the structure, so the composer and RNG flow are unchanged.
- [ ] **Step 3:** Run `cd api && pnpm exec tsx src/db/seed/generate-content.ts --check` and confirm the counts are near the TARGETS. Then run it without `--check`.
- [ ] **Step 4: Acceptance grep.** This must print nothing:
```bash
rg -i "builders|gym-log|gym log|kapoor|frontend dev|backend dev|ios dev|investor|investment|crypto_gains|build-in-public|shipping software" api/src/db/seed api/src/ai/fake.ts api/src/auth/demo.ts
```
The taste profile's "never" list may keep the words "crypto and presales". Adjust the grep with `-g '!…'` only for that line.
- [ ] **Step 5: Seed the extras** (loved, spotlights, challenges) in `seed.ts` using the Task 2 columns. Run `cd api && DATABASE_URL=postgres://fellow:fellow@localhost:5432/fellow_owners pnpm db:seed`, then `pnpm db:embed` if the seed needs embeddings (it uses the fake provider when there is no AI key).
- [ ] **Step 6:** Run the API test suites on `fellow_owners_test_b3`. Rename fixture strings until they pass (same pre-existing exceptions as Task 2).

### Task 4: Creator imagery via fal.ai — **sonnet · medium** · after Task 1

**Prerequisite:** the user has set `FAL_KEY` in the environment. If it is not set, stop this task and report "FAL_KEY missing". Every other task works with placeholders.

**Files:**
- Create: `web/scripts/generate-creator-media.mjs` (reads `FAL_KEY` from env, never logs it)
- Create: `web/public/creator/*.webp`, `web/public/creator/one-week.mp4`
- Modify: `web/lib/creator-assets.ts` (flip `ready: true` for each file that exists)
- Modify: `prompt.md` (append a "Creator pivot — fal.ai" section with each prompt, model and seed)

- [ ] **Step 1: Resolve the model IDs.** Image: query `https://fal.ai/api/models?keywords=gpt-image-2.5`. Use the GPT Image 2.5 endpoint if it is listed, otherwise fall back to `fal-ai/gpt-image-2`, and log which one was used. Video: `bytedance/seedance-2.5/image-to-video`, after confirming its input field names on the model page.
- [ ] **Step 2: Cost gate.** Print the planned calls (21 images + one 8s 720p clip) with the fal-listed unit prices. If the total is over US$15, stop and report instead of generating.
- [ ] **Step 3: Generate the stills** with one shared style suffix: "realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks". The subject anchor for Mira is "a fictional American woman in her late 20s, shoulder-length wavy dark-brown hair, light olive skin, small gold hoop earrings, linen shirt". Reuse the portrait as a reference image for the vlog shots that show her (Lisbon, café, van, mountain), so she stays consistent. Fans: six diverse fictional adults, head and shoulders, neutral warm backdrop. Community covers carry no people's faces in focus.
- [ ] **Step 4: Generate the clip.** Seedance image-to-video from `vlog-lisbon`, 8s, 720p, slow handheld walk through a Lisbon street at golden hour, muted. Save it as MP4 and set the poster to `vlog-lisbon`.
- [ ] **Step 5:** Convert stills to WebP with `sharp`, which is installed through Next. Stills must be ≤ 250 KB at the sizes in `creator-assets.ts`. The clip must be ≤ 4 MB (re-encode with ffmpeg if present, otherwise keep it as is and report the size).
- [ ] **Step 6:** Flip `ready` flags, append the prompts to `prompt.md`, and view 4 of the images with the Read tool to check they are on-brief: no text, no warped hands in focus, and the same Mira across shots.

### Task 5: Landing hero + "One week with Mira" story (prototype) — **opus · high** · after Task 1

**Files:**
- Modify: `web/components/landing/hero.tsx`, `hero.module.css`, `hero-intro.tsx` (keep the intro script mechanism; retarget its selectors)
- Delete: `web/components/landing/hero-field.tsx`, `loop-scene.tsx`, `loop-frames.ts`, `loop-featured.tsx`, `web/hooks/use-scroll-scene.ts` (only if nothing else imports it), the 120-frame loop assets wherever `loop-data.ts` points
- Rewrite: `web/components/landing/loop-section.tsx`, `loop-data.ts`, `loop-static.tsx`, `loop.module.css`, renamed in place to the story: "One week with Mira"
- Modify: `web/app/(public)/page.tsx` (new section order from spec §5; temporarily keep the existing components for sections 2, 4–9, which Task 7 restyles)

**Interfaces — Consumes:** `GlassPanel`, `CreatorImage`, `CREATOR_CLIP`, tokens (Task 1).

- [ ] **Step 1:** Read spec §5 and the current hero and loop files. Find every import of the files to be deleted (`rg -n "hero-field|loop-scene|loop-frames|loop-featured|use-scroll-scene" web`).
- [ ] **Step 2: Hero.**
  - Text: eyebrow chip, serif H1 "Your fans have great ideas. Finally, a way to hear them." (italic accent on "hear them"), the sub line from spec §5, and three CTAs (coral Get started, glass Enter as creator, glass Enter as fan, using the existing `DemoButton`).
  - Right side: `CreatorImage name="mira-portrait"` in a 28px glass frame with three floating glass chips. Chip 1 is a DM ("Priya · Solo Travelers: 'Made a Lisbon guide on $60/day 🇵🇹'"). Chip 2 is "❤ Loved by Mira". Chip 3 is "Featured in this week's vlog · 2.4K clicks".
  - The chips enter with a staggered `motion` spring and drift gently on pointer move (disabled under reduced motion).
  - Mobile: the photo stacks above the text.
- [ ] **Step 3: Story section.**
  - Pinned for about 300vh. The backdrop is `CREATOR_CLIP`: a muted, `playsInline` loop with `preload="metadata"` that pauses when off-screen via IntersectionObserver. If the clip is not ready, it crossfades the 5 vlog stills instead.
  - One frosted card per step, driven by scroll progress (motion `useScroll` + `useTransform`): Followers → Communities → Idea → Crew → Featured, using the copy from spec §5. A right-side step rail uses glass chips and a coral dot, not lime.
  - The Featured card shows credits for 4 fans with roles and a click count.
  - Reduced motion and no-JS get `loop-static.tsx`: the 5 cards stacked with stills.
- [ ] **Step 4: Verify.** Run web typecheck and biome. Start web on :3006 against the local API (Task 8 Step 1 shows how; if no local API is running, the landing still renders because it uses static data). Take Playwright screenshots at 1440x900 and 390x844 of `/` at scroll 0 and at each story step, saved to `.playwright-mcp/pivot/landing-*.png`. View them and compare against spec §4/§5. Confirm there is no sphere canvas, no clay, and no lime.

### Task 6: App shell (icon rail) + Today decision cards (prototype) — **opus · high** · after Task 1

**Files:**
- Rewrite: `web/components/layout/app-shell.tsx`, `sidebar.tsx` (becomes the 72px icon rail), `header.tsx` (thin glass top bar), `bottom-nav.tsx` (mobile), `dashboard-nav.ts` (labels/routes: Today, Fan ideas, Communities, Challenges, Fans, Spotlight, Settings; Challenges → `/dashboard/challenges`)
- Rewrite: `web/components/dashboard/today/today-view.tsx`; Create: `web/components/dashboard/today/decision-stack.tsx`, `decision-card.tsx`, `pulse-panel.tsx`, `fans-to-thank.tsx`, `decision-items.ts`
- Modify: `web/components/dashboard/today/today-container.tsx` (data wiring only)
- Modify: `web/lib/routes.ts` (add `dashboard.challenges()`, `dashboard.challenge(id)`)
- Test: `web/components/dashboard/today/decision-items.check.mjs`

**Interfaces — Consumes:** Task 1 primitives. Existing queries: briefing (`/api/studio/briefing`), overview (`/api/studio/overview`), inbox, ideas, people (rising).
**Produces:**
```ts
// decision-items.ts (pure)
export type DecisionKind = 'pitch' | 'post' | 'fan';
export interface DecisionItem { id: string; kind: DecisionKind; refId: string; name: string; avatarUrl: string | null;
  context: string /* community or pitch type label */; quote: string; reason: string | null; score: number | null; href: string; }
export function buildDecisionItems(input: { briefing: BriefingHighlight[]; pitches: InboxRow[]; posts: IdeaRow[]; limit?: number }): DecisionItem[];
// briefing first, then pitches by score desc, then posts by signals; dedupe by refId; default limit 5
export function estimateMinutes(count: number): number; // Math.max(1, Math.round(count * 1.2))
```
Action callbacks on `DecisionCard`: `onFeature`, `onReply`, `onLove`, `onLater`. Until Run 2 ships the endpoints:
- Feature links to `routes.dashboard.promote(postId)`.
- Reply opens the existing inbox detail.
- Love and Later are client-only state, with `// wired in Task 10` markers. Task 10 replaces these with real mutations.

- [ ] **Step 1: Write the failing check** `decision-items.check.mjs`. Port the pure logic into `decision-items-core.mjs`, imported by the TS module, the same as Task 1:
```js
import assert from 'node:assert/strict';
import { buildDecisionItems, estimateMinutes } from './decision-items-core.mjs';
const briefing = [{ refType: 'post', refId: 'p1', title: 'Lisbon on $60 a day', reason: 'Matches budget-honest travel', authorName: 'Ana', communityName: 'Budget Travel', score: 91 }];
const pitches = [{ id: 'i1', senderName: 'Leo', summary: 'Brand deal: luggage', score: 88, pitchType: 'brand_deal' },
                 { id: 'i2', senderName: 'Kim', summary: 'Press: podcast', score: 95, pitchType: 'press' }];
const posts = [{ id: 'p1', title: 'Lisbon on $60 a day', authorName: 'Ana', signals: 40, communityName: 'Budget Travel' },
               { id: 'p2', title: 'Tokyo cafés map', authorName: 'Jo', signals: 12, communityName: 'Food Finds' }];
const items = buildDecisionItems({ briefing, pitches, posts });
assert.equal(items[0].refId, 'p1');                    // briefing first
assert.deepEqual(items.map(i => i.refId), ['p1', 'i2', 'i1', 'p2']); // pitches by score, post dedupe
assert.equal(buildDecisionItems({ briefing, pitches, posts, limit: 2 }).length, 2);
assert.equal(buildDecisionItems({ briefing: [], pitches: [], posts: [] }).length, 0);
assert.equal(estimateMinutes(5), 6);
assert.equal(estimateMinutes(0), 1);
console.log('decision-items ok');
```
Adjust the field names to the real `BriefingHighlight`/inbox/idea row types in `shared/src/types.ts`, keeping the same assertions. Run it. It should FAIL.
- [ ] **Step 2:** Implement `decision-items-core.mjs` + `decision-items.ts`. Run the check. It should PASS.
- [ ] **Step 3: Shell.**
  - The rail is fixed left at 72px with `glass-strong` icon buttons (44px) and tooltips (existing `components/ui/tooltip.tsx`). The active item is a glass chip with a coral 3px dot. Help and avatar sit at the bottom.
  - The top bar shows the serif page title, search, `NotificationBell` and a "View as fan" link.
  - No outer pewter frame; content floats on the aurora with a 24px gutter.
  - Below 768px the rail hides and `bottom-nav` shows 5 items.
  - Esc closes panels, and a skip link is kept.
- [ ] **Step 4: Today.**
  - Header: "Good morning, Mira" (serif) and "{n} things need you · about {m} min".
  - `DecisionStack` shows one `DecisionCard` (glass-strong, 28px), with the next card peeking 12px below at 96% scale. Each card has: avatar, name + context, quote, "Why: …" line, `MatchLabel`, and the actions Feature / Reply in my voice / ❤ Love / Later.
  - Motion: `AnimatePresence`, card exits left on Later and right on Feature.
  - Keyboard: ←/→ move, `L` love, `R` reply. A roving tabindex means only the top card is focusable, and an `aria-live` region announces "Card 2 of 5".
  - The empty state reads "You're all caught up" plus a link to Fan ideas.
  - Right column: `PulsePanel` (one sentence built from overview: "Budget Travel had its busiest week: 41 new ideas"), `FansToThank` (rising fans from people, each with a Spotlight button linking to `/dashboard/people?spotlight=<membershipId>`), and community tiles.
- [ ] **Step 5: Verify.** Run typecheck and biome. Start the API on :4100 against the local DB and web on :3006:
```bash
cd api && PORT=4100 DATABASE_URL=postgres://fellow:fellow@localhost:5432/fellow_owners WEB_ORIGIN=http://localhost:3006 BETTER_AUTH_URL=http://localhost:3006 TRUSTED_ORIGINS=http://localhost:3006 pnpm dev
cd web && API_URL=http://localhost:4100 NEXT_PUBLIC_APP_URL=http://localhost:3006 pnpm exec next dev -p 3006
```
Sign in as the demo creator (`POST /api/demo/session {"as":"creator"}` from the page). Screenshot `/dashboard` at 1440 and 390 into `.playwright-mcp/pivot/today-*.png`. Also screenshot it with backdrop-filter disabled (`page.addStyleTag({content:'*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}'})`) to check the fallback is readable. Keyboard check in the same Playwright run: focus the stack, press ArrowRight, and assert the live region reads "Card 2 of 5" and `document.activeElement` is inside the visible top card. Then press `L` and assert the Love button shows `aria-pressed="true"`. View all of them.

### Run 1 exit gate (orchestrator, not an agent)

Show the user the screenshots from Tasks 5 and 6, plus four of the Task 4 images if they exist. Proceed to Run 2 only after the user signs off. Apply any requested changes to the tokens or primitives first, because every Run 2 task builds on them.

---

# RUN 2: Fan-out (12 implementers + 4 gates)

All Run 2 implementers start together. File ownership is exclusive: an agent must not edit files owned by another task. If a change is needed in a file it doesn't own, it writes the needed change into its final report and does not make it.

Backend contracts that the frontend tasks code against are fixed here.

| Endpoint | Owner | Request | Response |
|---|---|---|---|
| `POST /api/studio/inbox/:id/suggest-reply` | T8 | — | `{ reply: string }` (429 when the daily cap is hit) |
| `POST /api/studio/posts/:id/love` | T8 | — | `{ lovedAt: string }` |
| `DELETE /api/studio/posts/:id/love` | T8 | — | `{ lovedAt: null }` |
| `POST /api/studio/people/:membershipId/spotlight/draft` | T8 | — | `{ note: string }` |
| `PUT /api/studio/people/:membershipId/spotlight` | T8 | `{ note }` | `FanSpotlight` |
| `DELETE /api/studio/people/:membershipId/spotlight` | T8 | — | 204 |
| `GET /api/studio/challenges` | T9 | — | `{ items: ChallengeSummary[] }` |
| `POST /api/studio/challenges` | T9 | `createChallengeSchema` | `ChallengeSummary` (201) |
| `GET /api/studio/challenges/:id` | T9 | — | `ChallengeSummary & { entries: IdeaRow[] }` |
| `POST /api/studio/challenges/:id/close` | T9 | — | `ChallengeSummary` (builds the shortlist) |
| `POST /api/studio/challenges/:id/winner` | T9 | `{ postId }` | `ChallengeSummary` |
| `GET /api/spaces/:handle/challenges` | T9 | — | `{ items: ChallengeSummary[] }` (open + recently closed; the shortlist is visible only after close) |
| `POST /api/spaces/:handle/challenges/:id/entries` | T9 | `challengeEntrySchema` | post detail (201); 409 if closed or past due; 403 if not a member of the challenge's community |
| public space page | T8 | — | adds `spotlights: FanSpotlight[]` (latest 6) |
| public showcase | T8 | — | adds `credits: PostCredit[]` |
| post card/detail | T8 | — | adds `lovedAt` |

### Task 7: Landing sections 2, 4–9 + marketing chrome — **sonnet · high**

**Owns:** `web/components/landing/**` except the files Task 5 owns, plus `web/components/layout/navbar.tsx`, `footer.tsx`, `web/components/marketing/page-frame.tsx`, and `web/app/(public)/page.tsx` (final order).

- [ ] Rewrite the data and copy (`problem-data.ts`, `creators-data.ts`, `fans-data.ts`, `how-data.ts`, `demo-data.ts`) for the travel world, using the spec §9 vocabulary.
- [ ] Restyle each section on the tokens and glass primitives. Delete `features-grid.tsx`, `features-data.ts`, `features-motion.tsx` and `features.module.css`.
- [ ] Add a new `connect-section.tsx` ("New ways to connect") with six glass tiles for F1–F6, each with a tiny live UI snippet (for example the ❤ Loved badge, a challenge card with a countdown, the "Draft in my voice" button with typing dots).
- [ ] Add a new `trust-section.tsx` ("You stay in charge"): three statements with icons.
- [ ] `showcase-strip.tsx` / `showcase-visuals.tsx`: travel projects (Lisbon on $60 a day, Tokyo cafés under $5, Solo-safe night markets map, Pacific Coast van-life route, Film photo zine, Slow mornings playbook) using `CreatorImage` covers.
- [ ] Navbar: glass pill, links For creators / For fans / How it works / FAQ, coral Get started. No lime active state; use the coral dot instead.
- [ ] `rg -i "builders|gym|kapoor|ship|triage|fit score|pipeline|investor" web/components/landing web/components/layout/navbar.tsx web/components/layout/footer.tsx` returns nothing.
- [ ] Verify with typecheck, biome, and screenshots at 1440 and 390 of every section into `.playwright-mcp/pivot/landing-sections-*.png`. View them.

### Task 8: Backend — Reply in my voice, Loved, Spotlight, Made-it credits — **opus · high** · test DB `fellow_owners_test_b2`

**Owns:** `api/src/routes/studio.routes.ts`, `api/src/controllers/studio.controller.ts`, `api/src/controllers/public.controller.ts`, `api/src/services/{pitches,posts,memberships,promotions,spaces,discovery}.service.ts`, `api/src/repositories/{posts,memberships,promotions,teams,spaces}.repo.ts`, `api/src/lib/present.ts`, `api/src/ai/tasks/suggest-reply.ts`, new `api/src/ai/tasks/spotlight-note.ts`, `api/tests/integration/{fan-love,suggest-reply,spotlight,showcase-credits}.test.ts`. **Must not touch** `container.ts` or `routes/index.ts`. If wiring needs them, use the existing `container.services` and `container.ai` that the studio controller already receives.

- [ ] **Step 1: Failing tests.** Create `api/tests/integration/fan-love.test.ts`:
```ts
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import type { CommunityRow } from '../../src/db/schema/communities.js';
import type { PostRow } from '../../src/db/schema/posts.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
let mira: TestSpace; let owner: SignedIn; let fan: SignedIn; let community: CommunityRow; let post: PostRow;

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@love.test', 'Mira Lane');
  mira = await factories.space({ handle: 'mira', owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' } });
  community = mira.communities[0] as CommunityRow;
  fan = await signInWithOtp(app, 'priya@love.test', 'Priya Shah');
  const { membership } = await factories.member(mira.space.id, { user: { id: fan.userId, email: 'priya@love.test', name: 'Priya Shah' }, communityIds: [community.id] });
  post = await factories.post(mira.space.id, community.id, membership.id, { title: 'Lisbon on $60 a day' });
});
afterAll(async () => { await container.background.whenIdle(); await closeDb(); });

describe('POST/DELETE /api/studio/posts/:id/love', () => {
  it('owner loves a post, fan is notified, post shows lovedAt', async () => {
    const res = await request(app).post(`/api/studio/posts/${post.id}/love`).set('Cookie', owner.cookie).expect(200);
    expect(res.body.lovedAt).toEqual(expect.any(String));
    const detail = await request(app).get(`/api/posts/${post.id}`).set('Cookie', fan.cookie).expect(200);
    expect(detail.body.lovedAt).toEqual(res.body.lovedAt);
    await container.background.whenIdle();
    const notes = await request(app).get('/api/notifications').set('Cookie', fan.cookie).expect(200);
    expect(notes.body.items.some((n: { kind: string }) => n.kind === 'post_loved')).toBe(true);
  });
  it('loving twice is idempotent and sends one notification', async () => {
    await request(app).post(`/api/studio/posts/${post.id}/love`).set('Cookie', owner.cookie).expect(200);
    await container.background.whenIdle();
    const notes = await request(app).get('/api/notifications').set('Cookie', fan.cookie).expect(200);
    expect(notes.body.items.filter((n: { kind: string }) => n.kind === 'post_loved')).toHaveLength(1);
  });
  it('unlove clears lovedAt', async () => {
    const res = await request(app).delete(`/api/studio/posts/${post.id}/love`).set('Cookie', owner.cookie).expect(200);
    expect(res.body.lovedAt).toBeNull();
  });
  it('a fan cannot love (not owner)', async () => {
    await request(app).post(`/api/studio/posts/${post.id}/love`).set('Cookie', fan.cookie).expect(404);
  });
  it('404 for a post in another space', async () => {
    const other = await factories.space({ handle: 'other' });
    const otherPost = await factories.post(other.space.id, other.communities[0]!.id, null, { title: 'Elsewhere' });
    await request(app).post(`/api/studio/posts/${otherPost.id}/love`).set('Cookie', owner.cookie).expect(404);
  });
});
```
Write `suggest-reply.test.ts` with these cases: owner gets `{ reply }` (fake AI provider) whose length is ≤ `REPLY_TARGET_CHARS` and has no contact details; non-owner gets 404; after the daily cap is reached, 429. Find the cap in `limits.service`/`DAILY_CAPS`, add a `suggestReply` key if there isn't one, and use `DAILY_CAPS.suggestReply` in the test.

Write `spotlight.test.ts` with these cases: draft returns `{ note }` ≤ 280 characters; PUT stores it and returns `FanSpotlight`; the public space page `GET /api/spaces/mira` (check the real public route in `public.routes.ts`) includes it in `spotlights` (latest first, max 6); a 281-character note gives 422; DELETE removes it from the public page; and the `spotlighted` notification reaches the fan.

Write `showcase-credits.test.ts`: publishing a promotion for a project with 2 accepted team members notifies the author and both members (`project_featured`). Requested or declined members are not notified. The public showcase returns `credits` with the author first (role "Started it"), then the accepted members with their roles.

Run them against `fellow_owners_test_b2`. They should FAIL.
- [ ] **Step 2: Love.** Add a repo method `posts.setLoved(spaceId, postId, loved: boolean) → { lovedAt: Date | null, changed: boolean }`, which uses `update … where space_id = $1 and id = $2 and (loved_at is null) = $loved returning`. In the service, notify `post_loved` only when `changed && loved`, and skip it if the author is the owner. Expose `lovedAt` in `present.ts` for the post card and detail.
- [ ] **Step 3: Suggest reply.** Wire the existing `ai/tasks/suggest-reply.ts`. Remove its "Not wired to a route yet" line. Add the route and controller, and use the limits service with the new cap key.
- [ ] **Step 4: Spotlight.**
  - `ai/tasks/spotlight-note.ts` (fast tier): a ≤ 280-character shout-out in the creator's voice, built from the fan's name, intro, communities and top post, with no contact details. Follow `suggest-reply.ts`, including the fake provider output.
  - Repo `memberships.setSpotlight` and `clearSpotlight`, `listSpotlights(spaceId, limit 6)`.
  - Add `spotlights` to the public space page.
  - Notify `spotlighted`.
- [ ] **Step 5: Made it.** In `promotions.service.ts` `publish()`, after the existing author notify, load the accepted team members (`repos.teams`) and notify each of them `project_featured`, skipping the owner and the author. Add `credits` to the showcase presenter.
- [ ] **Step 6:** Run the four test files. They should PASS. Then run the full API suite on `_b2`, which must be green apart from the pre-existing exceptions.

### Task 9: Backend — Challenges — **opus · high** · test DB `fellow_owners_test_b1`

**Owns:** new `api/src/{routes/challenges.routes.ts, controllers/challenges.controller.ts, services/challenges.service.ts, repositories/asks.repo.ts}`, `api/src/container.ts`, `api/src/routes/index.ts`, `api/src/repositories/index.ts`, new `api/tests/integration/challenges.test.ts`. Mount the creator routes at `/api/studio/challenges`, in a new router (do not edit `studio.routes.ts`), and the fan routes at `/api/spaces/:handle/challenges`.

- [ ] **Step 1: Failing test** `challenges.test.ts`:
```ts
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildContainer } from '../../src/container.js';
import { createApp } from '../../src/create-app.js';
import type { CommunityRow } from '../../src/db/schema/communities.js';
import type { PostRow } from '../../src/db/schema/posts.js';
import { type SignedIn, signInWithOtp } from '../helpers/auth.js';
import { createFactories, type TestSpace } from '../helpers/factories.js';
import { closeDb, resetDatabase } from '../helpers/test-db.js';

const container = buildContainer();
const app = createApp(container);
const factories = createFactories(container);
let mira: TestSpace; let owner: SignedIn; let fan: SignedIn; let outsiderMember: SignedIn;
let foodFinds: CommunityRow; let other: CommunityRow; let unrelatedPost: PostRow; let challengeId: string;
let fanMembershipId: string;

beforeAll(async () => {
  await resetDatabase();
  owner = await signInWithOtp(app, 'mira@challenges.test', 'Mira Lane');
  mira = await factories.space({ handle: 'mira', owner: { id: owner.userId, email: owner.email, name: 'Mira Lane' } });
  [foodFinds, other] = mira.communities as [CommunityRow, CommunityRow];   // factories.space creates >= 2 communities; check and extend if not
  fan = await signInWithOtp(app, 'priya@challenges.test', 'Priya Shah');
  fanMembershipId = (await factories.member(mira.space.id, { user: { id: fan.userId, email: fan.email, name: 'Priya Shah' }, communityIds: [foodFinds.id] })).membership.id;
  outsiderMember = await signInWithOtp(app, 'leo@challenges.test', 'Leo');
  await factories.member(mira.space.id, { user: { id: outsiderMember.userId, email: outsiderMember.email, name: 'Leo' }, communityIds: [other.id] });
  unrelatedPost = await factories.post(mira.space.id, foodFinds.id, fanMembershipId, { title: 'Not an entry' });
});
afterAll(async () => { await container.background.whenIdle(); await closeDb(); });

describe('challenges', () => {
  it('owner creates a challenge; members of that community are notified ask_posted', async () => {
    const due = new Date(Date.now() + 5 * 864e5).toISOString();
    const res = await request(app).post('/api/studio/challenges').set('Cookie', owner.cookie)
      .send({ title: 'Best $10 meal in your city', body: 'Photo + where', communityId: foodFinds.id, dueAt: due }).expect(201);
    expect(res.body).toMatchObject({ title: 'Best $10 meal in your city', status: 'open', entryCount: 0, shortlist: null });
    challengeId = res.body.id;
    await container.background.whenIdle();
    const notes = await request(app).get('/api/notifications').set('Cookie', fan.cookie).expect(200);
    expect(notes.body.items.some((n: { kind: string }) => n.kind === 'ask_posted')).toBe(true);
  });
  it('rejects a past due date with 422', async () => {
    await request(app).post('/api/studio/challenges').set('Cookie', owner.cookie)
      .send({ title: 'Too late', communityId: null, dueAt: new Date(Date.now() - 1000).toISOString() }).expect(422);
  });
  it('a member submits an entry; it is a post linked to the ask', async () => {
    const res = await request(app).post(`/api/spaces/mira/challenges/${challengeId}/entries`).set('Cookie', fan.cookie)
      .send({ title: 'Tacos al pastor, Austin', body: '$8.50 at a truck on East 6th' }).expect(201);
    expect(res.body.challenge).toMatchObject({ id: challengeId, status: 'open' });
  });
  it('a non-member of the challenge community gets 403', async () => {
    await request(app).post(`/api/spaces/mira/challenges/${challengeId}/entries`).set('Cookie', outsiderMember.cookie)
      .send({ title: 'Not in Food Finds', body: 'x' }).expect(403);
  });
  it('close builds a shortlist of at most 3 with reasons; fans on it are notified', async () => {
    for (const [i, title] of ['Pho in Houston', 'Arepas in Miami', 'Dumplings in Queens', 'Banh mi in San Jose'].entries()) {
      const entry = await factories.post(mira.space.id, foodFinds.id, fanMembershipId, { title, askId: challengeId });
      for (let n = 0; n < i; n++) await factories.signal(entry.id, (await factories.member(mira.space.id, { communityIds: [foodFinds.id] })).membership.id, 'use');
    }
    const res = await request(app).post(`/api/studio/challenges/${challengeId}/close`).set('Cookie', owner.cookie).expect(200);
    expect(res.body.status).toBe('closed');
    expect(res.body.shortlist.length).toBeLessThanOrEqual(3);
    for (const s of res.body.shortlist) expect(s.reason.length).toBeGreaterThan(0);
  });
  it('entries after close are rejected with 409', async () => {
    await request(app).post(`/api/spaces/mira/challenges/${challengeId}/entries`).set('Cookie', fan.cookie)
      .send({ title: 'Late entry', body: 'x' }).expect(409);
  });
  it('winner must be an entry of this challenge', async () => {
    await request(app).post(`/api/studio/challenges/${challengeId}/winner`).set('Cookie', owner.cookie)
      .send({ postId: unrelatedPost.id }).expect(422);
  });
  it('fans see open + closed challenges; shortlist only after close', async () => {
    const res = await request(app).get('/api/spaces/mira/challenges').set('Cookie', fan.cookie).expect(200);
    expect(res.body.items[0]).toHaveProperty('shortlist');
  });
});
```
If the factories lack `askId` or signal helpers, extend `tests/helpers/factories.ts`. Task 9 owns that change; Task 8 must not edit factories. Run the test. It should FAIL.
- [ ] **Step 2: `asks.repo.ts`:** `create`, `list(spaceId)`, `get(spaceId, id)`, `countEntries`, `close(id, summary)`, `setWinner`.
- [ ] **Step 3: `challenges.service.ts`:**
  - Validate a future `dueAt`.
  - Entries: check membership of the challenge's community (or any community when `communityId` is null). Create a post with `type: 'idea'` and `askId` through the existing posts service/repo, so triage and embedding run as normal. Reject with 409 when `status = 'closed'` or `dueAt < now`.
  - `close`: rank entries by `(triage score ?? 0) * 0.7 + normalised signals * 0.3`. The reason is the entry's stored AI reason, falling back to "{n} fans said they'd use this". Take the top 3, store them in `response_summary`, and notify `challenge_shortlisted` to each shortlisted author.
  - Notify `ask_posted` to the members of the target community on create. Batch through the existing notifications service and background queue, the same as `idea_posted`.
- [ ] **Step 4:** Add `challenge` to the post presenter output when `askId` is set. Coordinate by report: `present.ts` is owned by Task 8, so add the field in a challenges-local mapper and attach it in the entries endpoint response only. Task 8 adds `challenge` to the general post presenters from the contract table above.
- [ ] **Step 5:** Run the tests. They should PASS. Then run the full API suite on `_b1`.

### Task 10: Dashboard — Fan ideas (inbox), What fans want, Reply in my voice UI, Today wiring — **sonnet · high**

**Owns:** `web/components/dashboard/inbox/**`, `web/app/(dashboard)/dashboard/inbox/**`, `web/components/dashboard/today/**` (after Task 6; only to replace the `// wired in Task 10` markers), `web/lib/fixtures/question-groups.json`.

- [ ] Inbox → **Fan ideas**:
  - The default view is a card list (face, name, type label, quote, reason, `MatchLabel`), with a "Table" toggle that keeps the existing `inbox-table.tsx`.
  - Tabs: All, Collabs, Brand deals, Ideas, Press, Fan notes, Filtered ("Kept out").
  - CSV export moves into a `…` menu (existing `components/ui/menu.tsx`).
- [ ] `reply-box.tsx`: a "Draft in my voice" button calls `POST /api/studio/inbox/:id/suggest-reply`, streams the result into the textarea (showing typing dots while pending), and stays editable. On 429 it shows "You've used today's drafts. They refresh tomorrow."
- [ ] Questions → **"What fans want"**:
  - Rewrite `question-groups.json` to travel requests ("212 fans want a Japan budget guide", "140 asked for your packing list", …).
  - Each group gets a "Make it" button that opens the Spotlight composer route with the title prefilled (`?title=`).
  - `ponytail:` comment: still fixture-backed for the demo space; an API arrives with Answer Once.
- [ ] Today wiring: Love → `POST/DELETE /api/studio/posts/:id/love` (optimistic, with rollback on error); Reply → an inline reply sheet using the same draft button; Later → session-local skip.
- [ ] Verify with typecheck, biome, and screenshots of the inbox (cards and table), a pitch panel with a draft, and what-fans-want at 1440 and 390.

### Task 11: Dashboard — Ideas, Fans (people + followers), Communities, Settings — **sonnet · medium**

**Owns:** `web/components/dashboard/{ideas,people,followers,communities,settings}/**`, `web/components/dashboard/export-csv-link.tsx`, and the matching `web/app/(dashboard)/dashboard/{ideas,people,communities,settings}/**`.

- [ ] Ideas: a card grid with cover tint, ❤ Loved badge, signals ("41 would use this · 6 count me in") and status label. The fit number appears only in `post-panel.tsx`.
- [ ] People → **Fans**:
  - Card list by default, table toggle, "Rising" strip.
  - A Spotlight button opens a side panel that calls the spotlight draft endpoint, lets Mira edit the note (≤ 280 characters with a counter), and saves with PUT. Opening via `?spotlight=<membershipId>` auto-opens the panel.
  - Followers move under a "Followers" tab; CSV goes to the overflow menu.
- [ ] Communities: photo-cover cards (`CreatorImage cover-<slug>` when the slug matches a cover, else a tint), plus the detail view on the new tokens.
- [ ] Settings: taste-profile form labels become "What you love" / "Never for me" / "Your voice".
- [ ] Verify with typecheck, biome, and screenshots of each screen at 1440.

### Task 12: Dashboard — Spotlight (promote) + Challenges UI — **sonnet · high**

**Owns:** `web/components/dashboard/promote/**`, `web/app/(dashboard)/dashboard/promote/**`, new `web/components/dashboard/challenges/**`, new `web/app/(dashboard)/dashboard/challenges/**` (delete `dashboard/asks/` and redirect `/dashboard/asks` → `/dashboard/challenges` in `web/next.config.ts` redirects, a file this task owns for that one entry).

- [ ] Promote → **Spotlight**:
  - Composer copy: "Give it your spotlight".
  - The preview panel shows the "Made by" credits block.
  - The promotions list is a card list with a click-count sentence ("2.4K people opened it").
  - Accept a `?title=` prefill (from What fans want) as the draft topic.
- [ ] **Challenges** list: open (with countdown) and closed; a "New challenge" coral button opens a sheet (title, prompt, community select or "All communities", due date via `<input type="datetime-local">`).
- [ ] Challenge detail:
  - entries as cards with `MatchLabel`;
  - a "Close and shortlist" button;
  - the shortlist with reasons;
  - "Pick winner", then a prompt linking to Spotlight for the winning post.
- [ ] Verify with typecheck, biome, and screenshots.

### Task 13: Fan side — bio page, community, post, join, pitch, my space — **sonnet · high**

**Owns:** `web/components/{bio,community,post,join,pitch,me,showcase,notifications}/**`, `web/components/layout/{fan-shell,fan-topbar,split-shell}.tsx`, and `web/app/(public)/[handle]/**`, `web/app/(dashboard)/[handle]/**`.

- [ ] Bio page:
  - A cover photo (`vlog-van-coast`) with a frosted profile card (portrait, name, bio, platform chips YouTube/Instagram/TikTok).
  - Communities as photo-cover cards.
  - "Fans of the week" wall (`spotlights`, hidden when empty).
  - "Made by Mira's fans" (featured).
  - A coral "Send Mira an idea" button.
  - It works at 360px with 44px targets inside in-app browsers.
- [ ] Community page: cover header, an open challenge card pinned at the top (from `GET /api/spaces/:handle/challenges`) with "Enter the challenge", which opens the entry form (the post form with the challenge title shown), and a feed of glass post cards with "❤ Loved by Mira".
- [ ] Post page: Loved badge, team roles called "Open spots", signal labels from shared.
- [ ] Showcase page (`/[handle]/s/[slug]`): a "Made by" credits block.
- [ ] Join and pitch: copy changes (pitch → "Send Mira an idea"; the type select shows "Brand deal").
- [ ] My space: add a "Your moments" list from notifications (loved, featured, spotlighted, challenge shortlisted), each with an icon and a link.
- [ ] Notification popover: strings for the new kinds.
- [ ] Update the OG image components (`bio/og-image.tsx`, `opengraph-image.tsx` files) to the new palette and serif.
- [ ] Verify with typecheck, biome, and screenshots at 390 and 1440 of `/mira`, `/mira/c/food-finds`, a post, a showcase, and `/mira/me` (as the demo fan).

### Task 14: Auth + onboarding — **sonnet · medium**

**Owns:** `web/components/{auth,onboarding}/**`, `web/app/(auth)/**`, `web/app/(dashboard)/onboarding/**`, `web/public/auth/`, `web/public/onboarding/`.

- [ ] Replace the clay art with `CreatorImage` (`auth-art`, and the vlog stills for the onboarding steps). Delete the clay webp files once nothing references them.
- [ ] Split-shell look: a glass form panel over the photo, on the aurora.
- [ ] Onboarding templates: presets for lifestyle/travel (default), food, fitness, music and beauty, each with 5–6 community suggestions using lucide icons. Remove the developer presets.
- [ ] Copy: "taste profile" → "What you love". The handle-step example becomes `fellowowners.app/yourname`.
- [ ] Verify with typecheck, biome, and screenshots of login, create-account, verify-otp, and each onboarding step.

### Task 15: Rest of site + web fixtures + legacy token cleanup — **haiku · medium** (reviewed by Task 17)

**Owns:** `web/app/(legal)/**`, `web/components/legal/**`, `web/app/(public)/{about,blog,contact,pricing}/**`, `web/app/{not-found,error,global-error}.tsx`, `web/app/(dev)/kit/**`, `web/lib/{blog,seo,legal,constants}.ts`, `web/lib/fixtures/*.json` except `question-groups.json`, and the `/* legacy */` block in `globals.css` (delete only when `rg` shows no users).

- [ ] Apply the new tokens and glass panels. Rewrite copy and examples to the travel world and spec §9 vocabulary. Blog post examples become creator/community topics.
- [ ] `web/lib/fixtures/*.json`: rename to the travel world, consistent with Task 3 (Mira Lane, the community slugs, Priya Shah). Keep every key and shape unchanged.
- [ ] Remove the legacy tokens only when `rg -n "<token>" web` is empty for each one.
- [ ] Run `rg -i "builders|gym-log|kapoor|frontend dev|backend dev|investor|investment|ship" web/app web/lib web/components`. List the remaining hits in your report and do not touch files owned by other tasks.
- [ ] Verify with typecheck, biome, and screenshots of `/about`, `/pricing`, `/terms`, and the 404 page.

### Task 16: Copy + data sweep (read-only gate) — **haiku · low**

After Tasks 7–15, run the spec §13 grep across `web/app web/components web/lib api/src/db/seed api/src/ai/fake.ts`. Report every hit with its file:line and the owning task. Edit nothing.

### Task 17: Code review gate — **opus · high** (a different model from most implementers)

Review the whole diff against the spec and this plan, across correctness, security (the new endpoints: owner checks, membership checks, IDOR on postId/membershipId/challengeId, input limits), a11y, and whether the copy meets the vocabulary rules. Re-review Task 15's haiku output for accuracy. Output findings ranked by severity, and fix nothing. The orchestrator routes each fix to the owning task's agent (resumed) or a fresh sonnet fixer.

### Task 18: QA + visual gate — **sonnet · medium** · test DB `fellow_owners_test_qa`

- [ ] Root `pnpm typecheck`, `pnpm lint`, and API unit + integration suites on `_qa`. Report pass/fail with output; known pre-existing failures are allowed.
- [ ] Run the web check scripts (`node web/components/shared/match-label.check.mjs`, `node web/components/dashboard/today/decision-items.check.mjs`, `node web/lib/format.check.mjs`).
- [ ] Re-seed the local dev DB. Start API :4100 + web :3006 (Task 6 Step 5 commands).
- [ ] E2E click-through as the demo creator:
  - Today: love a card, draft a reply.
  - Create a challenge.
  - Spotlight a fan.
  - Publish a spotlight for "Lisbon on $60 a day".
- [ ] E2E click-through as the demo fan:
  - See the loved badge.
  - Enter the open challenge.
  - See "Your moments" and the spotlight wall on `/mira`.
- [ ] Screenshots at 1440 and 390 of every route in spec §13 into `.playwright-mcp/pivot/qa-*.png`. View them and confirm: no lime, no purple button, no pewter frame, no sphere/clay assets, serif display present, AA spot-check with `web/scripts/contrast-check.mjs`.
- [ ] Re-seed the local DB after QA (mutations).

---

## Agent allocation (shown to the user before each run)

| # | Task | Model | Effort | Test DB |
|---|---|---|---|---|
| 1 | Design system | opus | high | — |
| 2 | Shared + migration | opus | high | fellow_owners_test |
| 3 | Seed travel world | sonnet | high | fellow_owners_test_b3 |
| 4 | fal.ai imagery | sonnet | medium | — |
| 5 | Landing hero + story | opus | high | — |
| 6 | Shell + Today | opus | high | — |
| 7 | Landing sections | sonnet | high | — |
| 8 | API: voice/love/spotlight/credits | opus | high | fellow_owners_test_b2 |
| 9 | API: challenges | opus | high | fellow_owners_test_b1 |
| 10 | Fan ideas + Today wiring | sonnet | high | — |
| 11 | Ideas/Fans/Communities/Settings | sonnet | medium | — |
| 12 | Spotlight + Challenges UI | sonnet | high | — |
| 13 | Fan side | sonnet | high | — |
| 14 | Auth + onboarding | sonnet | medium | — |
| 15 | Rest of site + fixtures | haiku | medium | — |
| 16 | Copy sweep | haiku | low | — |
| 17 | Code review | opus | high | fellow_owners_test_rev |
| 18 | QA + visual | sonnet | medium | fellow_owners_test_qa |

18 agents: 6 in Run 1, 12 in Run 2 (10 implementers + 2 gates up front), plus the review and QA gates.
