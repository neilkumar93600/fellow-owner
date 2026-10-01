# 07 · File Structure

Status: draft v0.1 for review · Updated: 2026-10-01

## Conventions

- **Root holds five things:** `web/`, `api/`, Docker files, `.github/`, `docs/`. Plus one small `shared/` package (see note 1).
- **Web has no `src/` folder:** `app/`, `components/`, `hooks/`, `api/` and `lib/` sit at the root of `web/`, next to `proxy.ts`. The `@/*` alias points at `web/`.
- **Web routes are grouped by who can see them:** `(public)` anyone, `(auth)` sign-in pages, `(legal)` policies, `(dashboard)` signed-in only. Groups never change the URL.
- **Web components are grouped by reach:** `layout/` (navbar, footer, header, sidebar), `shared/` (used on more than one page), `landing/`, then one folder per page or feature.
- **`hooks/`** holds the project's custom hooks. **`lib/`** holds flat files only: no subfolder for a single file.
- **`web/api/`** holds one typed client file per backend route group. It is the only place the web app calls the backend.
- **`api/`** is layer-based: `routes -> controllers -> services -> repositories -> db`, wired in `container.ts`. AI, auth and background work each have their own folder.
- File names are kebab-case. React components export PascalCase names. Backend files carry their layer as a suffix: `posts.routes.ts`, `posts.controller.ts`, `posts.service.ts`, `posts.repo.ts`.
- `(P1)` / `(P2)` marks files that wait for that priority (see 01-prd).

## Root

```
fellow-owners/
├─ web/                       Next.js 16 app (fan pages + creator dashboard)
├─ api/                       Express 5 backend (all business logic, auth, AI, db)
├─ shared/                    zod schemas, enums, limits used by web and api
├─ docs/                      the build docs + design-reference/
├─ .github/
│  ├─ workflows/
│  │  ├─ ci.yml               install, typecheck, lint, unit + integration tests, build
│  │  └─ e2e.yml              (P1) Playwright judge path against staging
│  ├─ pull_request_template.md
│  └─ dependabot.yml
├─ docker-compose.yml         local stack: postgres (pgvector/pgvector:pg17), api, web
├─ .dockerignore
├─ package.json               workspace scripts: dev, build, test, db:*
├─ pnpm-workspace.yaml        web, api, shared
├─ turbo.json
├─ biome.json                 lint + format for every workspace
├─ .nvmrc                     24
├─ .gitignore
└─ README.md                  setup, env, scripts, deploy
```

## web/

```
web/
├─ app/
│  ├─ layout.tsx                        root: Inter, providers, toaster
│  ├─ providers.tsx                     TanStack Query, theme
│  ├─ globals.css                       Tailwind v4 @theme tokens from 04-ui-ux-brief
│  ├─ not-found.tsx
│  ├─ error.tsx
│  ├─ robots.ts
│  ├─ sitemap.ts
│  │
│  ├─ (public)/                         anyone, signed in or not
│  │  ├─ layout.tsx                     navbar + footer (marketing pages only)
│  │  ├─ page.tsx                       /  landing: Enter as creator / fan, Start your space
│  │  ├─ about/page.tsx                 (P1)
│  │  ├─ contact/page.tsx               (P1)
│  │  ├─ pricing/page.tsx               (P2)
│  │  ├─ blog/page.tsx                  (P2)
│  │  ├─ blog/[slug]/page.tsx           (P2)
│  │  └─ [handle]/                      creator's public pages, own layout (no marketing navbar)
│  │     ├─ layout.tsx                  fan shell: creator top bar
│  │     ├─ page.tsx                    /{handle}  bio link page
│  │     ├─ opengraph-image.tsx
│  │     ├─ join/page.tsx               join stepper, sign-in is step 1 inline
│  │     └─ s/[slug]/
│  │        ├─ page.tsx                 showcase of a promoted project
│  │        └─ opengraph-image.tsx
│  │
│  ├─ (auth)/
│  │  ├─ layout.tsx                     centered card on the grey shell
│  │  ├─ login/page.tsx
│  │  ├─ sign-up/page.tsx
│  │  ├─ verify-otp/page.tsx            6-digit email code
│  │  ├─ forgot-password/page.tsx       only if password sign-in is on (open decision, note 3)
│  │  └─ reset-password/page.tsx        only if password sign-in is on (open decision, note 3)
│  │
│  ├─ (legal)/
│  │  ├─ layout.tsx                     readable prose layout
│  │  ├─ privacy-policy/page.tsx
│  │  ├─ terms/page.tsx
│  │  └─ cookies/page.tsx
│  │
│  └─ (dashboard)/                      signed-in only
│     ├─ layout.tsx                     session gate, redirects to /login?returnTo=
│     ├─ onboarding/page.tsx            create your space (4 steps)
│     ├─ dashboard/                     creator studio, owner only
│     │  ├─ layout.tsx                  creator shell: sidebar + header tray
│     │  ├─ page.tsx                    Today
│     │  ├─ inbox/page.tsx
│     │  ├─ ideas/page.tsx
│     │  ├─ communities/page.tsx
│     │  ├─ communities/[slug]/page.tsx
│     │  ├─ people/page.tsx
│     │  ├─ promote/page.tsx
│     │  ├─ promote/[postId]/page.tsx
│     │  ├─ asks/page.tsx               (P1)
│     │  └─ settings/page.tsx
│     └─ [handle]/                      fan pages that need a membership
│        ├─ layout.tsx                  membership check + fan shell with community pills
│        ├─ c/[slug]/page.tsx           community feed
│        ├─ p/[postId]/page.tsx         post detail
│        ├─ new/page.tsx                new post
│        ├─ pitch/page.tsx              send a pitch
│        └─ me/page.tsx                 my posts, teams, pitches
│
├─ components/
│  ├─ ui/                               shadcn primitives (generated, only re-themed)
│  ├─ magicui/                          number-ticker.tsx, blur-fade.tsx
│  ├─ layout/
│  │  ├─ navbar.tsx                     marketing pages
│  │  ├─ footer.tsx                     marketing + legal links
│  │  ├─ header.tsx                     dashboard: welcome title + icon tray
│  │  ├─ sidebar.tsx                    dashboard nav pills, lime active
│  │  ├─ bottom-nav.tsx                 dashboard on phones
│  │  ├─ fan-topbar.tsx                 creator avatar + community pills
│  │  └─ app-shell.tsx                  grey rounded shell with gradient blur
│  ├─ shared/                           used on more than one page
│  │  ├─ logo.tsx
│  │  ├─ stat-card.tsx
│  │  ├─ chart-card.tsx
│  │  ├─ data-table.tsx
│  │  ├─ pagination.tsx
│  │  ├─ tab-bar.tsx
│  │  ├─ toolbar.tsx
│  │  ├─ count-chips.tsx
│  │  ├─ community-card.tsx             bio page, join, dashboard communities
│  │  ├─ idea-card.tsx                  feed, dashboard ideas, me
│  │  ├─ signal-buttons.tsx
│  │  ├─ fit-pill.tsx
│  │  ├─ ai-chip.tsx
│  │  ├─ status-pill.tsx
│  │  ├─ avatar-initials.tsx
│  │  ├─ side-panel.tsx
│  │  ├─ empty-state.tsx
│  │  ├─ page-heading.tsx
│  │  ├─ copy-button.tsx
│  │  ├─ confirm-dialog.tsx
│  │  └─ theme-toggle.tsx
│  ├─ landing/
│  │  ├─ hero.tsx
│  │  ├─ loop-section.tsx               Followers -> Communities -> Ideas -> Collaboration -> Action
│  │  ├─ how-it-works.tsx
│  │  ├─ features-grid.tsx
│  │  ├─ demo-cta.tsx
│  │  └─ faq.tsx
│  ├─ auth/
│  │  ├─ login-form.tsx
│  │  ├─ sign-up-form.tsx
│  │  ├─ otp-form.tsx
│  │  ├─ google-button.tsx              hidden inside in-app browsers (note 3)
│  │  ├─ forgot-password-form.tsx       only if password sign-in is on
│  │  └─ reset-password-form.tsx        only if password sign-in is on
│  ├─ bio/
│  │  ├─ creator-header.tsx
│  │  ├─ community-grid.tsx
│  │  ├─ pitch-cta.tsx
│  │  └─ featured-projects.tsx
│  ├─ join/
│  │  ├─ join-stepper.tsx
│  │  ├─ intro-step.tsx
│  │  ├─ community-picker.tsx
│  │  └─ profile-step.tsx
│  ├─ community/
│  │  ├─ community-header.tsx
│  │  ├─ feed.tsx
│  │  └─ new-post-fab.tsx
│  ├─ post/
│  │  ├─ post-body.tsx
│  │  ├─ post-form.tsx                  new + edit
│  │  ├─ team-roles.tsx
│  │  ├─ comment-thread.tsx
│  │  └─ comment-form.tsx
│  ├─ pitch/
│  │  ├─ pitch-form.tsx
│  │  └─ pitch-sent.tsx
│  ├─ me/
│  │  ├─ my-posts.tsx
│  │  ├─ my-teams.tsx
│  │  └─ my-pitches.tsx
│  ├─ showcase/
│  │  ├─ showcase-hero.tsx
│  │  └─ showcase-team.tsx
│  ├─ onboarding/
│  │  ├─ onboarding-stepper.tsx
│  │  ├─ handle-step.tsx
│  │  ├─ platforms-step.tsx
│  │  ├─ communities-step.tsx
│  │  └─ taste-step.tsx
│  └─ dashboard/
│     ├─ today/
│     │  ├─ overview-stats.tsx
│     │  ├─ this-week-card.tsx
│     │  ├─ ai-briefing.tsx
│     │  ├─ inbox-mix-chart.tsx
│     │  ├─ top-ideas-table.tsx
│     │  ├─ activity-chart.tsx
│     │  └─ setup-checklist.tsx
│     ├─ inbox/
│     │  ├─ inbox-table.tsx
│     │  ├─ inbox-toolbar.tsx
│     │  ├─ pitch-panel.tsx
│     │  └─ reply-box.tsx
│     ├─ ideas/
│     │  ├─ ideas-grid.tsx
│     │  ├─ ideas-board.tsx
│     │  └─ post-panel.tsx
│     ├─ communities/
│     │  ├─ community-form.tsx
│     │  └─ community-members.tsx
│     ├─ people/
│     │  ├─ rising-strip.tsx
│     │  └─ people-table.tsx
│     ├─ promote/
│     │  ├─ promotions-table.tsx
│     │  ├─ draft-editor.tsx
│     │  ├─ preview-panel.tsx
│     │  └─ publish-bar.tsx
│     └─ settings/
│        ├─ profile-form.tsx
│        ├─ taste-profile-form.tsx
│        └─ bio-link-card.tsx
│
├─ hooks/
│  ├─ use-session.ts                    Better Auth session
│  ├─ use-space.ts                      creator's own space
│  ├─ use-membership.ts                 fan's membership in the current space
│  ├─ use-url-state.ts                  tabs, sort, filters, ?item= in the URL
│  ├─ use-cursor-list.ts                infinite lists on cursor pagination
│  ├─ use-optimistic-toggle.ts          signals, status changes
│  ├─ use-in-app-browser.ts             detects Instagram/TikTok/FB webviews
│  ├─ use-copy.ts
│  ├─ use-debounce.ts
│  ├─ use-media-query.ts
│  └─ queries/                          one TanStack Query hook file per resource
│     ├─ use-space-page.ts
│     ├─ use-feed.ts
│     ├─ use-post.ts
│     ├─ use-pitches.ts
│     ├─ use-overview.ts
│     ├─ use-briefing.ts
│     ├─ use-inbox.ts
│     ├─ use-ideas.ts
│     ├─ use-people.ts
│     ├─ use-communities.ts
│     └─ use-promotions.ts
│
├─ api/                                 typed client, one file per backend route group
│  ├─ demo.ts
│  ├─ spaces.ts
│  ├─ posts.ts
│  ├─ pitches.ts
│  └─ studio.ts                         everything under /api/studio
│
├─ lib/                                 flat files only
│  ├─ utils.ts                          cn() and small helpers
│  ├─ auth-client.ts                    Better Auth React client (emailOTP plugin)
│  ├─ fetcher.ts                        fetch wrapper: base URL, cookie forwarding on server, error mapping
│  ├─ query-client.ts
│  ├─ env.ts                            zod-checked public env
│  ├─ fonts.ts
│  ├─ format.ts                         740K, dates, relative time
│  ├─ routes.ts                         typed path builders
│  ├─ seo.ts                            metadata helpers
│  └─ constants.ts                      nav items, platform list
│
├─ e2e/                                 (P1) Playwright
│  └─ judge-path.spec.ts
├─ public/
│  ├─ logo.svg
│  ├─ favicon.ico
│  └─ demo/mira.jpg
├─ proxy.ts                             Next 16 proxy: cookie check for (dashboard) routes
├─ next.config.ts                       rewrites /api/* and /r/* to API_URL
├─ components.json                      shadcn config
├─ playwright.config.ts                 (P1)
├─ tsconfig.json
├─ Dockerfile                           optional self-host; production runs on Vercel
├─ .env.example
└─ package.json
```

## api/

```
api/
├─ src/
│  ├─ index.ts                          default-exports the app (Vercel entry)
│  ├─ create-app.ts                     helmet, request id, Better Auth handler, json, routes, error handler
│  ├─ local.ts                          app.listen(4000) for local dev
│  ├─ container.ts                      composition root: repos -> services -> controllers; tests swap the AI provider here
│  │
│  ├─ config/
│  │  └─ env.ts                         zod-checked env, fails fast on boot
│  │
│  ├─ auth/
│  │  ├─ index.ts                       betterAuth(): drizzle adapter, emailOTP, Google, sessions, trustedOrigins
│  │  ├─ email.ts                       OTP emails through Resend
│  │  └─ demo.ts                        demo account sign-in
│  │
│  ├─ routes/                           URL -> middleware -> controller, nothing else
│  │  ├─ index.ts                       mounts everything under /api
│  │  ├─ health.routes.ts
│  │  ├─ demo.routes.ts
│  │  ├─ public.routes.ts               space page, showcase, /r/:code
│  │  ├─ spaces.routes.ts               join, suggestions, feeds, new post, pitch, me
│  │  ├─ posts.routes.ts                post, comments, signals, team
│  │  ├─ pitches.routes.ts              withdraw
│  │  ├─ studio.routes.ts               /api/studio/*
│  │  └─ cron.routes.ts                 demo reset, retention purge (CRON_SECRET)
│  │
│  ├─ controllers/                      read req, call one service, shape response
│  │  ├─ demo.controller.ts
│  │  ├─ public.controller.ts
│  │  ├─ spaces.controller.ts
│  │  ├─ posts.controller.ts
│  │  ├─ pitches.controller.ts
│  │  ├─ studio.controller.ts
│  │  └─ cron.controller.ts
│  │
│  ├─ services/                         business rules, authorization, caps
│  │  ├─ access.service.ts              resolve membership; requireMember / requireOwner
│  │  ├─ limits.service.ts              daily caps from shared/limits
│  │  ├─ spaces.service.ts              onboarding, profile, taste profile
│  │  ├─ communities.service.ts
│  │  ├─ memberships.service.ts         join, profile, remove
│  │  ├─ posts.service.ts
│  │  ├─ comments.service.ts
│  │  ├─ signals.service.ts
│  │  ├─ teams.service.ts
│  │  ├─ pitches.service.ts             create, withdraw, status, reply, restore
│  │  ├─ overview.service.ts            Today metrics
│  │  ├─ briefing.service.ts            candidates + cached daily briefing
│  │  ├─ discovery.service.ts           ranked ideas, rising people, search
│  │  ├─ promotions.service.ts          drafts, publish, unpublish
│  │  ├─ clicks.service.ts
│  │  └─ demo.service.ts
│  │
│  ├─ repositories/                     Drizzle queries only, always scoped by space_id
│  │  ├─ spaces.repo.ts
│  │  ├─ communities.repo.ts
│  │  ├─ memberships.repo.ts
│  │  ├─ posts.repo.ts
│  │  ├─ comments.repo.ts
│  │  ├─ signals.repo.ts
│  │  ├─ teams.repo.ts
│  │  ├─ pitches.repo.ts
│  │  ├─ promotions.repo.ts
│  │  ├─ clicks.repo.ts
│  │  ├─ digests.repo.ts
│  │  ├─ ai-runs.repo.ts
│  │  └─ feedback.repo.ts
│  │
│  ├─ ai/
│  │  ├─ provider.ts                    fast, smart and embedding models from env (Vercel AI SDK)
│  │  ├─ run.ts                         every call: budget check, timing, zod validation, ai_runs row
│  │  ├─ guard.ts                       untrusted-text wrapper, score clamping, id checks
│  │  └─ tasks/                         one file per task: prompt + output schema + function
│  │     ├─ triage-item.ts
│  │     ├─ embed-item.ts
│  │     ├─ suggest-communities.ts
│  │     ├─ briefing.ts
│  │     ├─ promote-drafts.ts
│  │     ├─ community-digest.ts         (P1)
│  │     ├─ suggest-reply.ts            (P1)
│  │     ├─ cluster-import.ts           (P1)
│  │     └─ ask-ai.ts                   (P1)
│  │
│  ├─ workers/                          background work, no always-on process
│  │  ├─ schedule.ts                    runInBackground(): waitUntil on Vercel, fire-and-forget locally
│  │  ├─ analyze-item.ts                triage + embed one item, attempts and failure state
│  │  ├─ sweep.ts                       claim pending items (SKIP LOCKED), analyze in batches of 5
│  │  ├─ demo-reset.ts                  cron
│  │  └─ purge.ts                       cron, retention rules from 05
│  │
│  ├─ middlewares/
│  │  ├─ request-id.ts
│  │  ├─ validate.ts                    zod for body, params, query
│  │  ├─ require-session.ts
│  │  ├─ require-member.ts
│  │  ├─ require-owner.ts
│  │  ├─ cron-auth.ts
│  │  ├─ not-found.ts
│  │  └─ error-handler.ts
│  │
│  ├─ db/
│  │  ├─ client.ts                      postgres.js (prepare: false) + drizzle
│  │  ├─ schema/
│  │  │  ├─ index.ts
│  │  │  ├─ enums.ts
│  │  │  ├─ auth.ts                     generated by Better Auth CLI
│  │  │  ├─ spaces.ts
│  │  │  ├─ communities.ts              communities + community_members
│  │  │  ├─ memberships.ts
│  │  │  ├─ posts.ts
│  │  │  ├─ social.ts                   comments, signals, team_members
│  │  │  ├─ inbound.ts
│  │  │  ├─ promotions.ts               promotions + click_events
│  │  │  ├─ ai.ts                       digests, ai_runs, ai_feedback
│  │  │  └─ later.ts                    (P1) asks, notifications, imports
│  │  ├─ migrations/                    generated SQL, committed
│  │  └─ seed/
│  │     ├─ data/                       space, communities, members, posts, comments, pitches, promotions (.json)
│  │     ├─ seed.ts                     pnpm db:seed [--reanalyze]
│  │     ├─ embed.ts                    pnpm db:embed
│  │     └─ generate-content.ts         one-off: writes data/*.json with the LLM
│  │
│  ├─ lib/
│  │  ├─ errors.ts                      AppError
│  │  ├─ logger.ts                      pino with redaction
│  │  ├─ pagination.ts                  cursor encode/decode
│  │  ├─ ranking.ts                     pure scoring functions from 02
│  │  ├─ hash.ts
│  │  ├─ short-code.ts
│  │  ├─ slug.ts
│  │  └─ dates.ts
│  │
│  └─ types/
│     └─ express.d.ts                   req.session, req.membership
│
├─ tests/
│  ├─ unit/                             ranking, limits, guard, short-code
│  ├─ integration/                      Supertest against a real Postgres per route group
│  ├─ fixtures/                         recorded AI responses
│  └─ helpers/                          test-db.ts, factories.ts, auth.ts
├─ drizzle.config.ts
├─ vitest.config.ts
├─ vercel.json                          crons
├─ tsconfig.json
├─ Dockerfile                           optional self-host or Cloud Run
├─ .env.example
└─ package.json
```

## shared/

```
shared/
├─ src/
│  ├─ index.ts
│  ├─ enums.ts                          post types, statuses, pitch types, tints
│  ├─ limits.ts                         every length and daily cap from 05, in one place
│  ├─ reserved-handles.ts
│  ├─ types.ts                          API response shapes
│  └─ schemas/                          zod request schemas
│     ├─ auth.ts
│     ├─ space.ts
│     ├─ community.ts
│     ├─ membership.ts
│     ├─ post.ts
│     ├─ comment.ts
│     ├─ pitch.ts
│     ├─ promotion.ts
│     └─ taste-profile.ts
├─ tsconfig.json
└─ package.json                         @fellow-owners/shared
```

## docs/

```
docs/
├─ README.md                            index, glossary, conflict rule
├─ 01-prd.md
├─ 02-trd.md
├─ 03-app-flow.md
├─ 04-ui-ux-brief.md
├─ 05-backend-schema.md
├─ 06-implementation-plan.md            after 01 to 05 are approved
├─ 07-file-structure.md                 this file
└─ design-reference/                    9 reference screens
```

## Notes

1. **Why `shared/` exists.** Every length limit, daily cap and request shape is validated in the browser and again in the API. Keeping the zod schemas in one package means a rule changes in one place. Without it, `web` and `api` would carry copies that drift.
2. **No `app/api/` folder in web.** `next.config.ts` rewrites `/api/*` to the Express API so cookies stay first-party. A Next route handler under `app/api/` would shadow that rewrite, so the web app has none. `/r/{code}` is rewritten the same way.
3. **Auth pages.** `login`, `sign-up` and `verify-otp` use a 6-digit email code (Better Auth `emailOTP`) instead of a magic link. Fans join from Instagram, TikTok and YouTube in-app browsers: a magic link opens in a different browser, so the session lands in the wrong place, and Google blocks OAuth inside those in-app browsers. The Google button stays for normal browsers and is hidden inside in-app ones. `forgot-password` and `reset-password` only make sense if we also turn on password sign-in; that is an open decision.
4. **`[handle]` lives in two route groups.** `(public)/[handle]` holds the bio page, join and showcase. `(dashboard)/[handle]` holds member-only pages. No two pages resolve to the same URL, so Next allows it; the first scaffold step confirms this.
5. **Reserved handles.** Every top-level route above (`about`, `blog`, `contact`, `cookies`, `dashboard`, `forgot-password`, `login`, `onboarding`, `pricing`, `privacy-policy`, `reset-password`, `sign-up`, `terms`, `verify-otp`, plus `api`, `r`, `admin`, `help`, `settings`) is in `shared/src/reserved-handles.ts`, so no creator can claim a handle that collides with a page.
6. **Dockerfiles are optional.** Production runs on Vercel, which ignores them. They exist for local parity and as a ready exit to Cloud Run.
