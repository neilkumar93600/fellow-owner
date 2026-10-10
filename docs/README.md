# Fellow Owners: build docs

Startupathon challenge: **Operating System for Fanbases** (Persist Ventures).
Goal: move a creator's audience from Followers -> Organized communities -> Ideas -> Collaboration -> Action.

These docs follow the "Six Documents Before Vibe Coding" template. Give all six to the coding agent together.

| # | Document | Answers |
|---|----------|---------|
| 01 | [PRD](01-prd.md) | What we build, for whom, how we know it worked |
| 02 | [TRD](02-trd.md) | Stack, architecture, AI design, security, environments, decisions |
| 03 | [App Flow](03-app-flow.md) | Every screen, journey, action, empty state |
| 04 | [UI and UX Design Brief](04-ui-ux-brief.md) | Visual language, tokens, components |
| 05 | [Backend Schema](05-backend-schema.md) | Tables, relationships, authorization, validation, seed |

## Rule for conflicts

If two documents disagree, do not guess. Flag it, and resolve in this order: PRD (what) > App Flow (behavior) > Backend Schema (data rules) > TRD (how) > UI brief (look). Then update the losing document.

## Glossary

| Term | Meaning |
|------|---------|
| Space | One creator's home on the platform, reached at `/{handle}` |
| Creator / owner | The influencer who owns a space |
| Member | A fan who has joined a space (and usually one or more communities) |
| Community | An interest group inside a space (Builders, Designers, Fitness Crew...) |
| Post | Something a member shares in a community: Idea, Project or Discussion |
| Signal | A member's lightweight vote on a post: "I'd use this" or "I'd help build" |
| Team | Members who joined a Project in a named role |
| Pitch | A structured message from a member to the creator (replaces DMs). Stored as `inbound` |
| Taste profile | The creator's own words on what they would and would never promote, plus voice samples |
| Fit score | 0 to 100 score the AI gives a single item against the taste profile, always with a reason |
| Triage | The per-item AI pass: spam check, summary, category, fit score, tags |
| Briefing | The daily AI digest on the creator's Today screen |
| Sweep | The catch-up job that analyzes any item still pending |
| Promotion | A creator putting their reach behind a post: drafts, showcase page, short link |
| Showcase | Public page for a promoted project at `/{handle}/s/{slug}` |
