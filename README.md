# Fellow Owners

Startupathon challenge: **Operating System for Fanbases** (Persist Ventures).
Goal: move a creator's audience from Followers -> Organized communities -> Ideas -> Collaboration -> Action.

One link in a creator's bio that gathers followers into communities, surfaces the best ideas and people, and lets the creator put their reach behind what the community builds.

| Part | What | Runs on |
|------|------|---------|
| `web/` | Next.js 16 app: bio pages, fan pages, creator dashboard | Vercel |
| `api/` | Express 5 API: business logic, auth (Better Auth), AI, Drizzle + Postgres | Railway |
| `shared/` | zod schemas, enums and limits used by both | built into both |
| `docs/` | The build docs (below) | |

## Run it locally

Needs Node 24, pnpm (version from `package.json`) and Docker.

```
pnpm install
docker compose up db            # Postgres with pgvector on :5432
cp api/.env.example api/.env    # defaults work for development
pnpm db:migrate                 # apply the SQL migrations
pnpm db:seed                    # load the demo space (Mira Lane, a travel creator)
pnpm dev                        # web and api through Turborepo; api on :4000
```

The web app rewrites `/api/*` and `/r/*` to the API (`API_URL`, `http://localhost:4000` in development). Without `OPENROUTER_API_KEY` a deterministic fake AI answers, so every screen works with no keys. `docker compose up --build` runs the database and the API in containers instead.

Scripts (root `package.json`): `pnpm dev`, `build`, `typecheck`, `lint` (Biome), `test:unit`, `test:integration` (needs the Postgres from Docker), `test:e2e` (Playwright smoke test), `db:generate`, `db:migrate`, `db:seed`, `db:embed` (backfill embeddings, needs an AI key), `db:studio`.

## Deploy

Production is one Railway project plus one Vercel project. Details and every variable are in [docs/02-trd.md](docs/02-trd.md), sections 2 and 3.

### Railway (API, data, cron)

| Service | Setup |
|---------|-------|
| `api` | Build from `api/Dockerfile` (context: repo root; `.railwayignore` trims the upload). Pre-deploy command: `node dist/db/migrate.js`, so migrations run before traffic moves. Health check: `GET /api/health` (503 when the database is down). Set `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` so open requests finish on a deploy. `TRUST_PROXY_HOPS` (default 2: Vercel's edge, then Railway's) is how many proxies' `X-Forwarded-For` entries the per-IP limits trust; set 1 if clients call Railway directly |
| `pgvector` | Postgres with the `vector` extension. `DATABASE_URL` on `api` points at it |
| Redis | `REDIS_URL` on `api`: rate-limit counters, daily caps, code throttle and live notifications across replicas. Optional |
| `cron` | Schedule `0 * * * *`. Its start command calls `POST /api/cron/tick` on `api` with `Authorization: Bearer $CRON_SECRET`. The tick runs the hourly jobs (sweep, question grouping, challenge closing, email digests) and the daily and weekly ones (follower refresh 06:00 UTC, demo reset and retention purge 09:00 UTC, community digests Mondays 13:00 UTC). A missed hour catches up on the next tick. `GET /api/cron/status` shows recent runs; `POST /api/cron/tick?job=<name>` runs one job now |
| `media` bucket | S3-compatible bucket for image uploads. Give `api` its `BUCKET_ENDPOINT`, `BUCKET_NAME`, `BUCKET_ACCESS_KEY_ID` and `BUCKET_SECRET_ACCESS_KEY` (all four, or uploads stay off). Set the bucket's CORS once so browsers can PUT and GET from the web origins (production, previews, localhost) |

First deploy: after the migration runs, load the demo with `POST /api/cron/tick?job=demo_reset` (or `pnpm db:seed` against the database), then run `pnpm db:embed` against the database with an AI key to backfill embeddings.

### Vercel (web)

Project `fellow-owners-web` (the Next.js app in `web/`). Environment variables:

| Variable | What |
|----------|------|
| `API_URL` | Origin of the Railway `api` service. The rewrites and server-side reads use it |
| `NEXT_PUBLIC_APP_URL` | The public web origin, for links people copy or scan. Optional |
| `INTERNAL_API_KEY` | Server-only, 32+ characters, the same value as on `api`; lets the web server's reads skip the API's per-IP rate limits |

On `api`, set `WEB_ORIGIN` and `BETTER_AUTH_URL` to the web origin (auth is reached through the web rewrite), and `TRUSTED_ORIGINS` for preview deployments.

### Where secrets live

Only in the Railway and Vercel environment variables. `api/.env.example` lists names, never values; `api/src/config/env.ts` checks them on boot and stops the process with the full list of problems. In production the API requires `DATABASE_URL`, `BETTER_AUTH_SECRET` (32+ characters), `RESEND_API_KEY` with `EMAIL_FROM`, `CRON_SECRET` and `CLICK_SALT`, plus `DEMO_CREATOR_EMAIL`, `DEMO_FAN_EMAIL` and `DEMO_PASSWORD` while `DEMO_ENABLED` is on. Optional keys switch features on: `OPENROUTER_API_KEY` (live AI), `GOOGLE_*`, `APPLE_*`, `FACEBOOK_*` (sign-in), `APIFY_TOKEN` (profile lookups), `YOUTUBE_API_KEY` (comment import), `FAL_KEY` (seed media), `ADMIN_EMAILS` (admin allowlist).

## The build docs

These docs follow the "Six Documents Before Vibe Coding" template. Give them to the coding agent together.

| # | Document | Answers |
|---|----------|---------|
| 01 | [PRD](docs/01-prd.md) | What we build, for whom, how we know it worked, what is built |
| 02 | [TRD](docs/02-trd.md) | Stack, hosting, environment, API, jobs, AI design, security, decisions |
| 03 | [App Flow](docs/03-app-flow.md) | Every screen, journey, action, empty state |
| 04 | [UI and UX Design Brief](docs/04-ui-ux-brief.md) | Visual language, tokens, components |
| 05 | [Backend Schema](docs/05-backend-schema.md) | Tables, relationships, authorization, validation, retention, seed |
| 07 | [File Structure](docs/07-file-structure.md) | The repo tree and naming rules |

If two documents disagree, do not guess. Flag it, and resolve in this order: PRD (what) > App Flow (behavior) > Backend Schema (data rules) > TRD (how) > UI brief (look). Then update the losing document. The glossary is in [docs/README.md](docs/README.md).
