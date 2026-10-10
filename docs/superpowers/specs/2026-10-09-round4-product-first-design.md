# Round 4: product-first landing, rainbow CTA, scroll-scrubbed product loop, collapsible sidebar, platform auto-fetch, one identity

Date: 2026-10-09 · Status: owner decisions captured; hero concept chosen from the motionsites.ai research (section 4 addendum).
Builds on: `docs/superpowers/specs/2026-10-09-creator-pivot-design.md` (the creator pivot, Runs 1-3).

## Owner decisions (verbatim intent, 2026-10-09)

| Topic | Decision |
|---|---|
| Rainbow button | Restore the rainbow-glow button. It marks **"Try the live demo"** in the hero, in the navbar (once the hero CTA scrolls away) and in the demo CTA section. "Get started" becomes the glass secondary. At most one rainbow button per viewport. App screens keep coral. |
| Landing focus | Product-first. The owner said the site "shows more about creator other than website". The demo creator appears only as sample data inside product UI, plus one "Demo" disclosure per section. She never appears in a heading, sub line or CTA. |
| Hero | Product UI is the main visual, with the creator as a small avatar chip only. The final concept is chosen from the motionsites.ai research; see section 4 and its addendum. |
| "One week" loop | **Both layers.** Behind: a scroll-scrubbed, blurred screen recording of the real website, like the old frame scrub. In front: a crisp live product-UI layer. Both are driven by the same scroll progress. |
| Section order | For creators moves above For fans. Long pinned sections get shorter: Problem goes from about 2,880px to about 1,600px. |
| Sidebar | Expands and collapses. First visit: **collapsed at 72px**. Expanded is 248px, with labels and groups. The `[` key toggles it. The state is remembered in a cookie, so there is no flash. |
| Platform auto-fetch | Apify for **all four platforms live**: Instagram, TikTok, YouTube and X. On the Apify free plan X allows only a few runs a month, so X falls back to clearly labelled sample data when the actor fails or hits its quota. Demo handles answer from fixtures. |
| Extras | Pre-fill the profile (name, avatar, bio). Suggest "What you love" lines and voice samples. Refresh follower counts daily. Show fan-demand hints on suggested groups, e.g. "6 of your last 10 videos are budget trips". |
| Account and onboarding | **One identity.** On /create-account, "Full name" is renamed **Display name** and "Username" is renamed **Handle** (`fellowowners.app/` prefix shown). The handle is the page link and the sign-in name. Onboarding does not ask again; see section 11. |
| Delivery | When the round is complete and verified, commit and push to GitHub (`origin` = github.com/neilkumar93600/fellow-owner) on a feature branch. Never commit `.env*` files or `.playwright-mcp/`. |

Secrets: `APIFY_TOKEN` is in `api/.env` (gitignored). It is read only by the API, never exposed as `NEXT_PUBLIC_*`, never logged, and never written to any other file.

---


Status: approved by the owner on 2026-10-09 (decisions above override anything below).
Sources: judge audit (desktop 1440 and mobile 390 screenshots in `.playwright-mcp/audit/judge-*`), copy audit, touchpoints audit, leftovers audit, Apify research, visual/loop research, sidebar research. I also spot-checked the repo myself; those checks are marked "verified".

---

## 1. What the audit found

**The verdict is that the page talks about the product but shows the creator.** The copy is mostly product-first. Every large visual is Mira: the hero portrait, the full-bleed Lisbon backdrop behind the story, the Featured thumbnail, the phone cover, and the showcase covers. A judge's 10-second read was "a travel vlogger's personal site". By visual area plus copy, about 35% of the page is Mira and not the product. Mira is named about 25 to 30 times, three times in section headings. The brief's own phrase, "Operating System for Fanbases", appears nowhere. The best product section (For creators) starts at about 10,700px, which is screen 12 of 22.

| Section | Judge % creator | Copy % creator | Target after this round |
|---|---|---|---|
| Nav | 0 | 0 | 0 |
| Hero | 65 | 55 | ≤10 (a 24-32px avatar chip only) |
| Problem (DMs) | 25 | 25 | 5 |
| One week with Mira (loop) | 80 | 75 | ≤10 |
| For fans | 40 | 35 | 15 (the demo name appears inside the phone UI only) |
| For creators | 25 | 15 | 10 |
| Connect | 35 | 20 | 5 |
| Showcase | 70 | 45 | 5 |
| Trust | 0 | 0 | 0 |
| Demo CTA | 30 | 25 | 10 (one "Demo cast" line) |
| FAQ / Footer | 0 | 0-5 | 0 |
| /login, /create-account side art | 70 | | 30 |
| Onboarding preview art | 55 | | 20 |
| 404 | 65 | | 30 |
| /mira bio page | 85 | | 85 (correct for a bio link; add a "Powered by Fellow Owners" cue in the OG image) |

**Rule for the whole site:** photos belong to product UI and to fans. The demo persona appears only as sample data inside the UI, plus one "Demo" disclosure per section. It never appears in a heading, a sub line or a CTA. The For creators and Trust sections already follow this rule and are the model for the rest.

**Credibility bugs judges will notice:**
- **Demo numbers contradict each other.**
  - Crews: the story shows Inês, Marcus, Dani and Priya. Spotlight shows Priya, Inês, Maya and Leo. The phone says "Crew of 3".
  - Budget Travel size: 4,812 in one place, 412 in another.
  - "I'd use this" count: 212 in one place, 40 in another.
  - Clicks: 2,418, 2,412, 2.4K and 1,978 in different places.
  - Message count: 14 on desktop, 8 on mobile.
- **Scroll-spy:** the "For creators" pill stays lit through How it works.
- **CTA hierarchy:** three equal hero CTAs, and the primary one goes to sign-up, which judges will not use.

**Canonical demo facts.** The seed data, which the new loop recording will show, is the source of truth (verified via `GET :4100/api/spaces/mira`):
- 1.14M followers (YouTube 620K, Instagram 380K, TikTok 140K)
- 1,200 members across 6 rooms, with Budget Travel at 502
- One idea, "Lisbon on $60 a day", posted by Priya
- One crew: Priya, Inês, Maya and Leo
- One click count

Put these in one exported object in `web/components/landing/demo-data.ts`. Every landing number imports from it.

---

## 2. Landing changes, section by section

**New page order** (`web/app/(public)/page.tsx`): Hero → Problem → How it works (loop) → For creators → For fans → Connect (+ Challenges) → Showcase → Trust → Demo CTA → FAQ → Footer. The only change is that For creators moves above For fans.

### Rainbow CTA rules

- **Rainbow is the marketing primary.** At most one rainbow button is visible per viewport.
- **Dashboard and app screens keep coral.** No rainbow inside `/dashboard` or the fan app.
- **Restore the component.** Copy `scratchpad/removed/rainbow-button.tsx` to `web/components/ui/rainbow-button.tsx`.
- **Add the missing CSS** to `web/app/globals.css`:
  - `:root { --color-1..--color-5 }` with the Magic UI hsl values
  - `@keyframes rainbow { 0% {background-position:0%} 100% {background-position:200%} }`
  - `--animate-rainbow: rainbow var(--speed,2s) infinite linear;` inside `@theme`
- **Variants:** use the dark `default` variant over photo or aurora, and `outline` on glass. `motion-reduce:animate-none` is already in the classes.
- **DemoButton:** `web/components/landing/demo-button.tsx` gets `variant='rainbow'`, so the demo entry can wear it without a new chooser component.
- **Navbar:** desktop shows a glass button while the hero CTA is on screen (the existing `useHeroCtaVisible`) and swaps to rainbow when the hero CTA scrolls away. The mobile sheet stays plain.
- **Demo CTA section:** "Enter as creator" is rainbow `size='lg'` and "Enter as fan" is glass.
- **Update docs:** the comment in `navbar.tsx` and the Do/Don't list in `DESIGN.md`. The rule changes from "one coral action" to "one rainbow marketing action per viewport; app keeps coral".

### Nav (`web/components/layout/navbar.tsx`, `web/components/landing/nav-scroll.ts`, `nav.module.css`)
- **Links in page order:** How it works, For creators, For fans, FAQ. `SECTION_IDS` follows the same order.
- **Scroll-spy fix.** `useActiveSection` uses a 1% band (`rootMargin '-40% 0px -59% 0px'`) and the dot is correct. The sliding glass chip in `SectionLinks` (around lines 208-290) is not re-placed when `active` changes. Re-place it on every `active` change and confirm at scroll positions 4000 to 6400.
- **Primary action:** "Try the demo" becomes the nav primary (rainbow after the hero). "Log in" and "Get started" stay as quieter links.

### Hero
See section 4. Copy changes:
- Eyebrow: "The operating system for your fanbase".
- Keep the H1 and the sub.
- Add one line under the sub: **Followers → Communities → Ideas → Crews → Featured**.
- On mobile, the product stage sits directly under the H1, above the CTAs.

### Problem (`problem-section.tsx`, `problem-data.ts`, `problem-motion.tsx`)
- Table title "Mira's fan mail" becomes "Your fan mail · AI sorted". Keep one Demo chip, not two.
- Add the caption "AI reads every DM and comment, flags spam, and explains each pick."
- Use one message count (14) at every width.
- Shorten the pin from about 2,880px to about 1,600px.

### How it works (the loop)
See section 3. Copy changes:
- H2 becomes "How it works: from follower to featured". The sub-label reads "Example: a travel creator (demo)". The section id stays `one-week`.
- Steps:
  1. Your bio link gathers followers.
  2. AI sorts them into rooms.
  3. Fans post ideas.
  4. A crew forms.
  5. You feature it, crediting every maker.

  The days become optional small text.
- Story lines change from Mira/her to you/your:
  - "Your 1.14M followers have been one number. Until now."
  - "One link in your bio…"
  - "You give it your spotlight, and every maker is credited by name."
- The single disclosure line reads "Demo: the creator and fans are made up."
- Drop "Mira's" from all alt text.
- Update `loop-static.tsx` the same way, and the spec heading in `docs/superpowers/specs/2026-10-09-creator-pivot-design.md` section 5.

### For creators (`creators-section.tsx`, `creators-data.ts`, `creators-panels.tsx`)
- Demo label becomes "A demo studio. Every name and number is made up."
- Optional heading: "An AI briefing that turns fan noise into five decisions".
- Add one browser-framed shot of the real shell (icon rail + Today) above the three zoomed panels. Reuse `device-frames.tsx` from section 3.
- Do not use the word "dashboard" in visible copy (spec section 9 bans it). Say "studio".

### For fans (`fans-section.tsx`, `fans-data.ts`, `fans-screens.tsx`)
- Label becomes "Your space, as a fan sees it".
- "Mira can love the best ones" becomes "you can love the best ones".
- Step 1 shows the AI room-suggestion join screen first, with a smaller bio header.
- Add a fourth phone state with the AI community digest ("This week in Budget Travel: 41 ideas, top 3…"). The AI task already exists in `api/src/ai/tasks/community-digest.ts` (verified). This is the only place the page shows "AI summarizes".

### Connect (`connect-section.tsx`, `connect.module.css`)
- Tiles:
  - "Loved by Mira" becomes "A heart from you".
  - "When you feature a fan project…"
  - "Rising fans get a shout-out on your page. The AI drafts it, and you approve it."
  - The snippet reads "Lisbon on $60 a day was featured".
- Group label becomes "For fans".
- Promote Challenges to its own block: brief, entry grid and AI shortlist with reasons.
- The "What fans want" tile gets the label "AI groups repeated asks into content ideas".

### Showcase (`showcase-strip.tsx`, `showcase.module.css`)
- H2 becomes "Made by fans, credited by name". The sub reads "Projects fan crews built in a demo creator's space."
- Replace the six Mira vlog stills:
  - One card opens as a real "Made it" page crop: title, Made by roles, clicks.
  - The other cards are flat tinted cards with the crew's face avatar stack as the visual.
- Mira appears as text only.

### Trust (`trust-section.tsx`)
Add a small UI snippet to each card: a "Why:" line, a draft waiting on "Send", and the fan view without match labels.

### Demo CTA (`demo-cta.tsx`, `cta.module.css`)
- Lead: "No sign-up. Try the creator side or the fan side. Demo cast: Mira (creator) and Priya (fan)."
- Path chips "As Mira" and "As Priya" become "Creator side" and "Fan side", with Sparkles and Heart icons.
- "A post in your voice."
- "Start as the creator, finish as a fan."
- Apply the rainbow button rule above.

### FAQ (`faq.tsx`)
- Add "What is real and what is demo data?": live AI calls, seeded data, nightly reset.
- Add "How does the AI sort rooms and summarize discussions?"
- Last answer: "…a demo studio … a demo creator's rooms."

### Footer (`web/components/layout/footer.tsx`, `footer.module.css`)
- Shrink the wordmark panel to about 300px, or replace it with a "Try the demo" band.
- Remove the made-up street address.
- "an AI that knows your taste" becomes "an AI that knows what you love".
- Add demo links: Creator view, Fan view.

### Cookie banner (`web/components/shared/cookie-notice.tsx`)
Leave it as is. It covers about 80px of every screen until it is dismissed, but that is expected behaviour. For screenshots and the recording, dismiss it or hide it with CSS.

---

## 3. Loop section: "Both"

The section has two layers, both driven by one scroll value, `scrollYProgress` from the existing `useScroll` in `loop-scene.tsx`:

1. **Background:** a scroll-scrubbed, blurred screen recording of the real site.
2. **Foreground:** a crisp live product UI layer in front of it.

The existing cards and day rail stay on top. Lenis is already mounted, so do not add a second smoothing step.

### Recording
Script: `scratchpad/tools/record-product.mjs`. It lives outside the repo, uses playwright-core and the same Chromium as `shot.mjs`, and must not start or stop the servers.

- **Setup:**
  - Viewport 1280x800 at scale 1.
  - Pre-warm every route.
  - Inject CSS that hides the cookie notice and `nextjs-portal`.
  - Start from fresh demo state.
- **Capture method:** one screenshot per step, not `page.video`.
- **Five acts of 24 frames each**, matching the five story steps:
  1. Logged-out `/mira` bio scroll.
  2. `/mira/join`, picking Budget Travel.
  3. As fan Priya (via `POST /api/demo/session {as:'fan'}`): the Budget Travel feed, then tapping "I'd use this".
  4. The crew's open roles.
  5. As creator: Today's decision card, then the Spotlight composer.
- **Encoding:**
  - ffmpeg to exactly 120 frames: `scale=1280:800,gblur=sigma=5`, then libwebp at q45.
  - Write them to `web/public/frames/product/frame_0001..0120.webp`, plus `poster.webp`.
  - Bake the blur in: crisp frames would be about 9.6MB, over budget.
  - The script fails if the total is over 6MB.

### Engine
- **`web/components/landing/loop-frames.ts`:** copy it unchanged from `scratchpad/task5-removed/landing/loop-frames.ts`. It provides the sliding decode window (14 frames ahead, 6 behind, 3 decodes in flight) and a `nearest()` fallback.
- **New `loop-canvas.tsx`, about 80 lines:**
  - Load the first 12 frames eagerly and the rest on idle.
  - Frame index = `round(p*119)`.
  - Draw with cover-fit `drawImage`.
  - Cap DPR at 1.5.
  - An IntersectionObserver calls `release()` when the canvas is off screen.
  - Use `poster.webp` as the CSS background for first paint.
  - Do not fetch at all under reduced motion; `LoopStatic` already handles that case.
- **One frame set** at 1280x800, cover-cropped on mobile. The background is blurred, so the crop is acceptable.

### Live layer
New files: `loop-live.tsx`, `loop-live-data.ts`, and a shared `device-frames.tsx` containing BrowserFrame and PhoneFrame.

**What the frames show:**
- The browser frame (URL pill `/mira` → `/dashboard`) changes content per step using `segment(p, i/5, (i+1)/5)`:

  | Step | Browser content |
  |---|---|
  | 0 | CreatorHeader + CommunityGrid |
  | 1 | Budget Travel shown as Joined |
  | 2 | IdeaCard |
  | 3 | Crew roles + AvatarStack |
  | 4 | DecisionCard + StatCard |

- A phone frame overlaps on the right.

**Rules for the layer:**
- Use real components with static fixtures only. Never use DecisionStack, because it relies on router and queries.
- Wrap the whole layer in `inert aria-hidden pointer-events-none`. The cards carry the text.
- Each act in the recording maps to the matching step, so at any moment the background shows the same screen as the foreground, as a deliberate echo.

### Layer stack (`loop.module.css`)

| Layer | z-index |
|---|---|
| Canvas | -3 |
| Shade (cream wash `rgb(251 247 242/.35)` + vignette) | -1 |
| Live layer | 0 |
| Cards | 1 |
| Head and rail | 2 |

Remove the `CREATOR_CLIP` video and still-backdrop code from `loop-scene.tsx`.

### Verify
- Take `shot.mjs` captures at progress 0, .2, .4, .6, .8 and 1, at 1440x900 and 390x844.
- On the first frame the canvas must not be blank.
- Background and foreground must show the same step.

---

## 4. Hero: product with a small creator chip

New files: `web/components/landing/hero-product.tsx` and `hero-product-data.ts`. Modified files: `hero.tsx`, `hero.module.css`, and `hero-chips.tsx` (reuse its spring and drift motion).

- **Left column:**
  - Eyebrow "The operating system for your fanbase".
  - The existing H1, which stays the page's only h1.
  - The sub line.
  - The pipeline line.
  - CTAs: rainbow **"Try the live demo"** (DemoButton `as='creator'`, `variant='rainbow'`, `data-hero-cta`), then glass "Get started", then a text link "or see the fan side" (DemoButton `as='fan'`).
- **Right "product stage":**
  - **Browser frame**, rotated -2deg, showing Today: "Good morning", "5 things need you". A real `DecisionCard` (`web/components/dashboard/today/decision-card.tsx`) with a static `DecisionItem`:
    - Priya Shah, Budget Travel, "Lisbon on $60 a day"
    - "Why: matches budget-honest travel"
    - No-op handlers, `featureHref='#'`
  - **Phone frame**, front-right, showing the `/mira` bio page: CreatorHeader + CommunityGrid (3 rooms) + PitchCta, scaled to .62.
  - **Floating chips:** "AI pick" (an AiChip or FitPill) and "Crew of 4 formed".
  - **Mira chip:** a small glass chip in the stage corner: 24-32px avatar + "Demo creator: @mira · travel · 1.14M".
- **Remove** the large portrait and the "Loved by Mira" and "Featured in this week's vlog" chips.
- **Accessibility:** the stage gets `inert aria-hidden="true"`, so the fake buttons are not tab stops.
- **Entrance:** phone, then card, then chips, using the existing FIRST/STAGGER springs.
- **Mobile:** the stage sits under the H1 at about 300px tall (the phone only, with the card peeking), above the CTAs. No chip may touch the edge.

---

## 4a. Hero addendum: chosen concept "A. Golden Hour Stage (split: copy left, live studio rising from a sun pool on the right)" (owner pick, 2026-10-09)

Source: a review of all 189 motionsites.ai designs: contact sheets, a 16-design deep dive and 3 concepts. This is inspiration only; the originality guard is below.

**Pitch.** This builds the owner-approved section 4 layout and adds the strongest motionsites pattern for product-first heroes: the real app rises out of a warm light source and then fills itself in. The copy column stays on the left (eyebrow, the existing H1, sub, pipeline line, rainbow "Try the live demo", glass "Get started", and the text link "or see the fan side"). On the right, a soft iridescent "sun pool" (a CSS-only peach-lilac-sky radial glow, the light-mode orb idea) sits low in the stage. Two devices rise out of it. The first is a browser frame tilted -2deg, showing Today with "Good morning, Mira", "5 things need you" and a real DecisionCard (Priya Shah, Budget Travel, "Lisbon on $60 a day", "Why: matches budget-honest travel"). The second is a phone in front on the right, showing the /mira bio page (CreatorHeader, three CommunityGrid rooms, PitchCta) at 0.62 scale. Two glass chips land last: "AI pick" and "Crew of 4 formed". Mira appears only as a 28px avatar chip in the stage corner: "Demo creator: @mira · travel · 1.14M". A visitor knows it is software within about a second. As each part of the UI lands, the matching word in the pipeline line (Followers → Communities → Ideas → Crews → Featured) briefly turns ink-bold, so the copy and the product read as one story.

**Desktop mockup**

```
+--------------------------------------------------------------------------------+
| (o) Fellow Owners    How it works  For creators  For fans  FAQ   [Try the demo] |
+--------------------------------------------------------------------------------+
|                                        |   .-- browser (-2deg) ---------------.  |
| (*) The operating system for your      |   | o o o   fellowowners.app/today   |  |
|     fanbase                            |   |-----------------------------------|  |
|                                        |   |[rail]| Good morning, Mira        |  |
|  Your fans have great                  |   |  o   | 5 things need you         |  |
|  ideas. Finally, a way                 |   |  o   | .-DecisionCard-----------.|  |
|  to /hear them./  <- gradient italic   |   |  o   | |(P) Priya Shah . Budget ||  |
|                      + soft glow       |   |      | | "Lisbon on $60 a day"   ||  |
|  One link in your bio gathers your     |   |      | | Why: budget-honest...  ||  |
|  followers into communities. AI finds  |   |      | | [Strong match] [Feature]| .-phone-.
|  the best ideas and people...          |   |      | '-----------------------'| | @mira | |
|                                        |   '--------------------------------| |Budget | |
|  Followers > Communities > Ideas >     |  [* AI pick]                      | |Van life| |
|  Crews > Featured                      |            ~~ sun pool glow ~~    | |Food   | |
|                                        |  [(m) Demo creator @mira . 1.14M] | |[Pitch]| |
|  [== Try the live demo ->==] [Get started]   [Crew of 4 formed (o)(o)(o)(o)] '-------' |
|  or see the fan side ->                |                                        |
+--------------------------------------------------------------------------------+
  rainbow pill (dark variant) = the only rainbow in the viewport; Get started = glass
```

**Mobile.** At 390px the order is eyebrow, H1, then the stage (about 300px tall: the phone only, centred, with the top 90px of the DecisionCard peeking out behind it on the left at 0.55 scale), then the sub, pipeline line, a full-width rainbow CTA, glass Get started, and the text link. The sun pool shrinks to 240px. The AI pick and Mira chips sit inside the stage with a 16px inset and never touch the edge. The Crew chip is hidden below 640px.

**Motion.** 0 to 2s (reuses the existing data-intro script and the FIRST and STAGGER springs): at 0 the eyebrow fades. From 0.15 to 0.6s the H1 lines clip-mask up using the existing hero-line keyframes. At 0.55s the sub and pipeline line rise 12px. At 0.75s the CTA row appears and the rainbow border starts. From 0.7 to 1.2s the sun pool brightens (opacity 0.4 to 1, scale 0.9 to 1, transform and opacity only). At 0.85s the browser rises from y:60 with a spring. At 1.0s the phone rises from y:80. From 1.1 to 1.6s the DecisionCard content cascades: avatar, title, Why line, then the Feature button, which arrives pale and turns coral. The pipeline word for each landing part turns ink-bold for 300ms. From 1.7 to 1.9s the chips spring in (HeroChips). Idle loop: the sun pool makes 3 slow 12s breaths and then rests, the gradient word's sheen makes 3 passes and then rests, and the rainbow CTA keeps its border (see the risks note on looping). Cursor: the existing HeroChips pointer drift on fine pointers only, with chips at depths -18, 22 and -12 and the phone at depth 8, so the layers separate. Scroll: as the hero leaves, the browser and phone move up 40px faster than the copy (useScroll plus useTransform). Reduced motion: everything renders in its final state with no tilt animation, a static sun pool and a static rainbow border.

**Inspired by.** Quantum Lucid (164): the product card emerging from a rich colour source at the bottom of the frame, a single dark CTA, restraint. Ascera AI (121) and Codeveil (160): skeleton-then-content population inside the product window, capped near 0.5s. Glass Orb (130), Planetary Pulse (168) and Nexa Talent (166): one soft iridescent object behind frosted UI on a pale page, here a CSS sun pool. AI Meeting Notes (41): gradient only on the key word and the CTA, with small people tiles around real UI. Subscription Agency (189) and Mindora (113): the small avatar chip as the only human. Shipping Infrastructure (37) and the motionsites headline: a gradient italic accent word with a blurred glow duplicate and grain.

**Originality guard.** No single source supplies the layout, art or copy. 164 is centred with one card in a blue silk video. Ours is a split layout with two devices (studio and phone) telling the creator and fan sides at once, rising from a CSS sun pool in our aurora palette, with our own Instrument Serif H1, the pipeline line acting as a live legend, and real Fellow Owners components (DecisionCard, CommunityGrid) rather than an illustration.

**Implementation.** New: web/components/landing/hero-product.tsx (a client island that renders the stage with inert and aria-hidden="true") and hero-product-data.ts (a static DecisionItem plus the bio-page props). Reuse the shared device-frames.tsx (BrowserFrame and PhoneFrame) planned in section 3 for the loop live layer, so both sections share one frame component. Modify hero.tsx (remove CreatorImage and the portrait frame; add the eyebrow and pipeline line, with the pipeline words as spans carrying data-step) and hero.module.css (the .stage grid area, .sunPool, .browser, .phone and the accent-word classes). Change hero-chips.tsx content to AI pick, Crew of 4 and the Mira chip, keeping its spring and drift unchanged. The sun pool is one div with three stacked radial-gradients (#FFD9C2, #DCCFF7, #BFDDF7) and a pre-applied filter:blur on a static layer, animating only transform and opacity. The gradient word is `<em className={styles.accent} data-text="hear them.">` with background: linear-gradient(100deg,#C8432A,#A23E8C,#5B47A8,#2B6CA8); background-clip:text; color:transparent, plus an aria-hidden ::after duplicate using filter:blur(14px), opacity .35, z-index -1, and a 3% SVG feTurbulence grain via mask-image. Every stop is at least 4.59:1 on cream (coral 4.59, #A23E8C about 5.4, #5B47A8 about 6.8, sky about 5.3). The cascade is motion stagger on data-attributes driven by the INTRO_PLAY_EVENT already exported from hero-intro.tsx. The pipeline highlight is a CSS class toggled at the same timestamps. Rainbow CTA: restore rainbow-button.tsx and add DemoButton variant='rainbow' size='lg' per section 2.

**Effort.** M, about 1.5 days, of which device-frames.tsx is shared with the loop work.

**Risks.** The DecisionCard is a 'use client' component with motion; render it through the static props path and confirm no layout shift before hydration (the stage must reserve its height). The CommunityGrid at 0.62 scale has tiny text, but it is decorative and aria-hidden, so make sure no real content depends on it. backdrop-filter on two device frames plus chips is costly in Instagram and TikTok webviews; the existing @supports fallback (92% white) applies, and the sun pool must not animate a blur. The restored rainbow button uses focus-visible:ring-purple, which breaks DESIGN rule 9 (no purple focus ring), so switch it to the 2px ink outline. Its animate-rainbow is infinite, against "nothing loops forever in view"; cap it at 6 iterations or pause it with the existing useHeroCtaVisible observer. Keep the sub line as the LCP element, because the stage must not become LCP.

**Notes carried from the research recommendation:**
- The restored rainbow button must use the ink focus outline, not ring-purple.
- Its animation must not loop forever in view: cap the iterations or pause it when off screen.
- Take B's "word lights up as its part lands" timing on the pipeline line (already folded into A).
- Gradient-word technique (from the motionsites headline):
  - an animated radial text gradient in our palette;
  - a blurred duplicate (blur about 10px, screen blend, opacity about 0.8) for the glow;
  - a grain overlay;
  - a capped number of sheen passes.

---

## 4b. Hero final: "Framed Golden Hour" (owner pick, 2026-10-09; supersedes the stage layout in 4a)

Owner references: Orizon real-estate hero, Turnover agency hero, ENSŌ hero, GLITCH store hero (session images 6-9.png). They share these traits:
- a big rounded framed hero with a full-bleed image;
- frosted glass UI widgets on top;
- callout leader lines;
- a serif headline with italic accents;
- a stats row;
- a bottom-left glass info card;
- a scroll cue.

Take the patterns, never a look-alike. This keeps 4a's product-first rule: the image is scenery only, the product UI is the subject, and the demo creator appears only as a small chip.

**Frame**
- The hero is one large rounded frame, about 32-40px radius, inset 16-24px from the viewport edges.
- It fills about 92svh on desktop.
- Inside is a golden-hour SCENERY photo with no people (e.g. coastal hills, a road at sunset, mountain haze) with negative space on the left.
- Use an existing faceless cover from `web/lib/creator-assets.ts`, or generate one wide image with fal.ai GPT Image 2.5 (key in `.env.fal.local`, never printed; at most 2 generations; prompt and request id go in `prompt.md`).
- A left-side cream gradient scrim keeps the text AA.
- A grain overlay sits on top.

**Inside the frame, top**
- A glass "Claim your link" bar (the Orizon search-bar pattern, showing our product): `fellowowners.app/` prefix + handle input + "Claim your link →".
- It checks availability live via `GET /api/handle-available?h=` (debounced; shows "is free" or "taken: try …").
- On submit it goes to `/create-account?handle=<h>`; ask the create-account owner to prefill the handle from the query.
- It is a real form with a label, error text in aria-live, and it works at 390px.

**Left column**
- Eyebrow pill: "The operating system for your fanbase".
- H1 (Instrument Serif): "Your fans have great ideas. Finally, a way to *hear them.*" The italic accent uses the gradient-glow technique from 4a.
- Sub line.
- Stats row, honest and labelled as demo or target where needed, e.g. "about 10 min a day", "7 in 10 AI picks kept (pilot target)", "1 link in your bio".
- CTAs: rainbow "Try the live demo" (DemoButton as creator, variant rainbow) + glass "Get started" + text link "or see the fan side".

**Right: glass product widgets over the photo**
- The studio DecisionCard (glass-strong, real component, static props).
- The fan phone showing the /mira bio.
- Thin callout leader lines (GLITCH/Turnover pattern) with small glass labels:
  - "AI pick: says why" points to the card;
  - "Crew of 4 formed" points to the avatar stack;
  - "Featured · 2.4K clicks" points to a small credit chip.
- The 28px demo-creator chip.

**Bottom-left glass card** (Orizon / ENSŌ / Turnover pattern): "1,200 fans · 6 rooms · 55 new ideas this week" + avatar stack + arrow link to #one-week.

**Bottom-right:** "Scroll to explore" cue (static under reduced motion).

**Motion**
- Frame fades in; the photo gets a slow scale 1.04 → 1.
- Copy uses the clip-up.
- Widgets spring in.
- Leader lines draw (pathLength).
- Chips pop.
- The pipeline/feature words light as their widget lands.
- Gentle pointer parallax on the widgets (fine pointers only).
- Everything static under prefers-reduced-motion.

**Mobile (390px)**
- The frame becomes full-width with 16px inset.
- Order: headline → claim bar → phone widget only (about 300px, cropped photo behind) → stats wrap → CTAs → bottom card.
- Callout lines hidden below 768px; chips sit inset.

**Accessibility**
- The widget stage is inert + aria-hidden.
- The claim bar and CTAs are the only interactive elements.
- Contrast is AA on the scrim.
- No layout shift: reserve the frame height and give the image width/height + priority.

---

## 5. Sidebar: expand and collapse

Files:
- `web/components/layout/dashboard-nav.ts`
- `web/components/layout/sidebar.tsx`
- `web/components/layout/app-shell.tsx`
- `web/app/(dashboard)/dashboard/layout.tsx`

No change to `bottom-nav.tsx`, `header.tsx` or `tooltip.tsx`.

### States
- **Collapsed (72px):** today's behaviour.
- **Expanded (248px):**
  - Rows are 44px pills. Icons stay in the same x slot, so they never jump.
  - Labels are visible and the active row keeps the glass chip; the coral dot moves to the right edge.
  - The logo shows its wordmark.
  - The foot becomes a Help row plus an avatar, name and handle row. Wrap AccountMenu; do not change its props.

### Groups
Add `NAV_GROUPS` to `dashboard-nav.ts`:
- Daily: Today, Fan mail, Ideas
- Community: Communities, Challenges, Fans
- Grow: Spotlight
- Settings, ungrouped

Derive `DASHBOARD_NAV` with `flatMap`, so the bottom nav, `navTitle` and `isNavActive` stay untouched. When expanded, groups get 11px uppercase headings (lists use `aria-labelledby`). When collapsed, a hairline divider replaces each heading.

### Toggle
- Lucide `PanelLeftClose` / `PanelLeftOpen` icons, in a 44px hit area.
- `aria-expanded`, `aria-controls="sidebar-nav"` (the nav is always mounted), a stable name "Sidebar", and `aria-keyshortcuts="["`.
- Tooltip with `describe={false}`.

### Shortcut
- `[` toggles the sidebar.
- Ignored when focus is in an input, textarea, select or contenteditable, when a modifier key is held, on key repeat, when the event is `defaultPrevented`, and below `lg`.
- Before shipping, grep for how the Today L/R/arrow shortcuts are registered, to rule out a collision.

### Persistence without a flash
- Cookie `fo_sidebar=expanded|collapsed` (`path=/`, 1 year, `samesite=lax`).
- Written client-side on toggle.
- Read in the dashboard layout with `cookies()`, which passes `defaultExpanded` to AppShell. The server HTML then already has the right width.
- No localStorage.

### Layout
- AppShell root: `data-sidebar` plus `[--rail:72px]`, with `lg:data-[sidebar=expanded]:[--rail:248px]`.
- The aside uses `w-[var(--rail)]`.
- The content column replaces the hard-coded `md:pl-[112px]` with `md:pl-[calc(var(--rail)+40px)]`.
- Width and padding transitions run for 200ms with the same easing. Add `motion-reduce:transition-none`.
- Labels use `whitespace-nowrap overflow-hidden`. When collapsed they are `sr-only`, never `display:none`, so the link keeps its name.

### Widths and tooltips
- Expanded applies only at `lg` (1024px) and up. The toggle is hidden below `lg`.
- Mobile is unchanged.
- Tooltips use `disabled={expanded}`.

---

## 6. Platform auto-fetch with Apify

**Goal.** A creator pastes Instagram, TikTok, YouTube or X links in onboarding. Fellow Owners pulls each public profile and pre-fills:
- name, avatar and bio
- "What you love" and voice samples
- suggested groups, each with a demand hint
- a daily follower refresh

**Where it plugs in** (verified):
- Onboarding steps: `web/components/onboarding/platforms-step.tsx`, `handle-step.tsx`, `taste-step.tsx`, `communities-step.tsx`, `onboarding-templates.ts`.
- `spaces.platforms` is jsonb `PlatformEntry{platform,url,followers}`, so no migration is needed. Add optional `handle?` and `fetchedAt?` fields.
- Space creation is `POST /api/studio/space` (session only), so the lookup must be session-only too, not owner-only.
- Crons live in `api/vercel.json` plus `api/src/controllers/cron.controller.ts` (Bearer `CRON_SECRET`).

### Shared contract
New file `shared/src/platform-lookup.ts`, exported from `shared/src/index.ts`. Write it first so the API and UI agents can work in parallel.

```ts
type LookupPlatform = 'instagram'|'tiktok'|'youtube'|'x';
interface PlatformProfile { platform: LookupPlatform; handle: string; displayName: string|null; avatarUrl: string|null; bio: string|null;
  followers: number|null; verified: boolean; profileUrl: string;
  recent: { title: string; url: string; views: number|null; likes: number|null; postedAt: string|null }[]; // max 10
  source: 'apify'|'fixture'|'simulated'; fetchedAt: string }
type PlatformLookupResult = { status:'ready'; profile: PlatformProfile } | { status:'failed'; reason:'private'|'not_found'|'unavailable'|'unsupported' };
interface SetupSuggestions { displayName: string|null; avatarUrl: string|null; bio: string|null;
  loves: string[]; voice: string[];                                  // feeds TasteProfile.promote / .voice
  communities: { name: string; description: string; icon: CommunityIcon; tint: Tint;
                 demand: { count: number; of: number; label: string } | null }[] } // "6 of your last 10 videos are budget trips"
```

### Endpoints
In `api/src/routes/studio.routes.ts`, with a new controller in `api/src/controllers/platform.controller.ts`:

1. **`POST /api/studio/platform-lookup {url}`**
   - Session only; rate limit 5 per minute per user.
   - Parse the URL strictly: https only, host allowlist (instagram.com, tiktok.com, youtube.com/youtu.be, x.com/twitter.com), extract `{platform, handle}` with a regex. Never forward the raw URL to Apify.
   - Returns `PlatformLookupResult` synchronously, within about 60s.
   - The UI fires one request per pasted link in parallel (`Promise.allSettled`) and shows a chip per platform: pending, ready or failed.
   - `ponytail:` choosing sync over async means no lookup table and no polling, and it works on both Vercel and Railway. The ceiling: switch to async (`/v2/acts/{id}/runs` + poll + a `lookups` table) if p95 goes over the function limit (set `maxDuration: 90`).
2. **`POST /api/studio/setup-suggestions {profiles: PlatformProfile[]}`**
   - Zod-validated, at most 4 profiles and 10 recent items each.
   - Calls a new fast-tier AI task, `api/src/ai/tasks/suggest-setup.ts`, with a deterministic fallback in `api/src/ai/fake.ts`. Captions are wrapped with the existing `untrustedBlock` / `UNTRUSTED_DATA_RULES` guard.
   - The model returns:
     - `loves` (3-5 short "what you love" lines)
     - `voice` (2-3 lines quoted from captions, verbatim)
     - up to 4 groups, each with the **indices** of recent posts that fit it
   - The demand hint is computed in code from those indices: "6 of your last 10 videos are budget trips", plus "and they average 2.1x your views" when that holds. The model never produces the numbers.
   - Groups are matched against `COMMUNITY_TEMPLATES` first, so icons and tints stay in-system.

### Resolver
`api/src/lib/platform-lookup.ts`, one file with a small mapper per platform. Resolution order:

1. **Fixtures:** if the handle is a demo handle (`miralane`, `mira`, `priya`), return `api/src/lib/platform-fixtures/<platform>-miralane.json` after an 800-1500ms delay. Fixture numbers match the seed (YouTube 620K, Instagram 380K, TikTok 140K).
2. **Simulated:** if there is no `APIFY_TOKEN` or `APIFY_ENABLED=false`, return a deterministic fake seeded by a hash of platform and handle. It has `source:'simulated'`, and the UI shows a "Sample data" chip.
3. **Apify:** `POST https://api.apify.com/v2/acts/{owner~name}/run-sync-get-dataset-items?timeout=45&memory=1024&clean=true` with `Authorization: Bearer` and `AbortSignal.timeout(60000)`. Error items (`errorCode`, an `error` field, or an empty array) become `failed`.

### Actors

| Platform | Actor | Cost per lookup | Notes |
|---|---|---|---|
| Instagram | `apify/instagram-profile-scraper` `{usernames:[h]}` | about $0.003, recent posts included | |
| TikTok | `clockworks/tiktok-profile-scraper` `{profiles:[h],resultsPerPage:6,profileSorting:'latest'}` | about $0.01-0.035 | Profile data sits in `authorMeta` on the video items |
| YouTube | `streamers/youtube-channel-scraper` `{startUrls:[{url}],maxResults:6}` | under $0.01 | Returns no likes; residential proxy. The official YouTube Data API is the documented production path |
| X | `apidojo/twitter-user-scraper` | $0.004 | Least reliable: 5-handle minimum (pad, then dedupe) and 1-2 concurrent runs. The free plan's Demo Mode allows only 5 runs a month. The owner chose live X: call the actor, and on failure, an empty dataset or quota exhaustion, return the deterministic sample profile with `source:'simulated'` and a visible 'Sample data' chip |

### Avatar
Apify returns expiring, signed CDN URLs, and the repo has no object storage (verified). On "Use this", the server fetches the avatar:
- Only from an allowlisted CDN host: `*.cdninstagram.com`, `*.fbcdn.net`, `*.tiktokcdn*.com`, `*.ggpht.com`, `*.ytimg.com`, `pbs.twimg.com`. This prevents SSRF.
- Only `image/*`, at most 256KB.

It is stored as a `data:` URL in `spaces.avatar_url`. `ponytail:` move to object storage when the project has some. Check that `next/image` renders data URLs (`unoptimized`).

### Daily follower refresh
- New `api/src/workers/refresh-followers.ts` and `GET|POST /api/cron/refresh-followers`, added to `api/vercel.json` at `"0 6 * * *"`.
- On Railway, use the same trigger as `demo-reset`.
- For non-demo spaces, oldest `fetchedAt` first, capped at 50 per run: call the resolver with recent posts off, update `platforms[].followers` and `fetchedAt`, and keep the old value on failure.
- The demo space is skipped.

### Data stored
Only after the creator confirms; every field stays editable:
- `displayName`, `avatarUrl`, `bio`
- `platforms[]` (url, handle, followers, fetchedAt)
- the accepted `loves` and `voice` lines in `tasteProfile`
- the chosen communities

Not stored: raw actor output, posts, comments, follower lists, emails, phone numbers or locations. The UI label reads "Imported from Instagram · public profile · edit anything". Imported data is unverified: it grants nothing and does not prove the creator owns the handle.

### Privacy and Terms of Service
- Only the creator's own public profile, imported on their explicit paste.
- Low volume; no logins or cookies; no re-hosting of media.
- The production path is OAuth or the official APIs.
- A "Skip, I'll type it" path is always visible, and a failure on one platform never blocks the others.

### Secrets and cost
- `APIFY_TOKEN` and `APIFY_ENABLED` live in `api/src/config/env.ts` as optional values. They are server-only and never `NEXT_PUBLIC_*`.
- Use a scoped token with a monthly spend limit set in the Apify console; that is the hard cap. Also pass `maxTotalChargeUsd=0.05` on each call.
- The free plan gives $5 a month, which covers several hundred lookups.
- Skip a 24-hour cache for now. Rate limiting plus the spend cap is enough. Add a cache if retries show up in the cost.

### Tests
- One vitest file per mapper, run against a saved actor-output sample.
- One URL-parser test with hostile inputs: `javascript:`, a foreign host, `@` in the authority, and an IP address.

---

## 7. Extras

The core items for this round come from the requests above:
- profile pre-fill
- "What you love" and voice samples
- daily refresh
- demand hints
- one canonical demo-data source

**Optional, at most five, each one line:**
- (Optional) "Paste your Instagram link" on the landing hero: runs the lookup in fixture or simulated mode only (public, rate-limited, zero cost) and shows suggested groups live, which demonstrates the new feature to judges.
- (Optional) A root OG image, `web/app/opengraph-image.tsx`, reusing `spaceOgImage`, plus `pageMetadata()` on /about, /pricing and /login, so shared links show a product card.
- (Optional) Product UI in place of the Mira portrait on /login, /create-account, the onboarding preview and the 404 (about 60% product, Mira as a chip); give the onboarding a clear fan path first.
- (Optional) "Refresh from Instagram" in Settings, reusing the lookup and setup-suggestions endpoints.
- (Optional) A "Live AI" micro-badge on cards produced by a real model call in the demo, so judges can tell live AI from seeded data.

---

## 8. Leftover fixes (real ones only)

1. **High.** `isDemo` is missing from `PublicSpace`, so `/mira` renders the aurora cover and `/demo/mira.jpg`.
   - Add it in `shared/src/types.ts:124`, remove the duplicate at line 387, and extend `Showcase.space` (line 188).
   - `api/src/services/spaces.service.ts:61`: add `isDemo`, remove line 92.
   - `api/src/services/promotions.service.ts:611`.
   - Remove the widening in `web/components/bio/creator-header.tsx:21`.
   - Pass `isDemo` in both `[handle]` opengraph-image routes.
2. **Medium.** Remove next-themes: the "script tag" warning on `/nope` was reproduced.
   - Delete `web/components/theme-provider.tsx`.
   - Unwrap `ThemeProvider` in `web/app/providers.tsx`.
   - Remove `next-themes` from `web/package.json`.
   - Remove the theme entry in `web/lib/legal.ts:105-110`.
   - Optionally add `colorScheme:'light'` on `<html>`.
3. **Medium.** `web/components/shared/toolbar.tsx:31` causes a horizontal scroll on Followers at 390px. Change the class to `flex min-w-0 max-w-full flex-wrap items-center gap-3`.
4. **Medium.** Seed AI reasons quote taste lines picked at random. In `api/src/db/seed/generate-content.ts:1428`, pick the promote line by shared significant words (export `tokenize`, `significant` and `containsWord` from `api/src/ai/fake.ts`), fall back to "Fits your style.", then re-seed.
5. **Medium.** Challenges, in `api/src/services/challenges.service.ts`:
   - Filter hidden or deleted posts out of fan shortlists (line 191).
   - Hide asks in archived communities from the fan list (`api/src/repositories/asks.repo.ts` around line 49).
   - Wrap each overdue `closeAsk` in try/catch, and move the shortlist notifications to `deps.background.run`.
   - Move the orphan doc comment at `promotions.service.ts:345`.
   - Optional: migration 0005 adds a unique index for `post_loved` notifications, plus `.onConflictDoNothing()`.
6. **Medium.** `web/components/dashboard/people/spotlight-panel.tsx:49`: stale draft callbacks. Guard `onSuccess` and `onError` with `if (id !== drafted.current) return`.
7. **Low.** `web/components/shared/status-pill.tsx:19`: `filtered` should use `INBOX_TAB_LABELS.filtered` ("Kept out").
8. **Low.** `web/app/sitemap.ts:6`: add /contact, /blog, the legal pages and blog posts from `POSTS`.
9. **Low.** `web/components/dashboard/followers/import-panel.tsx:37,42`: use the Priya travel samples.

---

## 9. Build split by file ownership

No two agents edit the same file in the same wave. Every agent runs `pnpm -w typecheck` and `biome check` on the files it owns.

**Wave 1, in parallel:**

| # | Owner files | Work | Model / effort |
|---|---|---|---|
| A1 | `web/components/ui/rainbow-button.tsx`, `web/app/globals.css`, `web/components/landing/demo-button.tsx`, `demo-cta.tsx`, `cta.module.css`, `DESIGN.md` | Restore rainbow, add CSS tokens, DemoButton rainbow variant, Demo CTA copy and buttons, design rule | sonnet / medium |
| A2 | `scratchpad/tools/record-product.mjs`, `web/public/frames/product/*` | Record 5 acts, ffmpeg, size check, sample-frame review | sonnet / high |
| A3 | `web/components/landing/device-frames.tsx`, `loop-live.tsx`, `loop-live-data.ts`, `loop-data.ts`, `demo-data.ts`, `loop-static.tsx` | Frames primitive, live layer, **canonical demo facts**, loop copy | opus / high (cross-cutting data source) |
| A4 | `problem-*.ts(x)`, `fans-*.ts(x)`, `creators-*.ts(x)`, `faq.tsx`, `web/components/layout/footer.tsx`, `footer.module.css` | Mechanical copy swaps from section 2 (Mira/her → you/your, labels, FAQ entries), numbers imported from `demo-data.ts` once A3 lands | haiku / low, **reviewed by A15** |
| A5 | `connect-section.tsx`, `connect.module.css`, `showcase-strip.tsx`, `showcase-motion.tsx`, `showcase.module.css`, `trust-section.tsx`, `trust.module.css` | Challenges block, showcase re-cover, trust snippets | sonnet / high |
| A6 | `web/components/layout/dashboard-nav.ts`, `sidebar.tsx`, `app-shell.tsx`, `web/app/(dashboard)/dashboard/layout.tsx` | Collapsible sidebar (section 5) | sonnet / high |
| A7 | `shared/src/platform-lookup.ts`, `shared/src/index.ts`, `api/src/lib/platform-lookup.ts`, `api/src/lib/platform-fixtures/*`, `api/src/controllers/platform.controller.ts`, `api/src/routes/studio.routes.ts`, `api/src/config/env.ts`, `api/src/ai/tasks/suggest-setup.ts`, `api/src/ai/index.ts`, `api/src/ai/types.ts`, plus tests | Lookup + suggestions API, SSRF-safe parsing, avatar fetch, caps | opus / high (security, cost) |
| A8 | `shared/src/types.ts`, `api/src/services/spaces.service.ts`, `promotions.service.ts`, `challenges.service.ts`, `posts.service.ts`, `api/src/repositories/asks.repo.ts`, `api/src/db/seed/generate-content.ts`, `api/src/ai/fake.ts` (exports + `suggestSetup` fake), optional migration 0005 | Leftovers 1 (API half), 4 and 5, plus the fake for A7 | opus / medium |
| A9 | `web/app/providers.tsx`, `web/components/theme-provider.tsx`, `web/package.json`, `web/lib/legal.ts`, `web/app/sitemap.ts`, `import-panel.tsx`, `status-pill.tsx`, `toolbar.tsx`, `spotlight-panel.tsx` | Leftovers 2, 3 and 6-9 | sonnet / medium |

**Wave 2, after the dependencies listed:**

| # | Owner files | Work | Model / effort |
|---|---|---|---|
| A10 | `web/components/layout/navbar.tsx`, `nav-scroll.ts`, `nav.module.css` | Link order, scroll-spy chip fix, rainbow swap (needs A1) | sonnet / medium |
| A11 | `hero.tsx`, `hero-product.tsx`, `hero-product-data.ts`, `hero-chips.tsx`, `hero-intro.tsx`, `hero.module.css` | Product hero (needs A1 and A3) | sonnet / high |
| A12 | `loop-frames.ts`, `loop-canvas.tsx`, `loop-scene.tsx`, `loop-section.tsx`, `loop.module.css` | Canvas engine, layer stack, sync (needs A2 and A3) | opus / high |
| A13 | `web/components/onboarding/platforms-step.tsx`, `handle-step.tsx`, `taste-step.tsx`, `communities-step.tsx`, `onboarding-templates.ts`, `onboarding-stepper.tsx`, `web/api/*` client | Paste → chips → pre-fill → suggestions with demand hints, skip path (needs the A7 contract) | sonnet / high |
| A14 | `api/src/workers/refresh-followers.ts`, `api/src/controllers/cron.controller.ts`, `api/src/routes/cron.routes.ts`, `api/vercel.json`, `web/components/bio/creator-header.tsx`, both `[handle]` opengraph-image routes | Daily refresh; finish leftover 1 on the web side (needs A7 and A8) | sonnet / medium |
| A15 | `web/app/(public)/page.tsx`, `docs/superpowers/specs/2026-10-09-creator-pivot-design.md` | Section order; review A4's haiku copy against the banned words in spec section 9 | sonnet / medium |

**Wave 3:**

| # | Work | Model / effort |
|---|---|---|
| A16 | Integration review: screenshots of the landing at 1440 and 390 (loop at 6 points), the dashboard sidebar at 1280/900/390, and onboarding with fixtures. Then re-score creator focus against the table in section 1 | opus / high |
| A17 (optional) | Touchpoints from section 7: auth art, onboarding preview, 404, root OG image, meta | sonnet / medium |

---


---

## 11. One identity: display name and handle, asked once

**Problem (owner).** Create-account asks for "Full name" and "Username". Onboarding step 1 then asks for "Display name" and "Handle". These are the same things.
- Display name is pre-filled from the session, but the form is still shown.
- The handle is empty, so the creator types it again.
- The rules also differ: a username is 6–30 characters, while a handle is 3–30.

**Rules after this round:**

1. **Labels on /create-account** (`web/components/auth/create-account-form.tsx`, `username-field.tsx`):
   - "Full name" becomes **Display name**. Hint: "Shown on your page. You can change it later."
   - "Username" becomes **Handle**. The field shows a non-editable `fellowowners.app/` prefix. Hint: "Your link and how you sign in."
   - The status line reads `fellowowners.app/<handle> is free` and no longer `@<handle> is available`.
   - Login copy that says "username" changes to "handle or email".
2. **One rule set.**
   - `LIMITS.username` matches `LIMITS.handle`: 3–30 characters, `^[a-z0-9_.]+$`.
   - Both reject reserved handles (`isReservedHandle`).
   - The Better Auth `username()` plugin options in `api/src/auth/index.ts` use these limits, and its `usernameValidator` also rejects reserved handles.
3. **One namespace.**
   - A handle is free only when no user has it as a username **and** no space has it as a handle.
   - Add a public, rate-limited `GET /api/handle-available?h=` returning `{available, reason?: 'invalid'|'reserved'|'taken', suggestions[]}`.
   - The create-account field uses this endpoint instead of `authClient.isUsernameAvailable`.
   - The server enforces it as well: a Better Auth `databaseHooks.user.create.before` (or `user.update.before`) rejects a username that equals an existing space handle. Space creation rejects a handle that is another user's username.
4. **Onboarding does not ask again** (`web/components/onboarding/onboarding-stepper.tsx`, `handle-step.tsx`):
   - When the session user has a username that is free as a handle, or is already theirs, step 1 shows a one-line summary card instead of the form. The card reads **"Your page: fellowowners.app/priyashah · shown as Priya Shah"** and has a **Change** button that reveals the existing form.
   - Continue moves straight on to platforms. The progress dots and "Step 1 of 4" copy reflect this.
   - Users who signed up with Google, Apple or Facebook (no username) still see the form, pre-filled with a suggestion derived from their name.
   - Restored drafts keep working.
5. **Change keeps them in sync.**
   - If the creator changes the handle in onboarding, `POST /api/studio/space` creates the space with the new handle **and** sets `user.username` to it in the same transaction.
   - It returns 409 `handle_taken` on any collision.
   - Users with no username get one set the same way.
6. **Tests:**
   - The API returns 409 when a handle equals another user's username.
   - It returns 409 when a username equals a space handle.
   - Reserved handles are rejected on both paths.
   - Creating a space with a changed handle updates the username.
   - `GET /api/handle-available` is rate-limited and returns suggestions.
   - Fix or replace the known failing test "reports whether a username is free" under the new rules.

Owner of this work: one opus agent. Auth is security-relevant, so a different-model reviewer checks it.

---

## 10. Open questions: resolved

1. **Rainbow:** it goes on "Try the live demo". "Get started" is the glass secondary.
2. **Apify:** all four platforms are live. X degrades to labelled sample data on actor failure or quota.
3. **Sidebar:** the default is collapsed at 72px.
4. **Reorder and shorten:** yes.
