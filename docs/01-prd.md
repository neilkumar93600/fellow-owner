# 01 · Product Requirements Document (PRD)

Status: draft v0.1 for review · Owner: Nilesh · Updated: 2026-10-01
Inputs: Startupathon brief "Operating System for Fanbases", Persist briefing video (Jack, Vikas), `design-reference/`.

## 1. Product name and one-sentence idea

**Fellow Owners** (working name, from "followers to fellow owners" in the briefing).
One link in a creator's bio that turns followers into interest-based communities, uses an AI version of the creator to surface the ideas, people and opportunities worth their time, and lets the creator put their reach behind what the community builds.

## 2. Target users

| User | Who | What they need |
|------|-----|----------------|
| Creator (primary, account owner) | 100K to 2M followers across YouTube, Instagram, X. Solo or with one manager. Audience includes skilled people: developers, designers, investors, musicians, athletes. | See who is actually in their audience, find the few messages and projects that matter, and give the audience something to do besides like and comment. |
| Member (fan) | Follows the creator, has a skill or an idea, has often tried DMing already. | A place where they are seen, peers with the same interests, and a credible path to get their work in front of the creator. |
| Judge or pilot reviewer | Persist team, a real creator trying it. | Understand the value in under three minutes with no setup. |

## 3. Problem and current workaround

A creator at 700K followers gets thousands of DMs, comments and requests a week. Collaboration offers, investable projects and talented people sit in the same pile as spam and fan mail, so most go unread. The audience has real skills and shared interests but no structure to find each other or act together.

| Workaround today | Why it falls short |
|------------------|--------------------|
| Reading DMs by hand or handing them to a manager | Slow, inconsistent, loses context |
| Paid DMs | Filters by willingness to pay, not by quality. The briefing rejects this explicitly |
| Discord or Telegram groups | Get noisy fast; the creator cannot keep up with channels |
| Link-in-bio pages, Google Forms | One-way, no community, no ranking |

## 4. Goal and success measures

**Goal:** a creator's audience moves Followers -> Organized communities -> Ideas -> Collaboration -> Action, while the creator spends minutes, not hours, staying on top of it.

**Challenge-level success (by submission)**
- A judge goes from the landing page to a promoted community project in under 3 minutes using demo mode.
- At least one real creator pilots their own space, and at least one change from their feedback ships. The briefing names this as the strongest selection signal.

**Product signals during the pilot** (targets are hypotheses to validate)

| Signal | Measured as | Target |
|--------|-------------|--------|
| Join rate | members joined / unique bio-link visitors | >= 15% |
| Creator review time | daily time on Today + Inbox | <= 10 min to clear top picks |
| AI agreement | thumbs up / (up + down) on AI picks | >= 70% |
| Collaboration | projects with >= 2 accepted team members / all projects | >= 25% |
| Action | community projects promoted per pilot week | >= 1 |
| Promotion reach | tracked clicks per promoted project in first 72h | baseline only in v1 |

## 5. Core features

P0 = required for the MVP demo and pilot. P1 = build in this order if time allows before submission. P2 = after submission.

### Organize
| # | Feature | User benefit | Priority |
|---|---------|--------------|----------|
| F1 | Bio link page `/{handle}` | One link replaces DMs: communities, featured projects, a way to pitch | P0 |
| F2 | Join flow with AI community suggestions | Fan writes one line about themselves, AI suggests communities, joining takes under a minute | P0 |
| F3 | Creator onboarding (create a space) | A real creator sets up a space in under 5 minutes: handle, platforms, communities, taste profile | P0 |
| F4 | Communities management | Create, rename, archive communities; members and growth per community | P0 |

### Share and collaborate
| # | Feature | User benefit | Priority |
|---|---------|--------------|----------|
| F5 | Community feed with posts (Idea, Project, Discussion) | Members share ideas and see what peers build | P0 |
| F6 | Comments and signals ("I'd use this", "I'd help build") | Cheap, meaningful feedback that also feeds ranking | P0 |
| F7 | Teams on projects (roles needed, request, accept) | Members form teams around ideas | P0 |
| F8 | Structured pitch to the creator (collab, investment, idea, press, fan note) | Replaces DMs, arrives pre-sorted | P0 |

### AI layer
| # | Feature | User benefit | Priority |
|---|---------|--------------|----------|
| F9 | Per-item triage: spam filter, one-line summary, category check, fit score with reason | Noise disappears; every item says why it matters | P0 |
| F10 | Taste profile (what I promote, what I never promote, voice samples) | The AI judges like the creator, not like a generic model | P0 |
| F11 | Today briefing: daily AI digest with highlighted ideas, people, opportunities | The state of the fanbase on one screen | P0 |
| F12 | Community digests | One paragraph per community | P1 |
| F13 | Ask your AI (chat over community data) | "Which developer projects fit my brand this week?" | P1 |

### Discover
| # | Feature | User benefit | Priority |
|---|---------|--------------|----------|
| F14 | Creator inbox: tabs, sort by fit, statuses, side panel with AI reason, in-app reply | Minutes to clear what used to take hours | P0 |
| F15 | Ideas board ranked by fit, signals and recency | The best community projects rise | P0 |
| F16 | People view: rising contributors, skill search | Find talent inside the audience | P0 |
| F17 | Similar ideas and "people who could help" on a project | Connects members to each other | P1 |

### Act
| # | Feature | User benefit | Priority |
|---|---------|--------------|----------|
| F18 | Promote: AI drafts per platform in the creator's voice, editable, copy or open in X | Promotion takes a minute | P0 |
| F19 | Public showcase page and tracked short link with click counts | The creator sees what their push did; the project gets a real landing page | P0 |
| F20 | Asks: creator posts a request to one or all communities, members respond, AI summarizes | Coordination runs both ways | P1 |
| F21 | In-app notifications (reply received, project featured, team request) | Members know when something happened | P1 |

### Pitch loop (designed 2026-10-03, spec `docs/superpowers/specs/2026-10-03-pitch-loop-design.md`)
| # | Feature | User benefit | Priority |
|---|---------|--------------|----------|
| F30 | Idea Coach: on-demand clarity checklist and a suggested rewrite on the pitch and post forms; never a score | Fans send clearer pitches; the creator reads better ones | P1 |
| F31 | Pitch Tracker: Sent, Read, Shortlisted, Replied on each pitch; read receipts are the creator's choice | Fans see their pitch has a path; fewer "did you see my DM?" follow-ups | P1 |
| F32 | Answer Once: repeated questions grouped from pitches; one answer replies to everyone and can be pinned | The creator answers 38 people in one go | P1 |
| F33 to F37 | Reserved: Taste Swipe, Audience Pulse, Away Mode (batch 2); Team Matchmaker, Weekly Shout-out (batch 3) | | P1 |

### Platform
| # | Feature | User benefit | Priority |
|---|---------|--------------|----------|
| F22 | Demo mode: one-click "Enter as creator" / "Enter as fan" on seeded data, reset daily | Judges never wait on email | P0 |
| F23 | Import audience: paste comments or upload CSV, AI proposes communities | Solves cold start for a new creator | P1 |
| F24 | YouTube channel comment import via API | Same as F23 with less effort | P2 |
| F25 | Moderation basics: creator hides posts, removes members; members report | Keeps spaces usable | P1 |
| F26 | Dark mode | Matches the theme toggle in the reference header | P2 |
| F27 | Account pages: log in (email or username + password), create account, confirm email (6-digit code), forgot and reset password (code); Google, Apple and Facebook sign-in | Works inside in-app browsers where fans arrive: codes instead of links, Google hidden there | P0 |
| F28 | Legal pages: privacy policy, terms, cookies | Needed for Google sign-in verification and a real pilot | P0 |
| F29 | Marketing pages: about, contact (P1); pricing, blog (P2) | Explains the product to creators who find it outside the bio link | P1 / P2 |

### Traceability to the brief

| Expectation | Covered by |
|-------------|------------|
| Organize followers into interest-based communities | F1, F2, F3, F4, F23 |
| Let members share ideas and collaborate | F5, F6, F7, F17 |
| Use AI to filter, summarize, and surface valuable activity | F9, F10, F11, F12, F13 |
| Discover promising ideas, people, and opportunities | F14, F15, F16 |
| Choose and promote community-driven ideas to the wider audience | F18, F19 |
| Video: an AI version of the influencer | F10, F11, F13 |
| Video: the influencer coordinates the fanbase | F20 |
| Video: a link people go through from the bio | F1 |

## 6. Out of scope for version one

- Paid DMs, tipping, subscriptions, any payments.
- Equity, revenue share or ownership mechanics for community projects. "Fellow owners" is the direction; the legal and financial design comes after the MVP.
- Posting to social platforms through their APIs. v1 copies text and opens share intents.
- Private 1:1 messaging between members. Collaboration happens in comments and teams.
- Native mobile apps. The fan side is a mobile-first web app.
- Multiple creators per account, team seats, agency views.
- The network designing its own dashboard (a future feature in the briefing).
- Real-time chat, video uploads, livestreams.
- Languages other than English.

## 7. User stories

- **US1** As a fan, I want to join my favorite creator's communities from their bio link, so I can meet people with the same interests.
- **US2** As a fan, I want to post an idea in a community and see who would use it or help build it, so I can tell whether it is worth pursuing.
- **US3** As a fan, I want to join a project team in a role that matches my skills, so I can build something with peers.
- **US4** As a fan, I want to pitch a collaboration through a structured form, so my message is read instead of lost in DMs.
- **US5** As a creator, I want a short briefing of what happened across my communities, so I stay on top of my fanbase in minutes.
- **US6** As a creator, I want every pitch ranked by fit with what I care about, with the reason, so I can trust what I skip.
- **US7** As a creator, I want to describe what I would and would not promote, so the AI judges like I would.
- **US8** As a creator, I want to find members with specific skills, so I can bring them into projects or my own work.
- **US9** As a creator, I want to promote a community project with drafts in my voice and see how many people clicked, so promotion is fast and measurable.
- **US10** As a creator, I want to set up my own space, so I can put the link in my bio today.
- **US11** As a judge, I want to explore both sides with one click, so I can evaluate the product in three minutes.

## 8. Acceptance criteria

- **AC1 (US1)** Given a signed-out visitor on `/mira`, when they tap Join, sign in, write an intro and confirm communities, then they land on their first community feed as a member and the member counts on the bio page include them.
- **AC2 (US1)** Given the intro "frontend dev who lifts", when suggestions load, then Builders and Fitness Crew are suggested, within 5 seconds; if the AI fails, all communities show unselected with the note "Suggestions unavailable".
- **AC3 (US2)** Given a member of Builders, when they publish an idea (title 5 to 120 chars, body 20 to 5,000), then it appears at the top of the feed at once, and the creator sees its summary and fit score within 15 seconds (p90). Members never see AI fields (see AC17).
- **AC4 (US2)** Given an idea, when a member taps "I'd help build", then the count rises by one once per member, and tapping again removes their signal. Members cannot signal their own post.
- **AC5 (US3)** Given a project needing a Designer, when a member requests that role and the project author accepts, then the member shows in the team and the role is marked filled.
- **AC6 (US4)** Given a signed-in member, when they submit a Collab pitch, then within 15 seconds it appears in the creator's Inbox under Collabs (or under the AI-corrected type with a "re-categorized" note) with a fit score and reason.
- **AC7 (US4)** Given a pitch the AI flags as spam, then it appears only in the Filtered tab, and the creator can restore it to All with one click.
- **AC8 (US5)** Given the creator opens Today, then the briefing shows 3 to 5 highlights, each linking to its source item with a one-line reason; the briefing is cached for the day and has a Regenerate action (max 5 a day).
- **AC9 (US6)** Given pitches in the Inbox sorted by Fit, then they appear in descending fit score, and each item's reason refers to the taste profile.
- **AC10 (US7)** Given the creator saves a changed taste profile, then new items are scored against it, and older items show "Scored with an older profile" with a Rescore action.
- **AC11 (US8)** Given the People view, when the creator searches "figma", then members whose skills or posts mention Figma are listed, ranked by contribution.
- **AC12 (US9)** Given an idea, when the creator taps Promote, then editable drafts for X, Instagram, LinkedIn and a YouTube community post appear within 20 seconds, and Publish creates a showcase page and a short link.
- **AC13 (US9)** Given a published promotion, when anyone opens the short link, then they land on the showcase page and the click count on the Promote screen increases on the next refresh.
- **AC14 (US10)** Given a signed-in user with no space, when they finish onboarding with a free handle, then `/{handle}` is live with their communities and Today shows a setup checklist.
- **AC15 (US11)** Given the landing page, when the visitor taps "Enter as creator", then Today loads with seeded data in under 3 seconds, with no email step.
- **AC16 (all AI)** Given the LLM provider is down, when items are created, then they save, show "AI pending", and are analyzed by the next sweep once the provider is back.
- **AC17 (privacy)** Fit scores and reasons are visible only to the creator. Members never see each other's email addresses.

## 9. Open questions

| # | Question | Default if unanswered |
|---|----------|-----------------------|
| Q1 | Submission deadline? It decides how much P1 ships | P0 first, then P1 in listed order |
| Q2 | A creator to pilot with before submission? | Build onboarding (F3) early so any creator can try it |
| Q3 | LLM provider, and whose key? | Configurable; default OpenAI, since one key covers chat and embeddings |
| Q4 | Final name and domain (the video mentions a "fellow owners" domain) | "Fellow Owners"; confirm the exact domain with Persist |
| Q5 | Must fans sign in to pitch? | Yes: cuts spam and gives replies a home |
| Q6 | Postgres host: Supabase or Neon? | Supabase, used only as Postgres |
| Q7 | Community content public or members-only? | Members-only, except projects the creator promotes (public showcase) |
| Q8 | Password sign-in as well as email codes? If yes, forgot and reset password pages ship too | **Decided by the product owner, 2026-10-02: yes.** Passwords and usernames ship: log in with email or username + password, a new email account confirms its email with a 6-digit code, and forgot and reset password work by code. The age floor is 18 (`MIN_AGE`) |

## 10. MVP run: built 2026-10-06

Every dashboard and fan screen now reads the real API. Built in this run, checked against the code:
- **F21 In-app notifications.** Kinds: idea_posted, pitch_received, comment_received, reply_received, project_featured, team_request, team_decision (ask_posted is reserved for Asks). Creator and fan bells poll the unread count every 30 seconds; the popover lists newest first with a "Mark all read" action.
- **F23 Import audience.** Followers roster (owner only) with manual add, CSV upload or pasted lines (up to 500 rows per import), AI community suggestions when at least 5 rows have notes, and tagging into communities by the creator or by the AI (auto-tag from notes).
- **Community activity analytics.** Score, change against the previous period and counts per community with a 7 or 30 day toggle on Communities, an activity panel on the community detail page, and the top 5 on Today.
- **CSV export** of ideas, people, followers and pitches from each list's toolbar.

Not built, despite the feature table: F25 members report (hide and remove exist; there is no report endpoint). F31 Pitch Tracker is partly built: fan-side statuses yes; the creator's read-receipts setting no, since `showReadReceipts` is not in the API settings schema.

Follow-ups:
- **Realtime notifications:** SSE or websocket instead of 30 second polling.
- **YouTube import (F24):** comment API integration (P2).
- **Asks (F20):** creator posts requests to one or all communities; members respond; AI summarizes.
- **Pitch loop backend (F30 to F32):** Idea Coach, Pitch Tracker (creator side), Answer Once.
- **Promotions tabs** filter only the loaded page; they need a state param on the API.
- **Auto-tag** re-sends followers the AI left untagged on every run.
