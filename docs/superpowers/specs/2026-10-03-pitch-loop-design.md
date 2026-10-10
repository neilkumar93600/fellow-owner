# Pitch loop: Idea Coach, Pitch Tracker, Answer Once

Status: design approved in chat 2026-10-03, spec awaiting review · Batch 1 of 3 · Phase: design only (fixtures), backend later

## Why

Fans need a fair shot ("my idea has a path"); creators need fewer hours on repeated messages. This batch
closes the pitch loop on both sides without leaving v1 scope (no payments, no member DMs, no live chat,
no social API posting):

1. A fan writes a clearer pitch (**F30 Idea Coach**).
2. The fan watches it move (**F31 Pitch Tracker**).
3. The creator answers everyone who asked the same thing at once (**F32 Answer Once**), and the fan's
   tracker reaches Replied.

Later batches (not in this spec): Batch 2 Creator's AI (F33 Taste Swipe, F34 Audience Pulse, F35 Away
Mode), Batch 3 Community connects (F36 Team Matchmaker, F37 Weekly Shout-out).

## Ground rules (all three features)

- Design phase: screens render fixtures from `web/lib/fixtures/`; every AI moment is a captured sample
  response behind a short simulated delay. No API calls.
- DESIGN.md holds: One Purple per screen, Lime only for "you are here", Flat at Rest, One Step (insets,
  never a card in a card), Dark Words contrast, 44px fan targets, tabular numbers, no em dashes in UI copy.
- Privacy (PRD AC17): fit scores and reasons stay creator-only. Nothing in this batch shows a fan a score
  or a prediction.
- Anything the AI writes in the creator's voice is published only after the creator approves it.

## F31 Pitch Tracker

### Fan view

On each pitch in My space → Pitches (`/[handle]/me?tab=pitches`), a four-step tracker replaces the status
pill:

```
 ●────────●────────◉────────○
Sent     Read   Shortlisted  Replied
Oct 2    Oct 2    Oct 3
```

| Step state | Look | Screen reader text |
|------------|------|--------------------|
| Done | Ink dot with a check, ink connector | "done", plus the date |
| Current | Lime dot with an ink ring (`aria-current="step"`) | "current" |
| Not yet | Hollow dot on Line, Line connector | "not yet" |

- The list is an `<ol aria-label="Pitch progress">`. Dates sit under done steps (`formatDate`). Fits a
  360px phone in one row.
- Endings:
  - **Replied:** fourth step done; the existing lavender reply well stays below. When the reply came
    from Answer Once, the well adds "Mira answered this for 38 people · See the post" linking to the
    pinned post.
  - **Closed** (status `archived`): Sent ✓ → Read ✓ → Closed, with "Mira read this and isn't taking it
    further. Your next idea is welcome." in ink-soft.
  - **Withdrawn:** Sent ✓ → Withdrawn.
- A pitch the AI filtered as spam shows as Sent and never moves (no signal to spammers).
- Read receipts off (creator setting): the Read step is not drawn; the tracker is Sent → Shortlisted →
  Replied, and Closed reads Sent ✓ → Closed.
- The confirmation after sending (`pitch-sent.tsx`) shows the tracker at Sent with "You'll see it move
  when Mira reads it" and a link to My space → Pitches.

### Creator view

- The inbox pitch panel (`pitch-panel.tsx`) adds one quiet line: "Fans see when you've read and
  shortlisted this." (or "Fans see when you've shortlisted this." with read receipts off).
- Settings (`profile-form.tsx`) adds a switch: "Show fans when I've read their pitch", on by default.

### Data

- `Pitch` gains `readAt: ISODate | null` and `shortlistedAt: ISODate | null`, and
  `answeredGroup: { count: number; postHref: string } | null` (filled by F32).
- The space gains `showReadReceipts: boolean` (studio space for the creator; `MySpace.space` for fans so
  the tracker knows whether to draw Read).
- Fixture `me.json`: pitches covering Sent, Read, Shortlisted, Replied (direct), Replied (via Answer
  Once), Closed and Withdrawn.

## F30 Idea Coach

### Where

- Pitch form (`/[handle]/pitch`, `pitch-form.tsx`): "Check my pitch".
- New post form (`/[handle]/new`, `post-form.tsx`) for Idea and Project types: "Check my idea". Not on
  Discussion.

### Behaviour

- A secondary button with the AI chip sits under the body field, enabled once the body has 20 characters.
  Send stays the one purple button.
- Result: an inset lavender well under the body field.

```
Coach tips · Mira never sees these
✓ Who it's for        "home-gym beginners"
✓ What you need       "a shout-out to Builders"
○ Proof or a link     Add a demo, a screenshot or numbers
✓ Quick to read       About 30 seconds

▸ Suggested version   [Use this version]  [Keep mine]
```

- Checklists:
  - Pitch: Who it's for · What you're asking for · Proof or a link · Quick to read.
  - Idea or Project: The problem · Who it's for · What help you need · A first step.
- A met item shows a success check and the phrase the coach found; an unmet item shows a hollow dot and a
  one-line tip in ink-soft.
- "Suggested version" is a collapsed disclosure with a rewritten subject and body. "Use this version"
  replaces both fields and shows a toast with Undo; "Keep mine" closes the disclosure.
- Never shown: a fit score, "Mira would like this", or any prediction about the creator. The coach judges
  clarity, not taste. Coach output is never stored with the pitch or shown to the creator.

### States

| State | Shows |
|-------|-------|
| Idle | Button only |
| Loading | Three skeleton rows (`sweep`), up to 5 s |
| Result | Well as above; focus moves to the "Coach tips" heading; results region `aria-live="polite"` |
| Edited after a check | Button reads "Check again"; old tips stay until the new ones land |
| AI unavailable | "The coach is unavailable right now. Your pitch is fine to send as is." |
| Daily limit near | "3 checks left today" appears only at 3 or fewer; at 0 the button is disabled with "Checks reset tomorrow" |

### Data

- Request: `{ kind: 'pitch' | 'post', type, subject, body }`.
- Response type `CoachResult`: `{ checks: Array<{ key: string; label: string; ok: boolean; found:
  string | null; tip: string | null }>; suggestion: { subject: string; body: string } | null }`.
- `LIMITS.coach = { perDay: 10 }` in `shared/src/limits.ts`.
- Fixture `coach.json`: one pitch result and one idea result.

## F32 Answer Once

### Entry

A flat strip at the top of `/dashboard/inbox`, above the tab bar, shown only when open groups exist:

```
Repeated questions · 3 groups · 38 people asked          [Answer once →]
```

The button is secondary. It links to a new route, `/dashboard/inbox/questions`.

### Questions page

Same frame as the inbox: group list on the left, the selected group in a side panel on the right; on
phones the list and the panel stack. Two sections in the list: Open and Answered.

A group panel holds:

1. The AI-written question, as a heading: "How do you edit your videos?"
2. "38 people asked · last 14 days" with the community chips they belong to.
3. Three member quotes (name, community chip, quote), then "See all 38" listing every asker. Each asker
   row has "Not this question", which drops their pitch from the group (it returns to the inbox as a
   normal pitch).
4. "AI draft" answer in the creator's voice, editable. "Redraft" is limited to
   `LIMITS.answerDraft.perDay` (5).
5. Send options: "Reply to all 38" (on by default) and "Pin in communities" (chips, preselected with the
   askers' communities). With both off, Send is disabled; with only pinning on, the button reads
   "Pin answer" and the pitches stay as they are.
6. Purple "Send to 38 people", then a confirm dialog: "Send this answer to 38 people? Each pitch gets it
   as your reply."
7. After sending: toast "Sent to 38 people. Pinned in Builders.", the group moves to Answered with its
   date, and each source pitch becomes Replied with the answer as `creatorReply` and `answeredGroup` set.

"Dismiss group" (in the panel's menu) moves the pitches back to the inbox as normal pitches.

### Grouping rules (backend later)

- Three or more pitches asking the same thing within 30 days, by embedding similarity.
- Spam, withdrawn, archived and already replied pitches are excluded.
- v1 sources are pitches only; comments come later.

### Fan side

- Tracker reaches Replied; the reply well adds "Mira answered this for 38 people · See the post".
- The community feed (`components/community/feed.tsx`) shows the pinned answer as a Discussion post by
  the creator, pinned to the top, with a quiet "Answered for 38 people" label. No new post type.

### Data

- `QuestionGroup`: `{ id, question, askedCount, pitchIds, quotes: Array<{ memberName, communityName,
  text }>, communities: CommunityRef[], draft: string | null, status: 'open' | 'answered' | 'dismissed',
  answeredAt: ISODate | null, postId: string | null }`.
- Post gains `pinned: boolean` and `answerGroupId: string | null`.
- `LIMITS.answerDraft = { perDay: 5 }`.
- Fixture `question-groups.json`: three open groups (video editing, home-gym gear, joining the Builders
  sprint) and one answered group; `feed.json` gains the pinned answer post.

## Files

New:
- `web/components/me/pitch-tracker.tsx`
- `web/components/shared/coach-panel.tsx`
- `web/app/(dashboard)/dashboard/inbox/questions/page.tsx`
- `web/components/dashboard/inbox/question-strip.tsx`
- `web/components/dashboard/inbox/question-groups-view.tsx`
- `web/components/dashboard/inbox/question-group-panel.tsx`
- `web/lib/fixtures/coach.json`, `web/lib/fixtures/question-groups.json`

Changed:
- `shared/src/types.ts` (Pitch, MySpace.space, Post, CoachResult, QuestionGroup), `shared/src/limits.ts`
- `web/components/me/my-pitches.tsx`, `web/components/pitch/pitch-sent.tsx`, `web/components/pitch/pitch-form.tsx`
- `web/components/post/post-form.tsx`
- `web/components/dashboard/inbox/inbox-view.tsx`, `web/components/dashboard/inbox/pitch-panel.tsx`
- `web/components/dashboard/settings/profile-form.tsx`
- `web/components/community/feed.tsx`
- `web/lib/fixtures/index.ts`, `me.json`, `feed.json`, `studio-space.json`
- `docs/01-prd.md`: add F30 to F32 (P1, designed 2026-10-03) and reserve F33 to F37

## Backend notes (for the later pass, not built now)

- Schema: `pitch.read_at`, `pitch.shortlisted_at`, `space.show_read_receipts` (default true),
  `question_group` and `question_group_pitch`, `post.pinned`, `post.answer_group_id`.
- API: `POST /api/spaces/:handle/coach`; `GET /api/studio/question-groups`;
  `POST /api/studio/question-groups/:id/answer` `{ answer, replyAll, pinCommunityIds }`;
  `POST .../:id/remove-pitch` `{ pitchId }`; `POST .../:id/dismiss`; opening a pitch in the panel sets
  `read_at` once.
- AI: coach prompt scores clarity only and returns the checklist shape; grouping by embeddings over new
  pitches in the existing sweep; drafts use the taste profile's voice samples.
- AI down: the coach shows its unavailable message, groups show "AI pending", the draft starts empty.
  Nothing a person typed is lost.

## Acceptance criteria

- **AC-T1** Given a pitch at each status in the fixture, My space → Pitches shows the matching tracker
  (Sent, Read, Shortlisted, Replied, Closed, Withdrawn), with the current step in lime and screen reader
  text for every step.
- **AC-T2** With read receipts off, no tracker draws a Read step and the pitch panel line drops "read".
- **AC-C1** Given a pitch body of 20 or more characters, "Check my pitch" shows four checklist items
  within 5 s, focus lands on "Coach tips", and no score or prediction appears anywhere.
- **AC-C2** "Use this version" replaces subject and body; Undo restores the fan's text exactly.
- **AC-A1** With open groups, the inbox shows the strip; with none, it does not.
- **AC-A2** "Not this question" removes that asker and lowers the count by one.
- **AC-A3** Send asks for confirmation, then the group moves to Answered and a toast names the count and
  the pinned communities.
- **AC-A4** A pitch answered through a group shows Replied with "Mira answered this for N people" and a
  working link to the pinned post, which sits first in that community's feed.

## Verification

- `tsc` 0 and Biome clean.
- axe 0 violations and no console errors on `/[handle]/pitch`, `/[handle]/new`,
  `/[handle]/me?tab=pitches`, `/dashboard/inbox`, `/dashboard/inbox/questions` at desktop (2000×1099,
  1440×900) and phone (390×844).
- Playwright scripts for AC-T1, AC-C1, AC-C2, AC-A2, AC-A3; screenshots of every screen at 2000×1099 and
  390×844.
