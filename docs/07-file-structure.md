# 07 · File Structure

Status: draft v0.2 for review · Updated: 2026-10-10

## Conventions

- **Root holds five things:** `web/`, `api/`, Docker files, `.github/`, `docs/`. Plus one small `shared/` package (see note 1).
- **Web has no `src/` folder:** `app/`, `components/`, `hooks/`, `api/` and `lib/` sit at the root of `web/`, next to `proxy.ts`. The `@/*` alias points at `web/`.
- **Web routes are grouped by who can see them:** `(public)` anyone, `(auth)` sign-in pages, `(legal)` policies, `(dashboard)` signed-in only. Groups never change the URL.
- **Web components are grouped by reach:** `layout/` (navbar, footer, header, sidebar), `shared/` (used on more than one page), `landing/`, then one folder per page or feature.
- **`hooks/`** holds the project's custom hooks. **`lib/`** holds flat files only: no subfolder for a single file.
- **`web/api/`** holds one typed client file per backend route group. It is the only place the web app calls the backend.
- **`api/`** is layer-based: `routes -> controllers -> services -> repositories -> db`, wired in `container.ts`. AI, auth and background work each have their own folder.
- File names are kebab-case. React components export PascalCase names. Backend files carry their layer as a suffix: `posts.routes.ts`, `posts.controller.ts`, `posts.service.ts`, `posts.repo.ts`.
- Every file listed below exists. Web components are listed by folder, not file by file, because that tree changes often.

## Root

```
fellow-owners/
├─ web/                       Next.js 16 app (fan pages + creator dashboard)
├─ api/                       Express 5 backend (all business logic, auth, AI, db)
├─ shared/                    zod schemas, enums, limits used by web and api
├─ docs/                      the build docs
├─ .github/
│  ├─ workflows/
│  │  └─ ci.yml               install, lint, typecheck, unit + integration tests, migrations-match-schema check, web build, API image build
│  ├─ pull_request_template.md
│  └─ dependabot.yml
├─ docker-compose.yml         local stack: postgres (pgvector/pgvector:pg17) and the API; the web app runs with pnpm dev
├─ .dockerignore
├─ .railwayignore             what `railway up` leaves out of the upload for the API image
├─ package.json               workspace scripts: dev, build, test, db:*
├─ pnpm-workspace.yaml        web, api, shared
├─ turbo.json
├─ biome.json                 lint + format for every workspace
├─ .nvmrc                     24
├─ .gitignore
├─ AGENTS.md                  agent notes (Turborepo guidance)
├─ DESIGN.md, DESIGN.json     design reference
├─ PRODUCT.md, NOTICE.md
├─ prompt.md                  image prompts for the clay-diorama art
└─ README.md                  setup, env, scripts, deploy
```

## web/

```
web/
├─ app/
│  ├─ layout.tsx, providers.tsx, globals.css, not-found.tsx, error.tsx, global-error.tsx
│  ├─ robots.ts, sitemap.ts
│  ├─ start/route.ts                    GET /start: the one "Get started" target (Today, onboarding or create account, by session)
│  │
│  ├─ (public)/                         anyone, signed in or not
│  │  ├─ layout.tsx                     navbar + footer (marketing pages only)
│  │  ├─ page.tsx                       /  landing: Enter as creator / fan, Start your space
│  │  ├─ about/, contact/, pricing/, blog/ (+ [slug]/)
│  │  ├─ email-preferences/             unsubscribe landing (button POSTs the token) + email switches
│  │  ├─ newsletter/                    confirm/ and unsubscribe/ (button POSTs the token), [status]/ notice
│  │  └─ [handle]/                      creator's public pages, own layout (no marketing navbar)
│  │     ├─ layout.tsx                  fan shell: creator top bar
│  │     ├─ page.tsx                    /{handle}  bio link page
│  │     ├─ opengraph-image.tsx
│  │     ├─ join/                       join stepper, sign-in is step 1 inline
│  │     └─ s/[slug]/                   showcase of a promoted project (+ opengraph-image.tsx)
│  │
│  ├─ (auth)/                           note 3
│  │  ├─ layout.tsx                     AuthShell: hazed shell, brand column, one white form card
│  │  ├─ login/, create-account/        /sign-up redirects to create-account (next.config.ts)
│  │  ├─ verify-otp/                    confirm your email: 6-digit code
│  │  ├─ forgot-password/, reset-password/
│  │  └─ sign-out/
│  │
│  ├─ (legal)/
│  │  ├─ layout.tsx                     marketing chrome around the prose shell
│  │  └─ privacy-policy/, terms/, cookies/    /refunds redirects to /terms#refunds
│  │
│  ├─ (dev)/kit/                        component kit pages (atoms, cards, primitives)
│  │
│  └─ (dashboard)/                      signed-in only
│     ├─ layout.tsx                     session gate, redirects to /login?returnTo=
│     ├─ onboarding/                    create your space (4 steps)
│     ├─ account/                       password, email preferences, export, delete account
│     ├─ dashboard/                     creator studio, owner only
│     │  ├─ layout.tsx                  creator shell: sidebar + header tray
│     │  ├─ page.tsx                    Today
│     │  ├─ inbox/                      Fan mail (+ questions/: What fans want, Answer Once)
│     │  ├─ ideas/
│     │  ├─ communities/                (+ [slug]/ detail, reports/)
│     │  ├─ people/                     Fans (+ followers/)
│     │  ├─ promote/                    Spotlight (+ [postId]/ composer)
│     │  ├─ challenges/                 (+ [id]/ detail)
│     │  └─ settings/
│     └─ [handle]/                      fan pages that need a membership
│        ├─ layout.tsx                  membership check + fan shell with community pills
│        ├─ c/[slug]/                   community feed
│        ├─ p/[postId]/                 post detail
│        ├─ new/                        new post, or a challenge entry with ?challenge=
│        ├─ pitch/                      send a pitch
│        └─ me/                         my posts, teams, pitches, spotlight moments
│
├─ components/                          grouped by reach (convention above)
│  ├─ ui/                               shadcn-style primitives, re-themed
│  ├─ magicui/                          number-ticker
│  ├─ layout/                           navbar, footer, app-shell, header, sidebar, bottom-nav, dashboard-nav, fan-shell, fan-topbar, newsletter-form
│  ├─ shared/                           used on more than one page: stat-card, chart-card, data-table, fit-pill, ai-chip, side-panel, empty-state, image-upload, report-button, coach-panel, cookie-notice, ...
│  ├─ landing/                          landing page sections (hero, loop, problem, fans, creators, connect, trust, faq, cta, footer) and their data/motion files
│  ├─ marketing/                        contact form, page frame
│  ├─ legal/                            legal page UI, data request form
│  ├─ auth/                             auth shell and forms: login, create account, otp, forgot/reset, social buttons, password strength, pending-login, username field
│  ├─ account/                          account settings, email preferences, delete account
│  ├─ bio/                              creator header, community grid, featured projects, fans of the week, pitch CTA, visit beacon
│  ├─ join/                             join stepper, intro, community picker, profile step
│  ├─ community/                        feed, post card, challenge card, community header, new-post button
│  ├─ post/                             post detail and form, team roles, comments, challenge entry, similar section, loved badge
│  ├─ pitch/                            pitch form, sent confirmation
│  ├─ me/                               my space: posts, teams, pitches, pitch tracker, moments, leave space
│  ├─ showcase/
│  ├─ notifications/                    bell and popover
│  ├─ onboarding/                       stepper, handle, platforms (with profile import), communities, taste steps
│  └─ dashboard/
│     ├─ today/                         decision stack, ask card, metrics, fans to thank, reports notice, setup checklist, briefing
│     ├─ inbox/                         table, cards, toolbar, pitch panel, reply box, question groups
│     ├─ ideas/                         grid, board, post panel
│     ├─ communities/                   cards, detail, activity, reports view, cover card
│     ├─ people/                        members table, rising strip, spotlight panel, person communities
│     ├─ followers/                     roster, panel, import panel, chips
│     ├─ promote/                       promotions list, composer, draft editor, preview, publish bar
│     ├─ challenges/                    list, detail, new-challenge sheet
│     └─ settings/                      profile form, taste profile, bio link card, read-receipts toggle, import card
│
├─ hooks/
│  ├─ use-space, use-membership, use-url-state, use-cursor-list, use-debounce, use-media-query, use-in-app-browser, use-sign-out, use-scroll-scene
│  └─ queries/                          one TanStack Query hook file per resource (feed, post, pitches, overview, briefing, inbox, ideas, people, followers, notifications, insights, communities, promotions, challenges, question-groups, reports, similar, coach, ask, me, metrics, join, settings, notification-prefs, public-config, space-page)
│
├─ api/                                 typed client, one file per backend route group
│  ├─ account.ts, ask.ts, challenges.ts, coach.ts, config.ts, demo.ts, followers.ts, insights.ts
│  ├─ metrics.ts, moderation.ts, notification-prefs.ts, notifications.ts, pitches.ts, posts.ts
│  └─ question-groups.ts, similar.ts, snoozes.ts, spaces.ts, studio.ts, support.ts, uploads.ts
│
├─ lib/                                 flat files only (plus fixtures/)
│  ├─ utils.ts, format.ts, fonts.ts, toast.ts, constants.ts, routes.ts (typed path builders), seo.ts
│  ├─ auth-client.ts                    Better Auth React client (emailOTP, username, inferAdditionalFields for the social profile)
│  ├─ fetcher.ts                        fetch wrapper: base URL, cookie forwarding on server, error mapping
│  ├─ server-api.ts                     server-side API reads at API_URL, with x-internal-key
│  ├─ query-client.ts, env.ts (zod-checked public env), local-state.ts, platform-client.ts
│  ├─ legal.ts, blog.ts, creator-assets.ts
│  └─ fixtures/
│
├─ e2e/smoke.spec.ts                    Playwright smoke test (pnpm test:e2e; not run in CI)
├─ scripts/                             contrast and sidebar-cookie checks, creator media generation
├─ public/                              logo, favicon, demo/, creator/ images, frames/
├─ proxy.ts                             Next 16 proxy: cookie check for (dashboard) routes
├─ next.config.ts                       rewrites /api/* and /r/* to API_URL; redirects
├─ components.json                      shadcn config
├─ playwright.config.ts
├─ tsconfig.json
└─ package.json
```

## api/

```
api/
├─ src/
│  ├─ index.ts                          default-exports the app (Vercel-style entry)
│  ├─ create-app.ts                     helmet, request id, Better Auth handler, json, routes, error handler
│  ├─ local.ts                          app.listen(PORT): the process Railway runs (node dist/local.js), with graceful shutdown
│  ├─ container.ts                      composition root: repos -> services -> controllers, plus the job table (createJobs)
│  │
│  ├─ config/
│  │  └─ env.ts                         zod-checked env, fails fast on boot
│  │
│  ├─ auth/
│  │  ├─ index.ts                       betterAuth(): drizzle adapter, email and password, username, Google, Apple, Facebook, emailOTP (encrypted codes), delete-account code, sessions, trustedOrigins, Redis rate-limit storage
│  │  ├─ email.ts                       code emails through Resend, per-address send throttle
│  │  └─ demo.ts                        demo account helpers
│  │
│  ├─ routes/                           URL -> middleware -> controller, nothing else (one file per area)
│  │  ├─ index.ts                       mounts everything under /api and the root /r/:code
│  │  ├─ health, config, demo, admin, cron, support, newsletter
│  │  ├─ public, spaces, coach, posts, pitches, moderation, similar, metrics
│  │  ├─ account, notification-prefs, notifications, uploads
│  │  └─ studio, followers, insights, challenges, question-groups, ask, snoozes   (each as <name>.routes.ts)
│  │
│  ├─ controllers/                      read req, call one service, shape response (one <name>.controller.ts per area, plus platform.controller.ts for profile lookups)
│  │
│  ├─ services/                         business rules, authorization, caps (<name>.service.ts)
│  │  ├─ access, limits, spaces, communities, memberships, posts, comments, signals, teams
│  │  ├─ pitches, overview, briefing, discovery, promotions, clicks, demo
│  │  ├─ followers, notifications, notification-emails, insights, challenges, question-groups
│  │  └─ ask, coach, similar, moderation, account, support, newsletter, metrics, snoozes, uploads
│  │
│  ├─ repositories/                     Drizzle queries only, always scoped by space_id (<name>.repo.ts)
│  │  ├─ spaces, communities, memberships, posts, comments, signals, teams, pitches, promotions, clicks
│  │  ├─ digests, ai-runs, feedback, followers, notifications, notification-prefs, insights
│  │  ├─ asks, question-groups, reports, search (pgvector nearest-neighbour), snoozes
│  │  └─ page-visits, support, newsletter, account
│  │
│  ├─ ai/
│  │  ├─ provider.ts                    fast, smart and embedding models from env (Vercel AI SDK through OpenRouter)
│  │  ├─ run.ts                         every call: enabled, budget, per-task caps, timing, zod validation, ai_runs row
│  │  ├─ guard.ts                       untrusted-text wrapper, score clamping, id checks
│  │  ├─ index.ts, types.ts             live services vs the fake; task names and errors
│  │  ├─ fake.ts, fakes/                deterministic fake AI (no key needed)
│  │  ├─ media.ts                       fal.ai image and video generation (seed assets)
│  │  └─ tasks/                         one file per task: prompt + output schema + function
│  │     ├─ triage-item, embed-item, suggest-communities, briefing, promote-drafts
│  │     ├─ tag-followers, cluster-import, community-digest, suggest-reply, ask-ai
│  │     └─ spotlight-note, coach, question-group, challenge-summary, suggest-setup
│  │
│  ├─ workers/                          background work and scheduled jobs
│  │  ├─ schedule.ts                    runInBackground(): waitUntil on Vercel, fire-and-forget otherwise
│  │  ├─ tick.ts                        the hourly tick: job names, schedule, slots, job_runs bookkeeping
│  │  ├─ analyze-item.ts, sweep.ts, sweep-all.ts     triage + embed one item; claim pending items (SKIP LOCKED); sweep every space
│  │  ├─ group-questions.ts, close-challenges.ts, community-digests.ts
│  │  ├─ refresh-followers.ts, demo-reset.ts
│  │  └─ purge.ts                       retention rules from 05
│  │
│  ├─ middlewares/
│  │  ├─ request-id, validate (zod for body, params, query), rate-limit
│  │  ├─ require-session, require-member, require-owner, require-admin, cron-auth
│  │  └─ not-found, error-handler
│  │
│  ├─ db/
│  │  ├─ client.ts                      postgres.js (prepare: false) + drizzle
│  │  ├─ migrate.ts                     applies migrations (the Railway pre-deploy command: node dist/db/migrate.js)
│  │  ├─ schema/                        index, enums, columns, auth, spaces, communities, memberships, posts, social, inbound,
│  │  │                                 promotions, ai, followers, later (notifications, imports, asks), question-groups,
│  │  │                                 moderation, notification-prefs, page-visits, snoozes, support, newsletter, jobs
│  │  ├─ migrations/                    generated SQL, committed: 0000 to 0008 (see 05, section 9)
│  │  └─ seed/
│  │     ├─ data/                       space, communities, members, posts, comments, pitches, promotions, followers, challenges, question-groups (.json)
│  │     ├─ seed.ts                     pnpm db:seed [--reanalyze]; seedDemoSpace is also what the demo reset calls
│  │     ├─ embed.ts                    pnpm db:embed
│  │     └─ generate-content.ts         one-off: writes data/*.json with the LLM
│  │
│  ├─ lib/
│  │  ├─ errors, logger (pino with redaction), http, pagination (cursor encode/decode), dates
│  │  ├─ ranking (pure scoring functions from 02), hash, short-code, slug, handles, signed-token
│  │  ├─ audience-import (CSV/paste parser), csv (export writer), youtube (comment import)
│  │  ├─ platform-lookup (+ platform-fixtures/), present (response shaping)
│  │  └─ redis, pubsub (notifications), job-lock (advisory lock), mailer (Resend), storage (S3 presign), db-errors
│  │
│  └─ types/
│     └─ express.d.ts                   req.session, req.membership
│
├─ tests/
│  ├─ unit/                             ranking, limits, guard, AI tasks and run, tick schedule, rate limits, storage, csv, youtube, ...
│  ├─ integration/                      Supertest against a real Postgres, one file per route group or feature (including cron tick, migrations 0004 and 0006, seed)
│  ├─ fixtures/                         recorded AI responses, Apify fixtures
│  └─ helpers/                          test-db.ts, factories.ts, auth.ts, global-setup.ts
├─ Dockerfile                           production image for Railway (pre-deploy: node dist/db/migrate.js); context is the repo root
├─ drizzle.config.ts
├─ vitest.config.ts
├─ tsconfig.json, tsconfig.build.json
├─ .env.example
└─ package.json
```

## shared/

```
shared/
├─ src/
│  ├─ index.ts
│  ├─ enums.ts                          post types, statuses, pitch types, tints, notification kinds, report enums, upload kinds, export kinds, ...
│  ├─ limits.ts                         every length and daily cap from 05 in one place; AI caps; retention days
│  ├─ reserved-handles.ts
│  ├─ platform-lookup.ts                profile lookup shapes and limits
│  ├─ operator.ts                       operator details used by the legal pages
│  ├─ types.ts                          API response shapes
│  └─ schemas/                          zod request schemas, one file per area:
│     account, ask, ask-ai, auth, coach, comment, community, follower, insights, membership, metrics,
│     newsletter, notification, pitch, post, promotion, question-group, report, snooze, space, support,
│     taste-profile, upload
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
└─ 07-file-structure.md                 this file
```

## Notes

1. **Why `shared/` exists.** Every length limit, daily cap and request shape is validated in the browser and again in the API. Keeping the zod schemas in one package means a rule changes in one place. Without it, `web` and `api` would carry copies that drift.
2. **No `app/api/` folder in web.** `next.config.ts` rewrites `/api/*` to the Express API so cookies stay first-party. A Next route handler under `app/api/` would shadow that rewrite, so the web app has none. `/r/{code}` is rewritten the same way. `/start` is the one route handler outside `/api`, and it does not collide with the rewrite.
3. **Auth pages.** People log in with an email or a username plus a password, or with Google, Apple or Facebook (01, Q8, decided 2026-10-02). `create-account` asks for a name, email, username, an optional social profile and a password; `sign-up` is a permanent redirect to it (`next.config.ts`), and there is no creator-or-fan question because the role lives in `memberships.role`, per space. A new email account confirms its email on `verify-otp` with a 6-digit code (Better Auth `emailOTP` with `overrideDefaultEmailVerification`) instead of a link, and `forgot-password` and `reset-password` work with a code the same way. Fans join from Instagram, TikTok and YouTube in-app browsers: a link in an email opens in a different browser, so the session would land in the wrong place, and Google blocks OAuth inside those in-app browsers. The Google button stays for normal browsers and is hidden inside in-app ones; Apple and Facebook stay. Facebook stands in for Instagram: Better Auth has no Instagram provider, and Instagram Login only works for professional accounts.
4. **`[handle]` lives in two route groups.** `(public)/[handle]` holds the bio page, join and showcase. `(dashboard)/[handle]` holds member-only pages. No two pages resolve to the same URL, so Next allows it; the first scaffold step confirms this.
5. **Reserved handles.** Every top-level web route (`about`, `account`, `blog`, `contact`, `cookies`, `create-account`, `dashboard`, `email-preferences`, `forgot-password`, `kit`, `login`, `newsletter`, `onboarding`, `pricing`, `privacy-policy`, `refunds`, `reset-password`, `sign-out`, `sign-up`, `start`, `terms`, `verify-otp`), plus `api`, `r`, `admin`, `help`, `settings`, framework and file names (`_next`, `favicon.ico`, `robots.txt`, `sitemap.xml`, `logo.svg`, `opengraph-image`) and a few likely abuse words, is in `shared/src/reserved-handles.ts`, so no creator can claim a handle that collides with a page.
6. **Where each part runs.** The web app deploys to Vercel (no Dockerfile). The API deploys to Railway from `api/Dockerfile`, with `node dist/db/migrate.js` as its pre-deploy command; the same Dockerfile backs the `api` service in `docker-compose.yml` for local parity. `.railwayignore` keeps the upload small: the image needs only the root workspace manifests, `shared/`, `api/` and `web/package.json`. The Postgres (pgvector), Redis, cron service and media bucket are configured in the Railway project, not in this repo (02, section 3).
