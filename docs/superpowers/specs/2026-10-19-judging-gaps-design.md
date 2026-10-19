# Judging gaps: product-first, AI twin up front, credible demo, pilot path

Date: 2026-10-19. Owner request: "fix all problem" after a review of the live build against the Persist
startupathon brief. Owner opted out of further questions; calls marked **(my call)** are defaults the owner can
override.

## Why

The brief judges five things: Problem & UX, Community & AI, Innovation, Execution, and (starred) Real Influencer
Validation. The build is live and polished, so Execution is fine. The review found:

1. **First screens sell a person, not the product.** Landing hero, auth panel and onboarding lead with the demo
   creator Mira (portrait, "@mira · travel · 1.14M", YouTube 620K / Instagram 380K / TikTok 140K) and platform
   follower counts. Owner: "landing, auth, onboarding is mostly show creator other platform info".
2. **The brief's signature idea is buried.** "An AI version of the influencer" that reads the communities and
   highlights what matters shows up as a small "Ask your AI" box under the fold on Today.
3. **Off-brief tools dilute Innovation.** Brand deals, Planner, Performance and the "Your platforms / 1,140,000 total
   followers" card are what Beacons, Later and Stan already do.
4. **Demo numbers look fake.** "Bio visitors 295, +2850%", "Visitors who joined 100%", "Promotions a week 0.5",
   "No thumbs yet" (cause: % change on a tiny previous value, seed has 30 days of ~10 visits/day vs 735 joins,
   no AI thumbs seeded, 2 promotions).
5. **No fan-built business in the story.** The brief: "fan bases could build businesses together that they want the
   main influencer to promote". All 44 seeded projects are guides, lists or zines.
6. **No real creator.** Owner has no creator relationship. The starred criterion is at zero.
7. **Demo fragility (CTO review).** First Today load of each UTC day waits on a live LLM call; a failed briefing is not
   cached so every reload retries the LLM; live AI sits behind a small OpenRouter spend cap. See the CTO section below.

## Goals

- A creator understands in 5 seconds: one bio link → fans join rooms and build together → **your AI twin** reads it
  all and shows you the few things worth acting on → you spotlight what fans built.
- The AI twin is the face of the studio: named, visible at the top of Today, in onboarding and on landing.
- The studio reads as one loop (Today, Fan mail, Ideas, Communities, Challenges, Fans, Spotlight, Settings).
- Every demo number a judge sees is plausible and internally consistent.
- The demo story includes one fan crew that built a small product the creator promotes.
- The founder has a ready path to a real creator: an outreach playbook, a private audience-preview generator,
  a "founding creator" door on the site, and in-app feedback with quote consent on record.

## Non-goals

- No new platform integrations, no auto-posting, no DM sync (existing owner rules stand).
- No deletion of Brand deals, Planner or Performance: routes, APIs and data stay.
- No restyle. Parchment Frost, DESIGN.md and copy rules stand.
- No hosted "preview space" system, token pages or claim/ownership transfer (my call, see Pilot).
- No change to the demo creator's niche (travel/lifestyle stays; owner decision 2026-10-09).

## Anti-goals (failure even if it works)

- Presenting Mira or any demo number as real. Every demo surface keeps a "made up" label.
- Fake testimonials or quotes. Nothing is quoted without written consent.
- AI acting on a creator's behalf. The twin reads and suggests; it never posts or replies by itself.
- Storing or showing third-party commenters' names in a pilot preview.
- Breaking the in-app-browser fan join flow or the one-click demo.

## Constraints

- Monorepo: `web` (Next.js app router, Vercel), `api` (Node, Postgres+pgvector, Railway), `shared` (contracts).
- Single branch `main`; a push deploys production. Full review (lint, typecheck, unit, integration, web build) before
  any push, and the owner's OK before pushing.
- Copy: plain, short, no hype, sentence case. Serif headings weight 400. Lake Blue `#2b59d1` is the only action colour.
- Name: **"your AI twin"** everywhere the AI is addressed as a thing the creator owns. Pair with the rule
  "reads like you, never speaks for you" so it does not contradict the Trust section.
- Accessibility: WCAG 2.2 AA; decorative art stays `aria-hidden`/`inert`.

## What gets built

### A. Product-first first impression (web)

- **Hero:** remove the "Demo creator: @mira · travel · 1.14M" chip and the phone's creator header (portrait + platform
  counts). The phone shows an **AI twin brief** instead: "Your AI twin read 1,240 messages in 6 rooms this week.
  3 need you." with three one-line picks, each with a reason. Browser keeps the real `DecisionCard`. Subcopy names the
  twin. Stat strip drops "7 in 10 AI picks kept (pilot target)" for claims the product makes true by design.
  Kicker "In Mira's demo space" becomes "Demo space. Names are made up."
- **Auth panel (login, create-account, OTP, reset):** replace the portrait photo, "Demo: Mira Lane's space" pill and
  travel room chips with product art (the same hero stage, scaled), keeping the caption and per-route line. The panel
  no longer calls the API. Create-account name placeholder "Mira Lane" → "Your name".
- **Onboarding:** keep step order (the platform link feeds AI suggestions) **(my call)** but reframe it around the twin:
  step 1 "Let your AI twin meet your audience" (optional; reads recent comments and suggests rooms), step 3
  "Teach your AI twin" (promote / never promote / voice). Remove follower totals from the step and the live preview.
  Replace Mira's vlog stills behind steps with the plain Parchment wash.
- **Landing CTA strip:** "1.14M followers / 6 rooms / 1,200 fans · Demo numbers from Mira's space" → product facts.
  Add one line under the CTA buttons: founding creators get setup with the founder and one requested change shipped in
  48 hours → `/contact?topic=founding`.
- **Fans section join screen:** drop the follower count under the creator name.

### B. One loop, AI twin up front (web)

- Rail: remove Brand deals, Planner, Performance from `NAV_GROUPS`. The CTO review found all three are unfinished
  placeholders (their APIs return 501), so they are hidden with no replacement link **(my call)**; routes stay so
  nothing 404s. Mobile "More" menu follows automatically.
- Today: remove `BrandPickCard`, `ProfileScoreCard` and `PlatformsCard` from Today. Move the ask card to the top of the
  right column and title it "Ask your AI twin". Greeting subline names the twin with real counts
  (e.g. "Your AI twin read 57 new ideas and 19 messages. 5 need you.").

### C. Credible numbers + demo resilience (api)

- `% change` is `null` (no note shown) when the previous value is below 20.
- Seed 60 days of page visits at a level where ~15% of visitors join (the PRD target), with mild growth.
- Seed ~30 AI thumbs (about 80% up) on top picks in the last 30 days.
- Seed promotions so the 30-day rate is about 1 a week and the 7-day window has at least one.
- Briefing: a failed build is cached for 15 minutes so reloads don't retry the LLM; the demo reset warms today's
  briefing so judges never wait on the model. Plus the CTO items below.

### D. Fan crew builds a business (api seed + landing data)

- New flagship project in Budget Travel: **"Fare Pals"**, a fare-alert app for $60-a-day trips built by a crew of five
  fans (Developer, Designer, Fare analyst, Local guide, Community host), status launched, with a sign-up link and
  sign-up count in its body. Creator spotlight published 2 days ago with drafts for X / Instagram / YouTube and clicks.
- Landing showcase strip lists it first, labelled demo like everything else.

### E. Pilot path (founder + small product hooks)

- **Playbook** `docs/pilot/playbook.md`: who to target, where to find them, daily volume, DM + follow-up, five feedback
  questions, testimonial ask, ranked honest fallbacks, never-do list. Source: CEO review 2026-10-19.
- **Audience preview script** (api, local CLI, no DB writes, no hosting): YouTube channel → last 10 videos' top comments
  via the official Data API → existing `clusterImport` → a self-contained HTML card: suggested rooms with counts,
  three sample quotes **without names or handles**, totals. Raw comments are never written to disk.
  The founder screenshots it for the first DM. **(my call: replaces token pages + claim flow; the creator's own
  sign-up + onboarding import is the claim flow.)**
- **Founding creator door:** `/contact?topic=founding` prefills the message.
- **Feedback with quote consent:** a small "Tell the founder" card in Settings: message + checkbox "You can quote me by
  name in Fellow Owners' materials". Sent through the existing support request API; consent is written into the stored
  message **(my call: no new kind or migration)**.

## Owner-only actions (not code)

- Set `YOUTUBE_API_KEY` on Railway `api` (and locally for the preview script). Without it, imports return labelled
  sample data and a preview must not be sent.
- Raise the OpenRouter spend cap and turn on a usage alert.
- Test the fan join on a real phone in the Instagram, TikTok and YouTube in-app browsers.
- Run the outreach.

## CTO review findings (2026-10-19, kept items become plan tasks)

1. **Shared caps lock judges out.** All judges share one creator, one fan and one space; caps are per user/space
   (Ask 30/day, fan pitches 5/day, posts 20/day, coach 10/day, reply drafts 30/day, briefing regen 5/day, token budget
   200k/day). Failed asks also count. → Demo space gets 5x the per-day caps and a 1M token budget; failed asks stop
   counting.
2. **LLM in the Today request path** (~9 s, first load after 00:00 UTC and after each reset; no single-flight). →
   Hourly tick job warms the demo briefing (DB-only when cached); failed builds cached 15 min.
3. **Public demo is writable.** The demo creator can change the public `/mira` bio, avatar, links. → `notDemoAccount`
   guard on profile writes in `PUT /settings` with a friendly "The demo profile is read-only" message.
4. **AI cap/failure degrades quietly.** → Owner tops up OpenRouter (~$20) and sets an alert; `AI_ENABLED=false` is the
   emergency switch.
5. **Per-IP demo limiter** (10/min, 20/hour per IP) locks out judges on one network; the button shows a vague error.
   → 30/min, 150/hour; the button says when to retry on a 429.
6. **09:00 UTC reset** lands mid-day for India/Europe and is not atomic. → Move to 01:00 UTC **(my call: 06:30 IST,
   21:00 ET, 18:00 PT)**; owner can trigger a manual reset before a judging session.
7. **Deploy fragility** (intermittent Vercel Git deploys, duplicate Railway service failing, migrations run on prod
   before deploy). → After the push: check `vercel ls --prod`, `/api/health` version, prod Playwright smoke. Owner
   deletes the duplicate `fellow-owner` Railway service. Freeze main during judging.
8. **Placeholder screens in the nav** (Brand deals, Planner, Performance). → Hidden (section B).

Security: no escalation path from the demo session; demo accounts are locked and isolated from real users.

## Left to the builder

Exact component structure, copy within the rules above, seed distributions within the stated targets.
