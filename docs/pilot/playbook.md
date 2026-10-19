# Pilot playbook: one real creator in 7 days

Goal: at least one real creator uses Fellow Owners and gives genuine feedback or a testimonial. The brief's starred
criterion asks for "genuine feedback or a testimonial", so **ask for feedback, not an endorsement**. A critical quote from
a real creator still counts and is a much easier yes.

Source: CEO review, 2026-10-19. Volumes and rates are estimates (medium confidence).

## Who to target

| Group | Who | Why |
|---|---|---|
| **B (start here)** | Indian tech, career and build-in-public creators on YouTube, LinkedIn, X with 10K–100K followers | Same time zone, your network, audiences of students who ship projects. Shows the product is not travel-only. |
| **A** | Digital-nomad, remote-work and travel-for-creatives YouTubers with 5K–100K subscribers | Matches the demo story; fans are developers, designers and photographers who build things. |

Skip fashion, beauty and pure lifestyle (fans don't build; agencies gatekeep) and anyone over ~150K.

## Where to find them

**Warm first**
- Post on your own X and LinkedIn: "Looking for 5 creators (5K+) to break my product."
- Ask 15 friends who they know with 5K+ followers.
- Ask Persist for one intro from their network.

**Cold**
- X search: `"too many DMs" OR "can't keep up with DMs" OR "DMs are a mess" min_faves:20`; bios with "digital nomad" or
  "building in public".
- YouTube: search the niche; keep channels where comments ≥ ~0.5% of views and the description links a Discord, Skool or
  WhatsApp group (they already feel the pain). Email the business address on the About tab.
- Instagram: Linktree, Beacons or Stan in bio plus "DM for collabs".

## Volume

About 25 light messages plus 5 deep previews a day for 4 sending days (~120 contacts). Expect 10–15% replies, 4–6 looks,
2–3 calls, 1–2 testimonials. Spread across email, X, LinkedIn and Instagram so no account gets spam-flagged.

## Day by day

- **Day 1:** owner setup (below), a sheet of 60 names, warm asks.
- **Days 2–5:** ~30 sends a day. One follow-up after 72 hours. Take any call the same day. Ship the change each creator
  asks for within 48 hours and tell them.
- **Day 4 checkpoint:** fewer than 3 replies → change the opening line and the group. Optional: offer ₹3–5K / $50 for 30
  minutes of honest feedback, **disclosed**.
- **Days 5–6:** ask anyone who liked it to share their link once with Close Friends, Discord or a broadcast channel. Ten
  real fans joining beats any quote.
- **Day 7:** collect quotes and clips, package the evidence, stop outreach.

## The offer

- Free founding-creator space with done-for-you setup (a 15-minute call).
- "One change you ask for, shipped in 48 hours."
- A mention in the submission (only with written consent).
- Nothing about equity or reach.

The site has a door for this: `/contact?topic=founding`.

## First touch: a private preview of their audience

Run on their public YouTube channel, screenshot the result, send the screenshot. Send nothing else until they say yes.

```bash
railway run --service api pnpm --filter @fellow-owners/api preview:audience -- --channel @theirhandle --out preview.html
```

Rules (non-negotiable):
- **YouTube only, official Data API.** No Instagram or TikTok scraping for people who haven't asked.
- **Groups, not people.** Rooms, counts and scrubbed quotes. No commenter names or handles. The script enforces this; don't
  add names back by hand.
- **Private.** It is a local file. Never host it, never put it at `/{their-handle}`.
- **Delete** the file after the conversation or when they ask.
- **Never contact their commenters.**
- If the script says the data is sample data (no `YOUTUBE_API_KEY`), stop. Showing fake "your comments" ends the
  conversation.

## Messages

**Cold DM** (fill the brackets from their real comments):

> Hi [Name], loved [specific video]. Your comments are full of people offering things: [3 photographers asking to shoot
> with you, a dev who mapped your spots]. I'm a solo founder building Fellow Owners, a bio link where fans like that join
> small communities and pitch you properly. I sorted your last 10 videos' comments into a private preview (screenshot, no
> names). Want the walkthrough? Two minutes, and blunt feedback is the whole point. [Your name]

**Follow-up** (once, after 72 hours, on a second channel if you can):

> Hi [Name], last nudge. Here's the preview again [screenshot]. Private, never published, deleted the moment you ask.
> Even if you never use it: did it find the right groups?

## Five feedback questions (screen-share call, recorded with permission)

1. What happens today to collab offers and ideas in your DMs and comments, and how many hours a week does it take?
2. Of your AI twin's top picks, which would you act on, and which is wrong and why?
3. What would stop you putting this link in your bio this week?
4. What one change do you want first? (Ship it within 48 hours.)
5. How would you describe this to a creator friend in one sentence?

In the product, creators can also send feedback from **Settings → Tell the founder**, with a "you can quote me" checkbox,
so consent is on record.

## Testimonial ask (after their change ships)

> I shipped [change] from our call. Could I quote you in my Persist submission? Either 2–3 sentences in your own words, or
> a 30-second selfie video: what it would replace for you and what's still missing. Critical is fine. I'll send you the
> exact text before submitting.

Get written permission for name, handle and photo.

Only trust "Quote consent: yes" from **Settings → Tell the founder** when the stored `support_requests` row has a
`user_id` whose account email matches the sender. The public `/contact` form can carry the same text from anyone, so a
quote from there needs a separate written OK from the creator.

## If nobody says yes in time (ranked, all real)

1. Real creator feedback that isn't an endorsement: "a 40K creator tried it, liked X, won't adopt until Y, here's what I
   shipped."
2. A 1K–5K creator who ran it with real fans for 3 days: joins, pitches, AI-agreement rate. Real usage beats a big name.
3. An outreach log: contacted, replied, quotes used with permission, top objections, changes shipped.
4. A fan-side test: 10–15 real people finish join + pitch inside the Instagram in-app browser; completion rate and time.
5. Feedback from creator managers or community managers who handle a creator's DMs.

## Never

- Present Mira (the demo creator) as real. She is labelled fictional everywhere.
- Use an undisclosed paid quote.
- Have a friend pose as a creator.
- Publish wording the creator didn't approve.

## Owner setup before the first send

- Set `YOUTUBE_API_KEY` on Railway `api`.
- Top up OpenRouter (~$20) and set a low-balance alert.
- Test the fan join on a real phone inside Instagram, TikTok and YouTube in-app browsers.
