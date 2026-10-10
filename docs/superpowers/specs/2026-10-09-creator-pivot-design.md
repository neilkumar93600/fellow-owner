# Creator Pivot: from "developer tool" to a creator + fan platform

Date: 2026-10-09 · Status: approved in chat, awaiting written-spec review

## 1. Why

The site reads like a developer / indie-hacker tool:

- The demo creator (Mira Kapoor) builds software. Her communities are `Builders </>`, `Designers` and `Investors & Operators`, her featured project is a gym-log app, and her pitches are about investment and hiring.
- The dashboard looks like an ERP admin screen: data tables, fit-score bars, "Export CSV", "159 pitches", sort and status dropdowns.
- The layout is a near-copy of the Pinterest "Starline" reference: pill sidebar, lime active item, "Welcome 🎉" header tray, tab bar over a table. The user is worried about copy accusations.
- The "glass" is flat white at 45% with no frost.
- The user dislikes the clay-ball background video (loop section) and the sphere images (hero).

The challenge brief ("Operating System for Fanbases": Followers → Communities → Ideas → Collaboration → Action) is unchanged. The engine stays. The skin, story and demo world change, and six features are added.

## 2. Decisions (from the user)

| Topic | Decision |
|---|---|
| Demo creator | A fictional **US lifestyle / travel vlogger** shown with realistic photos |
| Scope | **Everything**: landing, dashboard, fan pages, auth, onboarding, legal, marketing and system pages |
| Landing visuals | Remove the clay-ball video and sphere canvas. Use the creator example instead |
| Dashboard | **Icon rail + decision cards** |
| Look | **Frosted glassmorphism**, an original layout that does not resemble the reference images |
| Imagery | Generated with **fal.ai**: GPT Image (images) and Seedance (video) |
| Build | 10+ agents, with model and effort matched to each task |

## 3. Persona and demo world

**Mira Lane (@mira)**, a lifestyle and travel vlogger based in Los Angeles. The handle stays `mira` so routes, OG images and tests keep working.

- Followers: YouTube 620K, Instagram 380K, TikTok 140K (1.14M total). This replaces X.
- Bio: "Slow travel, cheap flights, and the people I meet on the way. Six rooms where my viewers plan, shoot and explore together."
- Taste profile, promote: budget-honest travel, local guides by people who live there, solo-travel safety, small family-run food spots, collabs with a named owner and a date, beginner-friendly photo and editing tips.
- Taste profile, never: crypto and presales, bought followers and engagement pods, "free cruise" giveaways, MLM and dropshipping, paid reviews of places she has not been.
- Voice samples: three short lines in a warm, plain, first-person travel-vlog tone.

**Communities** (slug · name · icon · tint):

| slug | name | icon | tint |
|---|---|---|---|
| budget-travel | Budget Travel | wallet | peach |
| solo-travelers | Solo Travelers | backpack | lavender |
| travel-photography | Travel Photography | camera | aqua |
| food-finds | Food Finds | utensils | peach |
| road-trips | Road Trips & Van Life | car | white |
| slow-living | Slow Living | sunrise | lavender |

- **Team roles:** Local guide, Photographer, Video editor, Itinerary planner, Translator, Host, Illustrator.
- **Signals:** `use` reads "I'd use this", and `build` reads "Count me in" (the enum values stay).
- **Post status labels:** open "Open", forming_team "Finding a crew", building "In the works", launched "Made it" (the enum values stay).
- **Pitch types:** `investment` is renamed to `brand_deal`, labelled "Brand deal", through a Postgres `ALTER TYPE … RENAME VALUE` migration. Inbox tab `investment` becomes `brand_deals`.
- **Hero story:** fans in Budget Travel make **"Lisbon on $60 a day"**, a fan-made guide built by a local guide, a photographer, an editor and a planner. Mira features it in her vlog.
- **Spam examples:** "buy 10K followers", "free cruise giveaway, claim in 24h".
- **Demo fan:** Priya Shah, Austin, Solo Travelers + Food Finds.

All demo copy keeps the "Demo" label and the "Every name and number is made up" disclaimer.

Content sources to rewrite, so no developer-themed strings remain:

- `api/src/db/seed/generate-content.ts`: the clause banks, roles, pitches and space. Regenerate `data/*.json`.
- `api/src/ai/fake.ts` and `api/tests/fixtures/ai/*.json`
- `api/src/auth/demo.ts`
- `web/lib/fixtures/*.json`, `web/lib/seo.ts`, `web/lib/blog.ts`
- `web/components/landing/*-data.ts`, `web/components/onboarding/onboarding-templates.ts`
- Any other file a `rg -i "builders|gym-log|kapoor|frontend dev|investor"` sweep turns up

## 4. Visual system: "Golden Hour Frost"

This is an original system and must not track the reference screens. It replaces the "Clubhouse" pewter-shell rules in DESIGN.md.

- **Backdrop:** a page-wide aurora mesh (warm peach `#FFD9C2`, sky `#BFDDF7`, lilac `#DCCFF7`, mint `#CFEFE3`) on cream `#FBF7F2`, with a 3% grain overlay. It drifts slowly, and is static under reduced motion.
- **Frosted glass:** `backdrop-filter: blur(24px) saturate(160%)`, a white fill at 55–72% depending on the text it carries, a 1px `rgba(255,255,255,.7)` top-left inner highlight, a `0 20px 60px -20px rgba(40,30,60,.18)` shadow and a 24–28px radius. Where `backdrop-filter` is unsupported, fall back to a 92% white fill. Text on glass must reach WCAG AA.
- **Type:** Inter for UI and body text. **Instrument Serif** (Google, through `next/font`) for display headlines and the occasional italic accent word. Serif is only for display sizes ≥ 28px.
- **Colour:**
  - Ink `#1E1B26`, soft ink `#55506A`.
  - **Sunset coral** `#F0603A` is the single primary action per screen, with hover `#D94E2A`. White on coral must pass AA at button text size; otherwise use a darker coral.
  - Sky `#3B82C4` for links and info. Success `#15803D`. Warn ink `#A45A00`.
  - Pastel tints (peach, lavender, aqua) stay for community tiles.
  - Removed: the lime active fill, the purple primary button and the pewter 40px shell frame.
- **Active navigation:** a glass chip with an ink icon and a 3px coral dot. No lime fill.
- **Motion:** `motion` (already installed). Use spring card transitions, and nothing that loops forever in view.
- **Tokens:** define them in `web/app/globals.css` (Tailwind v4 `@theme`) and record them in DESIGN.md (rewrite) and DESIGN.json. Delete or replace the old tokens; do not keep two systems alive.

## 5. Landing (`/`)

New section order (round 4 final: Hero, Problem, How it works, For creators, For fans, Connect, Showcase, Trust, FAQ, Demo CTA last, above the footer; the numbered list below is the original draft). All copy uses the vocabulary swaps in §9.

1. **Hero.** Eyebrow "Fellow Owners: turn followers into fellow owners". H1 (serif): "Your fans have great ideas. Finally, a way to hear them." Sub: "One link in your bio gathers your followers into communities. AI finds the best ideas and people. You give them your spotlight." CTAs: Get started (coral), Enter as creator, Enter as fan. The centerpiece is a portrait of Mira in a frosted frame with three floating glass chips: a fan DM, "❤ Loved by Mira", and "Featured in this week's vlog". The sphere canvas (`hero-field.tsx`) is deleted.
2. **Problem.** "Thousands of DMs. Five that matter." Keep the scatter-then-filter mechanic and rewrite the cards in travel terms.
3. **"How it works: from follower to featured"** (was "One week with Mira"; replaces the loop video). A scroll-pinned story. The backdrop is Mira's vlog frames: a short Seedance clip, or five stills crossfading. Frosted cards step through Followers ("1.14M people follow Mira. Until now they were one number.") → Communities → Idea ("Lisbon on $60 a day") → Crew (4 roles filled) → Featured (vlog plus credits plus a click count). Reduced motion and no JavaScript get a static stack. Delete the 120-frame clay assets and the `loop-frames` code.
4. **For fans.** A phone mock-up of the bio page: join in 60 seconds, share an idea, join a crew, get "Loved by Mira".
5. **For creators.** The decision-card Today screen: "Your morning, sorted in minutes".
6. **New ways to connect.** The six features (§7), three for the creator and three for fans, as frosted tiles with live UI snippets.
7. **Made by Mira's fans.** The showcase strip with travel projects.
8. **You stay in charge.** The AI never acts on its own, fans are never scored in public, and every pick shows its reason.
9. **Demo CTA + FAQ.**

The current `features-grid` bento is removed. Nav links: For creators, For fans, How it works, FAQ.

## 6. Creator dashboard (`/dashboard/**`)

**Shell.**
- A narrow (72px) frosted icon rail on the left with tooltips, holding: Today, Fan ideas (inbox), Communities, Challenges, Fans (people), Spotlight (promote), Settings. Help and the avatar sit at the bottom.
- The top bar is a thin frosted strip with the page title (serif), search, notifications and a "View as fan" link.
- There is no outer pewter frame; content floats on the aurora.
- On mobile the rail becomes a bottom bar.

**Today** (decision cards):
- Header: "Good morning, Mira" and "5 things need you · about 6 min".
- **Card stack.** One large frosted card at a time, with the next one peeking. It holds a fan face, a name and community, one quote or summary, the reason ("Why: matches *budget-honest travel*"), a match label ("Strong match / Worth a look"), and the actions **Feature · Reply in my voice · ❤ Love · Later**. Keyboard: ←/→ to move, L to love, R to reply. The stack is built from the existing briefing picks plus top pitches and posts.
- **Right column:** a pulse sentence ("Budget Travel had its busiest week: 41 new ideas"), "Fans to thank" (the rising members with a Spotlight button), and community tiles.

**Lists** (Fan ideas, Ideas, Fans, Followers):
- The default view is a card list with face, name, quote, reason and match label. A "Table" toggle keeps the existing `data-table`.
- Fit numbers appear only in the side panel.
- CSV export moves to a `…` overflow menu.

**Labels:**
| Old | New |
|---|---|
| Inbox | Fan ideas |
| People | Fans |
| Promote | Spotlight |
| Asks | Challenges |
| Members | Fans |
| Projects | Collabs |

## 7. New features

All six reuse existing code where possible. The AI never sends anything to fans without the creator's click.

| # | Feature | Side | Build |
|---|---|---|---|
| F1 | **Reply in my voice** | creator | Wire the existing `ai/tasks/suggest-reply.ts` to `POST /api/studio/pitches/:id/suggest-reply` (owner only, rate-limited through `limits.service`). The UI is a "Draft in my voice" button in the reply box and on decision cards. The draft is editable and sent through the existing reply flow. |
| F2 | **Challenges** | creator → fans | Use the existing P1 `asks` table, with a migration adding `posts.ask_id` (nullable FK). Creator: create a challenge (title, prompt, community or all, due date). Fans: submit an entry (a post linked to the ask) from the community page. AI: the shortlist is the top 3 entries by the existing triage score plus signals, with reasons, stored in `asks.response_summary`. Close the challenge, then pick a winner, which goes to Spotlight. Notification `ask_posted` (it exists) fires to members. Pages: `/dashboard/challenges` and a challenge card in community feeds. |
| F3 | **Fan requests** | creator | Re-theme the existing question groups (`/dashboard/inbox/questions`) into "What fans want": repeated asks shown as content ideas with a count ("212 fans want a Japan budget guide"). "Make it" opens the Spotlight composer prefilled with the request. Still fixture-backed for the demo space, as the current Answer Once screen is (no API exists yet), so there is no notification to askers in this round. |
| F4 | **Loved by Mira** | fan | Migration: `posts.loved_at timestamptz`. Owner-only toggle `POST/DELETE /api/studio/posts/:id/love`. A badge on the post card and post page ("❤ Loved by Mira"). New notification kind `post_loved` goes to the author. |
| F5 | **Your idea made it** | fan | When a promotion is published, notify every accepted team member and the author (`project_featured`, already a kind). The showcase page credits each contributor by name and role in a "Made by" block. |
| F6 | **Fan spotlight** | fan | Migration: `memberships.spotlight_at timestamptz` and `memberships.spotlight_note text`. Creator: a "Spotlight" button on rising fans opens an AI-drafted shout-out (reuse the promote drafter's voice pipeline, short form), which the creator edits and approves. The bio page shows a "Fans of the week" wall (latest 6). Notification kind `spotlighted`. |

One migration (`0004_creator_pivot.sql`) carries:
- the pitch enum rename;
- `posts.ask_id` and `posts.loved_at`;
- the membership spotlight columns;
- the notification-kind CHECK update (`post_loved`, `spotlighted`, `challenge_shortlisted`).

## 8. Fan side

- **Bio page `/[handle]`:** Mira's cover photo with a frosted profile card, platform chips, communities as photo-cover cards, "Fans of the week", "Made by Mira's fans", and "Send Mira an idea" (coral).
- **Community `/[handle]/c/[slug]`:** a cover-photo header, an open challenge card pinned on top, and a feed of glass post cards with "Loved" badges.
- **Join, new post and pitch:** restyled with the vocabulary swap.
- **My space `/[handle]/me`:** the pitch tracker plus a "Your moments" list from notifications: loved, featured, spotlighted, challenge shortlisted.

## 9. Vocabulary swaps (site-wide copy)

| Remove | Use |
|---|---|
| triage, inbox triage | your briefing, the best of your DMs |
| fit score | match ("Strong match", "Worth a look"), plus a "why this one" line (creator side only) |
| pipeline | who's waiting for you |
| ship, shipped, build in public | make, made it, launch |
| pitch (fan-facing) | idea, ask ("Send Mira an idea") |
| taste profile | what you love, your style |
| members | fans, your people |
| project | collab, fan project |
| roles needed | open spots |
| promote | spotlight, give it your spotlight |
| tracked short link | a link that shows how it landed |
| dashboard | your space / studio |
| Investment | Brand deal |

## 10. Rest of the site

- **Auth, onboarding, legal, pricing, about, blog, contact, 404, error:** move to the new tokens, rail-free layouts and frosted panels.
- **Onboarding templates:** offer lifestyle, travel, food, fitness and music presets. The default is travel.
- **Auth and onboarding art:** replace with Mira photos (the clay art goes).
- **Dev kit pages** (`/(dev)/kit`): update the tokens only.

## 11. Imagery (fal.ai)

Images are generated with fal.ai (GPT Image for stills, Seedance for the hero and loop clip). This needs `FAL_KEY` set by the user in the environment; Claude never sees or stores the key value. Prompts and outputs are recorded in `prompt.md`.

Image style: realistic, warm golden-hour photography of a fictional woman creator in her late 20s, plus travel scenes. No real people, no logos, no text in images. Exports are WebP (≤ 250 KB for stills) in `web/public/creator/`.

| Asset | Count | Use |
|---|---|---|
| Mira portrait (hero, avatar) | 2 | hero card, `/demo/mira.jpg` replacement, OG |
| Vlog stills (Lisbon street, night market, van at coast, café laptop, mountain sunrise, hostel friends) | 6 | the One-week story, showcase, bio cover |
| Community covers | 6 | bio and community cards |
| Fan avatars | 6–8 | landing mock-ups (seeded users keep initials) |
| Auth/onboarding art | 1–5 | replaces the clay art |
| Seedance clip, 6–8 s, muted loop | 1 | One-week backdrop (poster frame = still) |

Until the files exist, components render soft gradient placeholders of the same aspect ratio, so layout never shifts.

## 12. Non-goals

- No new auth providers, payments or real social posting.
- No change to the core AI triage algorithm.
- No mobile apps.
- Do not delete existing table components (they remain behind the toggle).
- Do not touch the Neon database. Use local Docker Postgres and the per-agent test databases.

## 13. Acceptance

- `rg -i "builders|gym-log|kapoor|frontend dev|backend dev|ios dev|investment|investor"` returns no hits in the UI copy or seed data. Code identifiers and migrations are the only allowed exceptions.
- Landing has no sphere canvas, no clay video, and no 120-frame loop assets. The hero shows the creator example.
- The dashboard uses the icon rail and decision-card Today, and no screen shows a raw fit number outside a side panel.
- All six features work end to end on local Docker Postgres with the seeded demo (creator and fan demo sessions).
- `pnpm typecheck`, `pnpm lint` (allowing the known pre-existing a11y error), and API unit and integration tests pass; new endpoints have integration tests.
- Screenshots at 1440 and 390 widths of landing, Today, a list screen, the bio page, a community and a challenge are reviewed against this spec, and none resemble the Starline reference layout.
- Text on glass passes AA (spot-check with the contrast tool).
