# 03 · App Flow

Status: draft v0.2 for review · Updated: 2026-10-10
Demo data used in examples: creator **Mira Lane** (`/mira`), a travel creator; communities Budget Travel, Solo Travelers, Travel Photography, Food Finds, Road Trips & Van Life, Slow Living. Demo fan: **Priya Shah**.

## 1. Entry points

| Entry | Comes from | Lands on |
|-------|-----------|----------|
| Bio link | Instagram, YouTube or X bio; video descriptions | `/{handle}` |
| Short link | A creator's promotion post | `/r/{code}` -> `/{handle}/s/{slug}` |
| Product landing | Direct visit, Startupathon submission | `/` |
| Email code | 6-digit code in email: confirms a new account's email on `/verify-otp`, resets a password on `/reset-password`, or signs a fan in inline in Join | `returnTo`, else `/dashboard` (a reset ends on `/login`) |
| Notification | In-app bell, or the hourly email digest | The referenced item |
| Get started | The navbar and hero button, `/start` | Today (signed in with a space), `/onboarding` (signed in, no space), else `/create-account?returnTo=/onboarding` |
| Email footer | Unsubscribe link in a notification email, confirm or unsubscribe link in a newsletter email. Opening a link changes nothing (mail scanners open every link); the page's button does | `/email-preferences?token=`, `/newsletter/confirm?token=`, `/newsletter/unsubscribe?token=`, then `/newsletter/{status}` |

## 2. Screen inventory

### Public and fan

| Route | Screen | Purpose | Data | Access |
|-------|--------|---------|------|--------|
| `/` | Landing | Explain the product; Enter as creator; Enter as fan; Start your space (`/start`) | static | public |
| `/login` | Log in | Email or username + password, with "Forgot password?" beside the Password label; or Google, Apple, Facebook (Google hidden inside in-app browsers). Links to Create account and to the demo | none | public |
| `/create-account` | Create account | Google, Apple, Facebook, or name, email, username (checked live), optional social profile (platform + handle), password with a strength meter, confirm password, then the line confirming 18+ and agreeing to the Terms and Privacy Policy. No creator-or-fan question: the role is per space (`memberships.role`), not per account. `/sign-up` permanently redirects here (keeps `returnTo`) | none | public |
| `/verify-otp` | Confirm your email | 6-digit code, sent with the account's password (held from the screen before, or typed after a reload), confirms a new account's email and signs it in; a different password sends the person to reset it. Resend after 30s, 5 attempts. With no email in the tab, asks for it (and sends a new code unless one just went out) | email in session storage | public |
| `/forgot-password`, `/reset-password` | Password recovery | Email, then a 6-digit code and a new password typed twice; the reset signs out every session (01, Q8) | email in session storage | public |
| `/about`, `/contact` | Marketing | Who it's for; contact and privacy request form (`POST /api/support/requests`) | static | public |
| `/pricing`, `/blog` | Marketing (P2) | Plans, posts | static / MDX | public |
| `/privacy-policy`, `/terms`, `/cookies` | Legal | Required before Google OAuth verification and any real pilot. Copy and tables come from `web/lib/legal.ts` and `shared/src/operator.ts`. `/refunds` redirects to `/terms#refunds` | static | public |
| `/{handle}` | Bio link page | Creator header and platforms, community cards with counts and Join, Send a pitch, Featured projects | space, communities, featured promotions | public |
| `/{handle}/join` | Join (3 steps) | 1 sign in, 2 intro + AI-suggested communities, 3 skills and links (skippable) | communities, suggestions | signed in |
| `/{handle}/c/{slug}` | Community feed | Tabs Ideas, Projects, Discussions; open challenges; New post | posts (cursor), counts | member |
| `/{handle}/p/{postId}` | Post detail | Body, status, roles needed, team, signals, comments, Join team, Report, Similar ideas | post, team, comments | member |
| `/{handle}/new` | New post | Type, community, title, body, roles needed, links; Idea Coach checklist and rewrite; `?challenge=` posts a challenge entry | member's communities | member |
| `/{handle}/pitch` | Send a pitch | Type, subject, body, links; Idea Coach | none | signed in |
| `/{handle}/me` | My space | My posts, my teams, my pitches with a Sent, Read, Shortlisted, Replied tracker and creator replies, spotlight moments, Leave this space | own items | member |
| `/account` | Account | Change password (signs out other sessions), email preferences, export my data, delete account (a 6-digit code is emailed first) | user | signed in |
| `/email-preferences` | Email preferences | Landing for the unsubscribe link in a notification email: with `?token=` an Unsubscribe button (POSTs the token, then `?status=unsubscribed` or `?status=invalid`); the email switches for a signed-in person | signed token | public |
| `/newsletter/confirm`, `/newsletter/unsubscribe` | Newsletter confirm / unsubscribe | Landing for the newsletter email links: a button POSTs the token | signed token | public |
| `/newsletter/{status}` | Newsletter notice | Result of confirming or leaving the newsletter (`confirmed`, `unsubscribed`, `invalid`) | none | public |
| `/{handle}/s/{slug}` | Showcase | Public page for a promoted project: "Featured by Mira", summary, team, links, Join CTA | promotion, post, team | public |
| `/r/{code}` | Redirect | Record click, redirect to showcase | none | public |

### Creator

| Route | Screen | Purpose | Data | Access |
|-------|--------|---------|------|--------|
| `/onboarding` | Create your space | 4 steps: handle and name, platforms and follower counts, communities (templates or AI-suggested), taste profile | none | signed in, no space |
| `/dashboard` | Today | Decision cards (pitches and ideas to decide on, with Later), stat cards, AI briefing, Ask your AI, fans to thank, reports notice, metrics, setup checklist for new spaces | overview, briefing, snoozes | owner |
| `/dashboard/inbox` | Fan mail | Tabs All, Collabs, Investment, Ideas, Press, Fan notes, Filtered; sort Fit or Newest; status filter; side panel `?item=` with AI reason, Draft in my voice, in-app reply; a strip of repeated questions | pitches (cursor), question groups | owner |
| `/dashboard/inbox/questions` | What fans want | Answer Once: groups of pitches asking the same thing, an AI-drafted answer to edit, send to every asker, pin as a post in chosen communities, redraft, dismiss, remove an asker | question groups | owner |
| `/dashboard/ideas` | Ideas | Community count chips; Ranked or Board view; Promote; Loved by; similar ideas | ranked posts | owner |
| `/dashboard/communities` | Communities | Pastel card per community with cover; Add community; Most active analytics with 7/30 day toggle and score bar per community; link to Reports | communities + stats | owner |
| `/dashboard/communities/{slug}` | Community detail | Activity panel (score, rank, change vs previous period), Members, posts, weekly digest, rename, cover, archive | community | owner |
| `/dashboard/communities/reports` | Reports | Open reports on posts and comments; Resolve or Dismiss; hide the comment | reports | owner |
| `/dashboard/people` | Fans | Tabs Members \| Followers; Members: rising contributors strip, members table with skills and contributions, search, Fans of the week (draft a shout-out, approve, clear), remove, Export CSV; Followers: roster with tags, add, import, tag, auto-tag, export | memberships, followers, communities | owner |
| `/dashboard/people/followers` | Followers | Add follower form, import panel (paste, upload CSV, or YouTube comments; AI suggests communities), roster with filters (community tag, untagged, joined), bulk tag, auto-tag, export CSV | followers, communities | owner |
| `/dashboard/promote` | Spotlight | Promotions list: drafts, live, clicks | promotions | owner |
| `/dashboard/promote/{postId}` | Promote composer | Drafts per platform, preview, Publish, Copy, Open in X, short link, clicks | post, drafts | owner |
| `/dashboard/challenges` | Challenges | Create a challenge (title, body, community or all, due date); open and closed list | asks | owner |
| `/dashboard/challenges/{id}` | Challenge | Entries, countdown, Close, pick a winner, AI recap and shortlist after closing. `/dashboard/asks` redirects here | ask, entries | owner |
| `/dashboard/settings` | Settings | Tabs Profile (with cover and avatar upload and the read-receipts toggle), Taste profile, Bio link (copy, QR), Import audience | space | owner |

Access "member" means a member of the space: they can read every community feed. Posting needs membership of that specific community. The creator sees the fan side as any member does. Fit scores and AI reasons appear only in `/dashboard`.

## 3. Primary journeys

**J1 · Fan joins and shares an idea**
`/mira` -> Join -> sign in (email code inline, Google outside in-app browsers, or demo) -> intro "solo traveler who plans every trip around food" -> AI preselects Solo Travelers and Food Finds -> Confirm -> skills and links (Skip allowed) -> `/mira/c/solo-travelers` -> New post (Idea; the Idea Coach can check the draft first) -> Publish -> idea at top of feed -> success: idea visible with signals at zero.

**J2 · Creator finds what matters**
Enter as creator -> `/dashboard` -> AI briefing highlights a fan-built trip planner with its fit score and reason -> open -> post side panel shows summary, fit reason, team, signals -> thumbs up on the highlight -> success: creator decides to promote (J3).

**J3 · Creator promotes**
Promote in the post side panel -> `/dashboard/promote/{postId}` -> drafts appear for X, Instagram, LinkedIn, YouTube -> edit the X draft -> Publish -> showcase page and short link created -> Copy or Open in X -> success: post shows "Featured by Mira" on the bio page; clicks counter starts at 0 and climbs.

**J4 · Pitch instead of a DM**
`/mira` -> Send a pitch -> sign in if needed -> type Collab, subject, body, links -> Send -> confirmation "Mira reviews pitches here. Replies show up in My space." -> creator Inbox, Collabs tab, fit 82 with reason -> Reply in side panel -> success: fan sees the reply in `/mira/me`.

**J5 · Fans collaborate**
Member opens a Project needing a Designer -> Join as Designer -> author sees the request on the project -> Accept -> success: member listed in team, role filled. P1: "People who could help" lists three more members by similarity.

**J6 · A new creator sets up (pilot)**
`/` -> Start your space -> `/create-account?returnTo=/onboarding` (email and password, then the 6-digit code on `/verify-otp` to confirm the email; or Google, Apple, Facebook) -> `/onboarding` 4 steps -> `/dashboard` with setup checklist -> Copy bio link -> success: `/{handle}` live and shareable.

**J7 · Three-minute judge path (demo mode)**
`/` -> Enter as creator -> Today (30s: briefing, decision cards, stats) -> Fan mail (30s: Filtered tab shows spam removed; open the top collab and its reason) -> Ideas (30s: ranked list, community chips) -> Promote the top idea (45s: drafts, Publish) -> open the showcase link (15s) -> back to `/` -> Enter as fan -> join flow with AI suggestions (30s). The demo space is reset daily at 09:00 UTC.

**J8 · Fan mail, answered once**
Several fans send pitches asking the same thing -> the hourly job groups them (at least 3 within 30 days) -> Fan mail shows a strip of repeated questions -> `/dashboard/inbox/questions` -> open a group -> edit the AI-drafted answer -> Send to everyone (optionally pin it as a post in chosen communities) -> success: every asker sees the reply in My space, the group is `answered`.

**J9 · A challenge**
`/dashboard/challenges` -> New challenge (title, body, community or all, due date) -> fans get a notification -> a fan opens `/{handle}/new?challenge={id}` and submits an entry -> the due date passes (or the creator taps Close) -> entries are shortlisted, authors notified, the AI recap is stored -> creator picks a winner -> success: the winner leads the closed challenge.

**J10 · A report**
A member taps Report on a post or comment (reason, optional note) -> the creator gets a notification and a notice on Today -> `/dashboard/communities/reports` -> Resolve or Dismiss (a comment can also be hidden) -> success: the report leaves the open list.

**J11 · Delete an account**
`/account` -> Delete account -> a 6-digit code is emailed -> enter it -> the account, its space (if any) and its memberships are deleted; posts stay as "Former member".

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
- **Later:** a decision card on Today can be snoozed; it returns after the chosen time.
- **Leaving a space:** a member can leave from My space; they may rejoin later. After 30 days their intro, links and skills are cleared.
- **Pitch tracker:** the sender sees Sent, Read, Shortlisted and Replied; the Read step shows only while the creator's read-receipts setting is on.

## 5. Actions in detail

| Action | Trigger | Validation | Loading | Success | Error | Next |
|--------|---------|------------|---------|---------|-------|------|
| Check notifications | Live count over a stream (`/api/notifications/stream`); falls back to polling every 30s (creator + fan) | session valid | — | unread count and notification list shown in popover | count and list unavailable silently | stay |
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
| Check the draft | Idea Coach on the pitch or post form | body >= 20 characters; 10 a day per member | skeleton | clarity checklist and an optional rewrite (never a score) | the form keeps working without it | edit or send |
| Upload an image | Choose a file for an avatar or cover | JPEG, PNG or WebP, up to 5 MB | progress | the form shows the new image | "Image uploads are turned off" when the bucket is not configured | save |
| Report | Report on a post or comment | member; reason; one report per target; 20 a day | spinner | confirmation | inline error | stay |
| Resolve report | Resolve or Dismiss | owner | optimistic | report leaves the open list | reverts, toast | stay |
| Create challenge | New challenge | title 5..120; body <= 2000; optional due date | spinner | challenge listed; fans notified | inline errors | challenge page |
| Enter challenge | Submit on `/{handle}/new?challenge=` | member; challenge open | spinner | entry posted to the challenge | inline errors | feed |
| Close challenge | Close, or the hourly job after the due date | owner | spinner | entries shortlisted, authors notified, AI recap stored | toast | challenge page |
| Send an answer | Send on a question group | 1..2000 characters | spinner | every asker gets the reply; group `answered` | toast | next group |
| Draft in my voice | Button in the reply box | AI available; 30 a day per space | skeleton | draft in the box, editable | no draft; the box stays empty | edit and send |
| Ask your AI | Question on Today | 1..300 characters; 30 a day per space | skeleton | answer with numbered sources | AI unavailable message | open a source |
| Snooze | Later on a decision card | owner | optimistic | card hidden until the time | reverts | next card |
| Fan of the week | Draft a shout-out, approve | owner; note <= 280 characters | skeleton | note shown on the bio page; fan notified | toast | stay |
| Change password | Account page | current password; 8..128 characters | spinner | other sessions end | "That isn't your current password" | stay |
| Delete account | Account page, then the emailed code | 6-digit code, 10 minutes | spinner | account deleted, signed out | wrong or expired code | landing |
| Export my data | Account page | signed in | download | `fellow-owners-export.json` with the person's own data | toast | stay |
| Contact or privacy request | Contact page form | message 10..4000; 5 an hour per IP | spinner | confirmation on the page; an acknowledgement email at most once per address per 24 hours | inline error | stay |
| Newsletter | Footer form | email; 5 a minute per IP | spinner | confirmation email (at most one per address per 24 hours); its link opens `/newsletter/confirm`, whose button confirms | inline error | stay |

## 6. Navigation rules

- **Creator:** fixed sidebar in groups. Daily: Today, Fan mail, Ideas. Community: Communities, Challenges, Fans. Grow: Spotlight. Then Settings and Help (the contact page). The routes behind them are `/dashboard`, `/dashboard/inbox`, `/dashboard/ideas`, `/dashboard/communities`, `/dashboard/challenges`, `/dashboard/people`, `/dashboard/promote` and `/dashboard/settings`.
- Tabs, sorts and filters live in the URL (`?tab=collabs&sort=fit`), so every view is linkable and Back works.
- Side panels open with `?item={id}`; Esc or Back closes them.
- **Fan:** top bar with creator avatar (back to `/{handle}`), community switcher as horizontal pills, floating "New post" on phones, "My space" in the avatar menu.
- **Deep links:** every route loads directly; member-only routes send non-members to Join with `returnTo`.
- **Demo mode:** a "Switch to fan view / creator view" pill sits in the header.

## 7. Empty and blocked states

| State | Where | User sees |
|-------|-------|-----------|
| New space, no members | Today | Setup checklist; bio link with Copy and QR; Import audience |
| No pitches | Inbox | "No pitches yet. Your bio link has a Send a pitch button." + link preview |
| AI pending | Any AI field | Shimmering "AI reviewing" chip; the item is fully usable |
| AI failed 3 times | Item | Grey "Not analyzed" chip with Retry (owner) |
| AI budget reached | Dashboard banner | "AI paused until tomorrow. New items will be analyzed then." |
| Not a member | Community or post | First 3 post titles, the rest blurred, Join CTA |
| Uploads off | Avatar and cover pickers | Image links only; the API answers 503 `uploads_disabled` if a file is sent |
| No AI key | Any AI field | The deterministic fake AI fills in, so screens still render |
| Not the owner | `/dashboard/*` | `/onboarding` if no space, otherwise a 403 page |
| Unknown handle | `/{handle}` | 404 with "Start your own space" |
| Promotion unpublished | `/r/{code}` | "No longer featured" + Join CTA |
| Daily cap reached | Post or pitch form | "You've reached today's limit of 5 pitches to Mira. Try again tomorrow." |
| Network error | Any mutation | Toast with Retry; optimistic changes revert |

## 8. First-use journeys

**Fan:** bio page -> Join (3 steps, under 60 seconds) -> first community with a one-time tip card: "Share an idea, or tap I'd help build on something you like."

**Creator:** `/onboarding` (4 steps; the platforms step can look up public profiles and suggest what you love, voice quotes and communities) -> Today with a checklist: 1 Copy your bio link, 2 Review your taste profile (prefilled from onboarding), 3 Invite your first 10 fans (share text provided), 4 Import your audience. The checklist hides after three items are done.
