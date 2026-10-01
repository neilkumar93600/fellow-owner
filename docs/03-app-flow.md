# 03 · App Flow

Status: draft v0.1 for review · Updated: 2026-10-01
Demo data used in examples: creator **Mira Kapoor** (`/mira`), communities Builders, Designers, Investors & Operators, Music & Creators, Fitness Crew, Local Impact. Demo fan: **Arjun**.

## 1. Entry points

| Entry | Comes from | Lands on |
|-------|-----------|----------|
| Bio link | Instagram, YouTube or X bio; video descriptions | `/{handle}` |
| Short link | A creator's promotion post | `/r/{code}` -> `/{handle}/s/{slug}` |
| Product landing | Direct visit, Startupathon submission | `/` |
| Sign-in code | 6-digit code in email, typed on `/verify-otp` or inline in Join | `returnTo`, else `/dashboard` (owners) or `/{handle}` (members) |
| Notification (P1) | In-app bell | The referenced item |

## 2. Screen inventory

### Public and fan

| Route | Screen | Purpose | Data | Access |
|-------|--------|---------|------|--------|
| `/` | Landing | Explain the product; Enter as creator; Enter as fan; Start your space | static | public |
| `/login` | Sign in | Email (code sent) or Google; Google hidden inside in-app browsers | none | public |
| `/sign-up` | Sign up | Name + email, then code. Same backend step as sign in | none | public |
| `/verify-otp` | Verify code | 6-digit code, resend after 30s, 5 attempts | email in session storage | public |
| `/forgot-password`, `/reset-password` | Password recovery | Only if password sign-in is turned on (01, Q8) | none | public |
| `/about`, `/contact` | Marketing (P1) | Who it's for, contact form | static | public |
| `/pricing`, `/blog` | Marketing (P2) | Plans, posts | static / MDX | public |
| `/privacy-policy`, `/terms`, `/cookies` | Legal | Required before Google OAuth verification and any real pilot | static | public |
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
| `/dashboard/communities` | Communities | Pastel card per community; Add community | communities + stats | owner |
| `/dashboard/communities/{slug}` | Community detail | Members, posts, digest (P1), rename, archive | community | owner |
| `/dashboard/people` | People | Rising contributors strip; members table with skills and contributions; search | memberships | owner |
| `/dashboard/promote` | Promote | Promotions list: drafts, live, clicks | promotions | owner |
| `/dashboard/promote/{postId}` | Promote composer | Drafts per platform, preview, Publish, Copy, Open in X, short link, clicks | post, drafts | owner |
| `/dashboard/asks` | Asks (P1) | Create ask, responses, AI summary | asks | owner |
| `/dashboard/settings` | Settings | Tabs Profile, Taste profile, Bio link (copy, QR), Import audience (P1) | space | owner |

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
`/` -> Start your space -> sign in -> `/onboarding` 4 steps -> `/dashboard` with setup checklist -> Copy bio link -> success: `/{handle}` live and shareable.

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
