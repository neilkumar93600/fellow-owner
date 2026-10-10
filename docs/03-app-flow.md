# 03 · App Flow

Status: draft v0.1 for review · Updated: 2026-10-01
Demo data used in examples: creator **Mira Kapoor** (`/mira`), communities Builders, Designers, Investors & Operators, Music & Creators, Fitness Crew, Local Impact. Demo fan: **Arjun**.

## 1. Entry points

| Entry | Comes from | Lands on |
|-------|-----------|----------|
| Bio link | Instagram, YouTube or X bio; video descriptions | `/{handle}` |
| Short link | A creator's promotion post | `/r/{code}` -> `/{handle}/s/{slug}` |
| Product landing | Direct visit, Startupathon submission | `/` |
| Email code | 6-digit code in email: confirms a new account's email on `/verify-otp`, resets a password on `/reset-password`, or signs a fan in inline in Join | `returnTo`, else `/dashboard` (a reset ends on `/login`) |
| Notification (P1) | In-app bell | The referenced item |

## 2. Screen inventory

### Public and fan

| Route | Screen | Purpose | Data | Access |
|-------|--------|---------|------|--------|
| `/` | Landing | Explain the product; Enter as creator; Enter as fan; Start your space | static | public |
| `/login` | Log in | Email or username + password, with "Forgot password?" beside the Password label; or Google, Apple, Facebook (Google hidden inside in-app browsers). Links to Create account and to the demo | none | public |
| `/create-account` | Create account | Google, Apple, Facebook, or name, email, username (checked live), optional social profile (platform + handle), password with a strength meter, confirm password, then the line confirming 18+ and agreeing to the Terms and Privacy Policy. No creator-or-fan question: the role is per space (`memberships.role`), not per account. `/sign-up` permanently redirects here (keeps `returnTo`) | none | public |
| `/verify-otp` | Confirm your email | 6-digit code, sent with the account's password (held from the screen before, or typed after a reload), confirms a new account's email and signs it in; a different password sends the person to reset it. Resend after 30s, 5 attempts. With no email in the tab, asks for it (and sends a new code unless one just went out) | email in session storage | public |
| `/forgot-password`, `/reset-password` | Password recovery | Email, then a 6-digit code and a new password typed twice; the reset signs out every session (01, Q8) | email in session storage | public |
| `/about`, `/contact` | Marketing (P1) | Who it's for, contact form | static | public |
| `/pricing`, `/blog` | Marketing (P2) | Plans, posts | static / MDX | public |
| `/privacy-policy`, `/terms`, `/cookies`, `/refunds` | Legal | Required before Google OAuth verification and any real pilot. Copy and tables come from `web/lib/legal.ts` and `shared/src/operator.ts` | static | public |
| `/{handle}` | Bio link page | Creator header and platforms, community cards with counts and Join, Send a pitch, Featured projects | space, communities, featured promotions | public |
| `/{handle}/join` | Join (3 steps) | 1 sign in, 2 intro + AI-suggested communities, 3 skills and links (skippable) | communities, suggestions | signed in |
| `/{handle}/c/{slug}` | Community feed | Tabs Ideas, Projects, Discussions (Asks in P1); New post | posts (cursor), counts | member |
| `/{handle}/p/{postId}` | Post detail | Body, status, roles needed, team, signals, comments, Join team; Similar ideas (P1) | post, team, comments | member |
| `/{handle}/new` | New post | Type, community, title, body, roles needed, links | member's communities | member |
| `/{handle}/pitch` | Send a pitch | Type, subject, body, links | none | signed in |
| `/{handle}/me` | My space | My posts, my teams, my pitches with creator replies | own items | member |
| `/{handle}/s/{slug}` | Showcase | Public page for a promoted project: "Featured by Mira", summary, team, links, Join CTA | promotion, post, team | public |
| `/r/{code}` | Redirect | Record click, redirect to showcase | none | public |

### Creator

| Route | Screen | Purpose | Data | Access |
|-------|--------|---------|------|--------|
| `/onboarding` | Create your space | 4 steps: handle and name, platforms and follower counts, communities (templates or AI-suggested), taste profile | none | signed in, no space |
| `/dashboard` | Today | Stat cards, This week card, AI briefing, inbox mix, top ideas, fanbase activity chart; setup checklist for new spaces | overview, briefing | owner |
| `/dashboard/inbox` | Inbox | Tabs All, Collabs, Investment, Ideas, Press, Fan notes, Filtered; sort Fit or Newest; status filter; side panel `?item=` | pitches (cursor) | owner |
| `/dashboard/ideas` | Ideas | Community count chips; Ranked or Board view; Promote | ranked posts | owner |
| `/dashboard/communities` | Communities | Pastel card per community; Add community; Most active analytics with 7/30 day toggle and score bar per community | communities + stats | owner |
| `/dashboard/communities/{slug}` | Community detail | Activity panel (score, rank, change vs previous period), Members, posts, digest (P1), rename, archive | community | owner |
| `/dashboard/people` | People | Tabs Members \| Followers; Members: rising contributors strip, members table with skills and contributions, search, Export CSV; Followers: roster with tags, add, import, tag, auto-tag, export | memberships, followers, communities | owner |
| `/dashboard/people/followers` | Followers | Add follower form, import panel (paste or upload CSV; AI suggests communities), roster with filters (community tag, untagged, joined), bulk tag, auto-tag, export CSV | followers, communities | owner |
| `/dashboard/promote` | Promote | Promotions list: drafts, live, clicks | promotions | owner |
| `/dashboard/promote/{postId}` | Promote composer | Drafts per platform, preview, Publish, Copy, Open in X, short link, clicks | post, drafts | owner |
| `/dashboard/asks` | Asks (P1) | Create ask, responses, AI summary | asks | owner |
| `/dashboard/settings` | Settings | Tabs Profile, Taste profile, Bio link (copy, QR), Import audience | space | owner |

Access "member" means a member of the space: they can read every community feed. Posting needs membership of that specific community. The creator sees the fan side as any member does. Fit scores and AI reasons appear only in `/dashboard`.

## 3. Primary journeys

**J1 · Fan joins and shares an idea**
`/mira` -> Join -> sign in (email code inline, Google outside in-app browsers, or demo) -> intro "frontend dev who lifts" -> AI preselects Builders and Fitness Crew -> Confirm -> skills and links (Skip allowed) -> `/mira/c/builders` -> New post (Idea) -> Publish -> idea at top of feed -> success: idea visible with signals at zero.

**J2 · Creator finds what matters**
Enter as creator -> `/dashboard` -> AI briefing highlights "Gym-log app for creators, by Arjun (fit 88)" with its reason -> open -> post side panel shows summary, fit reason, team, signals -> thumbs up on the highlight -> success: creator decides to promote (J3).

**J3 · Creator promotes**
Promote in the post side panel -> `/dashboard/promote/{postId}` -> drafts appear for X, Instagram, LinkedIn, YouTube -> edit the X draft -> Publish -> showcase page and short link created -> Copy or Open in X -> success: post shows "Featured by Mira" on the bio page; clicks counter starts at 0 and climbs.

**J4 · Pitch instead of a DM**
`/mira` -> Send a pitch -> sign in if needed -> type Collab, subject, body, links -> Send -> confirmation "Mira reviews pitches here. Replies show up in My space." -> creator Inbox, Collabs tab, fit 82 with reason -> Reply in side panel -> success: fan sees the reply in `/mira/me`.

**J5 · Fans collaborate**
Member opens a Project needing a Designer -> Join as Designer -> author sees the request on the project -> Accept -> success: member listed in team, role filled. P1: "People who could help" lists three more members by similarity.

**J6 · A new creator sets up (pilot)**
`/` -> Start your space -> `/create-account?returnTo=/onboarding` (email and password, then the 6-digit code on `/verify-otp` to confirm the email; or Google, Apple, Facebook) -> `/onboarding` 4 steps -> `/dashboard` with setup checklist -> Copy bio link -> success: `/{handle}` live and shareable.

**J7 · Three-minute judge path (demo mode)**
`/` -> Enter as creator -> Today (30s: briefing, stats) -> Inbox (30s: Filtered tab shows spam removed; open the top collab and its reason) -> Ideas (30s: ranked list, community chips) -> Promote the top idea (45s: drafts, Publish) -> open the showcase link (15s) -> back to `/` -> Enter as fan -> join flow with AI suggestions (30s).

## 4. Alternate journeys

- **Join abandoned mid-way:** no membership exists until communities are confirmed. Returning resumes at step 2.
- **Already a member taps Join:** goes straight to their first community.
- **Gated action while signed out** (Join, Pitch, Signal, Comment, Join team): redirect to `/login?returnTo=...`, then back to the action. Pitch drafts survive in sessionStorage.
- **Pitch from a non-member:** sending a pitch creates a space membership with no communities, so the reply has a home in My space.
- **Edit post:** author edits within 24 hours; analysis resets to pending.
- **Delete post:** author soft-deletes; the owner can hide.
- **Withdraw pitch:** allowed while status is New.
- **Promote:** drafts can be saved and left. Unpublish removes the showcase; the short link then shows "No longer featured" with a Join CTA.
- **Briefing:** Regenerate (max 5 a day); thumbs up or down on each highlight.
- **Filtered pitch:** Restore moves it to All.

## 5. Actions in detail

| Action | Trigger | Validation | Loading | Success | Error | Next |
|--------|---------|------------|---------|---------|-------|------|
| Check inbox | Auto-poll every 30s (creator + fan) | session valid | — | unread count and notification list shown in popover | count and list unavailable silently | stay |
| Get suggestions | "Suggest" or intro blur | intro >= 10 chars | skeleton chips | communities preselected with "AI suggested" chip | all communities unselected + "Suggestions unavailable" | confirm |
| Join space | Confirm (step 2) | >= 1 community; intro <= 280 | button spinner | toast "Welcome in", counts update | inline error, Retry | step 3 |
| Publish post | Publish | member of community; title 5..120; body 20..5000; roles <= 5; links <= 5 http(s); 20 a day | button spinner | optimistic insert at top of feed | toast, form kept | feed |
| Signal | "I'd use this" / "I'd help build" | member; not own post | optimistic count | persisted | count reverts, toast | stay |
| Comment | Send | 1..2000 chars; 100 a day | optimistic | in thread | reverts, toast | stay |
| Request team role | "Join as {role}" | role open; not already on team | spinner | status Requested | toast | stay |
| Accept or decline | Author taps | post author only | spinner | team list updates | toast | stay |
| Send pitch | Send | type; subject 5..120; body 20..3000; links <= 3; 5 a day per space | spinner | confirmation screen | inline errors or cap message | My space |
| Change pitch status | Shortlist, Archive, Restore | owner | optimistic | row moves tab or badge | reverts, toast | stay |
| Reply to pitch | Send in side panel | 1..2000 chars | spinner | status Replied; visible to sender | toast | next item |
| Generate drafts | Promote | owner; post not hidden | skeleton per platform | drafts shown | per-platform "Couldn't draft" + Retry | edit |
| Publish promotion | Publish | at least one non-empty draft | spinner | showcase URL and short link shown | toast | stay |
| Copy / Open in X | Buttons | none | none | clipboard toast / new tab with intent text + short link `?p=x` | none | stay |
| Save taste profile | Save | promote 1..10 lines, never 0..10, each <= 120 chars; voice 0..5 samples, each <= 600 | spinner | toast; taste version +1 | inline errors | stay |
| Import followers | Upload CSV or paste | 1..500 rows; name, handle, email, platform, note columns | spinner | ImportResult with created, duplicates, skipped, errors, suggestions if >= 5 notes and suggest=true | row errors listed (first 50): invalid email, invalid handle, no name, handle or email; "Your follower list is full" past 5000 followers | stay |
| Suggest communities | "Create" in import suggestions | >= 5 notes exist | spinner | communities list for the creator to pick | suggestions unavailable silently, list empty | create or close |
| Add follower | "Add" button | name 1..80, email unique per space, handle unique per space + platform | spinner | follower added, linked if email/handle matches a member | 409 on a duplicate email or handle; name required | stay |
| Tag followers | Select + bulk tag | 1..500 selected; community active | spinner | tagged count | community not found or archived: 400 error | stay |
| Auto-tag followers | "AI" button | untagged followers (up to 500) with a note | spinner | AutoTagResult: tagged count, skipped, aiPaused flag | if AI unavailable or capped, aiPaused=true, no error | stay |
| Export CSV | "Export" button | owner | attachment download | CSV file sent as text/csv with attachment filename | none | stay |
| Create space | Finish onboarding | handle 3..30 `[a-z0-9_.]`, unique, not reserved; >= 1 community | spinner | redirect to Today | "Handle taken" + 3 suggestions | Today |
| Enter demo | Enter as creator or fan | `DEMO_ENABLED` | button spinner | session set | toast "Demo unavailable" | Today or `/mira` |

## 6. Navigation rules

- **Creator:** fixed sidebar: Today, Inbox, Ideas, Communities, People, Promote, Asks (P1), Settings, Help. Active item is lime.
- Tabs, sorts and filters live in the URL (`?tab=collabs&sort=fit`), so every view is linkable and Back works.
- Side panels open with `?item={id}`; Esc or Back closes them.
- **Fan:** top bar with creator avatar (back to `/{handle}`), community switcher as horizontal pills, floating "New post" on phones, "My space" in the avatar menu.
- **Deep links:** every route loads directly; member-only routes send non-members to Join with `returnTo`.
- **Demo mode:** a "Switch to fan view / creator view" pill sits in the header.

## 7. Empty and blocked states

| State | Where | User sees |
|-------|-------|-----------|
| New space, no members | Today | Setup checklist; bio link with Copy and QR; Import audience (P1) |
| No pitches | Inbox | "No pitches yet. Your bio link has a Send a pitch button." + link preview |
| AI pending | Any AI field | Shimmering "AI reviewing" chip; the item is fully usable |
| AI failed 3 times | Item | Grey "Not analyzed" chip with Retry (owner) |
| AI budget reached | Dashboard banner | "AI paused until tomorrow. New items will be analyzed then." |
| Not a member | Community or post | First 3 post titles, the rest blurred, Join CTA |
| Not the owner | `/dashboard/*` | `/onboarding` if no space, otherwise a 403 page |
| Unknown handle | `/{handle}` | 404 with "Start your own space" |
| Promotion unpublished | `/r/{code}` | "No longer featured" + Join CTA |
| Daily cap reached | Post or pitch form | "You've reached today's limit of 5 pitches to Mira. Try again tomorrow." |
| Network error | Any mutation | Toast with Retry; optimistic changes revert |

## 8. First-use journeys

**Fan:** bio page -> Join (3 steps, under 60 seconds) -> first community with a one-time tip card: "Share an idea, or tap I'd help build on something you like."

**Creator:** `/onboarding` (4 steps) -> Today with a checklist: 1 Copy your bio link, 2 Review your taste profile (prefilled from onboarding), 3 Invite your first 10 fans (share text provided), 4 Import your audience (P1). The checklist hides after three items are done.
