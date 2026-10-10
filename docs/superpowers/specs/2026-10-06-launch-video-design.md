# Fellow Owners launch video: design

Status: approved by delegation (the product owner gave full decision power on 2026-10-06) · Path: architectural (new Remotion project)

## 1. Intent

**What the user asked for.** One product launch video, 60 to 90 seconds, structured hook, problem, solution, demo, outro. Heavy motion graphics, as much as the tools allow. The frosted glassmorphism "Clubhouse" theme from DESIGN.md. Built with Remotion following its best practices. Built by 10+ agents, each on its own task, with model and effort matched to the task.

**What the video must do.** In 84 seconds a creator (100K to 2M followers) or a judge understands the whole loop: followers become communities, members share ideas and form teams, an AI version of the creator triages everything with a reason, and the creator backs the best project with a showcase page and a tracked link. They leave knowing the tagline ("Turn followers into fellow owners.") and the URL.

**Success criteria.**
- 84 s, 1920 x 1080, 30 fps, five acts in the asked order.
- Every frame reads as the Clubhouse: pewter shell, haze, glass pills, pastel cards, lime for "here", one purple action, Inter only.
- Heavy motion: 3D camera moves on product UI, a clay sphere particle system, kinetic type, odometers, path draws, list re-sorts, match cuts between acts. Calm, never bouncy (brand rule).
- Every on-screen sentence stays up at least 1.5 s and clears contrast (ink on haze).
- Plays in Remotion Studio with no errors; every scene opens on its own as a connected composition.

**Assumptions (decided, not asked).**
- Audience: creators and Startupathon judges; channel: website, YouTube, X, Product Hunt. Hence 16:9. A vertical cut is a follow-up, not v1.
- No voiceover (paid TTS, and the copy works muted on social autoplay). On-screen type carries the story.
- Music: a procedurally synthesized scratch bed (120 BPM, made by a script, no license risk) plus Remotion's free SFX. Marked as a temp track that is easy to swap.
- Demo content is the seeded demo space (Mira Kapoor, Arjun Mehta, six communities), copied from `web/components/landing/*-data.ts`.
- No final MP4 export by default (Remotion skill: preview in Studio; render only on explicit request). Verification renders sampled stills.

## 2. Format and project

| Item | Decision |
|---|---|
| Location | `video/` at the repo root, a standalone npm project scaffolded by `create-video` (blank, no Tailwind). Not in the pnpm workspace; excluded from root Biome. |
| Remotion | 4.0.533 (latest, matches the skill) |
| Size, rate | 1920 x 1080, 30 fps |
| Length | 2520 frames = 84 s = 42 bars at 120 BPM (1 beat = 15 frames, 1 bar = 60 frames) |
| Fonts | Inter 400, 500, 600 via `@remotion/google-fonts/Inter`, latin |
| Icons | `lucide-react`, 1.5 px stroke |
| Studio | `npx remotion studio --port=3100` (port 3000 belongs to another project; never touch it) |

### Timeline (single source of truth: `video/src/timeline.ts`)

| # | Scene (composition id) | Bars | Frames | Time |
|---|---|---|---|---|
| 1 | Hook | 0 to 4 | 0 to 239 | 0:00 to 0:08 |
| 2 | Problem | 4 to 10 | 240 to 599 | 0:08 to 0:20 |
| 3 | Solution | 10 to 18 | 600 to 1079 | 0:20 to 0:36 |
| 4 | FanJoin (Demo 01) | 18 to 23 | 1080 to 1379 | 0:36 to 0:46 |
| 5 | Triage (Demo 02a) | 23 to 27 | 1380 to 1619 | 0:46 to 0:54 |
| 6 | Today (Demo 02b) | 27 to 31 | 1620 to 1859 | 0:54 to 1:02 |
| 7 | Build (Demo 03) | 31 to 38 | 1860 to 2279 | 1:02 to 1:16 |
| 8 | Outro | 38 to 42 | 2280 to 2519 | 1:16 to 1:24 |

Scenes play back to back with no overlap (`<Series>`, or `<TransitionSeries>` with overlays only), so every cut lands on a bar line and the music, built from the same file, stays in sync. Transitions are designed as match cuts inside the scenes (section 6).

## 3. Visual system for video (DESIGN.md translated to motion)

Everything in DESIGN.md holds unless this section says otherwise. The video is brand register (like the landing page), so type is larger and motion is richer than product UI, but the feel stays "soft and settled".

**Surfaces.**
- `PageBackdrop`: Soft Daylight Grey #F2F2F3 with the landing hero's faint haze (radial periwinkle, sea glass, sand at about 0.45 alpha, lower right).
- `ShellStage`: the page with the Pewter Shell (#DADADC) inset 40 px, radius 40, and the canonical haze from DESIGN.json: `radial-gradient(38% 53% at 53% 79%, rgba(174,184,230,.72), transparent 100%), radial-gradient(40% 41% at 71% 102%, rgba(159,208,215,.88), transparent 100%), radial-gradient(70% 60% at 97% 80%, rgba(215,204,182,.9), transparent 100%), #DADADC`. The haze may breathe slowly (a few percent of position and alpha over seconds).
- Glass: flat `rgba(255,255,255,0.45)`, no `backdrop-filter`, only on the shell, only holding controls and titles (The Still Glass Rule). Over photos or the loop footage, chips are Pure White instead.
- Cards: Paper White #F9F9FA, Pure White #FFFFFF, Apricot #FFF3E3, Lavender #F1ECFF, Aqua #E1F7F9; radii 28 (cards), 24 (idea), 20 (chips), 16 (fields), 14 (tiles), 40 (shell), pills 9999.

**Color rules (unchanged from DESIGN.md).** One solid purple #7C3AED button per frame, and purple nowhere else. Lime #E8FA8B only marks "here" or an AI pick (active nav, active loop stage, AI chips, chart tooltip), always with ink on top. Brick Red #DC2626 only for the notification badge. Words on the hazed shell are ink #2D2D30 only. No pure black, no gradient text, no glow, no sparkles outside the AI chip, no colored side stripes.

**Shadows.** Flat at rest. Exceptions: overlays (side panel, toast, popover) use Overlay Soft `0 24px 64px -16px rgba(45,45,48,.22)`; device-level objects floating in 3D (the dashboard shell, the phone, the browser frame) may use a soft ambient `0 60px 140px -40px rgba(45,45,48,.28)` to sell depth. Never on cards inside them.

**Type scale (Inter, sentence case, no uppercase labels, tabular figures on every number).**

| Role | Size / line / tracking / weight |
|---|---|
| Tagline (kinetic hero) | 150 / 0.95 / -0.035em / 500 |
| Act statement | 120 / 1.0 / -0.03em / 500 |
| Hero number (odometer) | 220 / 1 / -0.03em / 600, tnum |
| Demo caption | 80 / 1.05 / -0.02em / 500 |
| Support line | 48 / 1.25 / -0.01em / 400 or 500 |
| UI mockups | product tokens (DESIGN.md) times camera scale; anything meant to be read is at least 22 px on screen |

Safe area for key text: at least 140 px from the left and right edges, 100 px from top and bottom. Nothing readable sits under another moving layer.

**Motion language: calm but rich.**
- Easing: entrances ease-out-expo `Easing.bezier(0.16,1,0.3,1)`; state changes ease-out-quart `(0.25,1,0.5,1)`; camera moves ease-in-out-cubic `(0.65,0,0.35,1)`; exits ease-in-cubic `(0.32,0,0.67,0)`. `Easing.spring({damping: 200})` is allowed (no overshoot). No bounce, no elastic, no overshoot.
- Durations: element entrances 12 to 24 frames; staggers 3 to 6 frames; camera moves 30 to 90 frames; holds of 45+ frames on every sentence.
- Big moves land on beats (multiples of 15 frames from the scene start).
- Techniques in use: 3D perspective camera on product UI (perspective 2400 px), parallax layers, line mask reveals, word staggers, odometer digit rolls, number tickers, SVG path draws (`@remotion/paths`), FLIP-style re-sorts, typewriters with caret, cursor and tap choreography, a clay sphere particle field with depth sort and depth-of-field, match cuts, zoom-throughs and whip pans with fake directional blur (SVG `feGaussianBlur stdDeviation="N 0"`), and a subtle animated grain overlay (anti-banding on the haze).
- Interaction mimicry follows DESIGN.md: presses scale 0.98, hovers change color only, the tab underline grows in place.
- Continuous take (adopted 2026-10-09 from the prompt-motion.com launch films): every scene is made out of the previous one. Objects enter by morphing from something already on screen, rising out of a mask, growing from zero, drawing on, or pushing in; they leave by pushing out, masking away, shrinking to zero, or morphing into the next thing. No crossfades between different objects and no blur-ins as entrances (blur stays for motion and depth of field). Floods overscale past the frame corners and take about 9 frames. In product UI scenes a cursor visibly triggers every state change and the camera zooms screen-studio style to where it acts, the cursor scaling with the camera. Something moves on every beat; nothing is fully static for more than 15 frames. Text swapping inside a morphing shape gets its own mask.

**Remotion rules (from the remotion-best-practices skill).** Everything is driven by `useCurrentFrame()` and `interpolate()` with explicit clamps; no CSS transitions or animations; `fps` from `useVideoConfig()`; `scale`, `translate`, `rotate` CSS properties over `transform` where possible (3D chains with `perspective`/`rotateX`/`rotateY` may use `transform`); `premountFor={fps}` on every timed component; assets through `staticFile()`; images with `<Img>`; fonts loaded in the module that uses them; deterministic randomness (`random(seed)` from remotion, `@remotion/noise`), never `Math.random()`. Key layers are `Interactive.Div` with a `name`, and keyframes stay inline where practical; particle systems and repeated rows may be programmatic (the skill allows one-template loops). Each scene is a connected composition registered in Root.

## 4. Story and copy deck

All copy is final. No em dashes, no hype words, sentence case.

| Act | On-screen text |
|---|---|
| Hook | "740,000" (odometer) · "people follow Mira." · "Until now, they were one number." |
| Problem | "Thousands of messages a week." · labels "A real project", "A paid collab", "An investor" · "The ones that matter get buried." · pills "Paid DMs", "Group chats", "Link-in-bio lists" (struck through) · "Most never get read." |
| Solution | lockup "Fellow Owners" · "Turn followers" / "into fellow owners." · "One link in your bio." · loop rail "Followers, Communities, Ideas, Collaboration, Action" with lines "740K followers, scattered." / "They join the communities that fit them." / "Members share ideas. Signals show which matter." / "Teams form around projects." / "Mira backs the best one." · card "Featured by Mira" · "It starts with one link." · "fellowowners.app/mira" |
| Demo 01 | tag "01 Share your link" · "Fans join in under a minute." · "They tap your bio link." · "One line about themselves." · "The AI suggests where they fit." |
| Demo 02 | tag "02 Your AI briefs you" · "Every pitch, summarized." · "Spam, filtered out." · "Sorted by fit, with the reason." · "Your morning briefing." · "Minutes, not hours." |
| Demo 03 | tag "03 Back what they build" · "Teams form around the best ideas." · "Drafts in your voice." · "One click to publish." · "A showcase page, and a link that counts every click." |
| Outro | lockup · "Turn followers into fellow owners." · purple "Start your space" · white "Try the demo" · "fellowowners.app" |

Product UI strings come from the demo data (Mira Kapoor, @mira, 740K, Arjun Mehta "Frontend dev who lifts", communities with members and trends, the 14 DMs with fit and reasons, the briefing, stats 1,218 / 37 / 6, the promote draft, short link `fellowowners.app/r/Gx7Lm2Qa`, 1,284 clicks, team Arjun, Priya, Leo, Sana).

## 5. Storyboard (scene-local frames)

### 1. Hook (240) on PageBackdrop
- 0 to 14: one lavender clay sphere scales in at centre; the odometer shows "1" under it.
- 15 to 29: it splits into 10 on a ring; "10".
- 30 to 74: burst to about 320 clay spheres flying toward and past the camera in 3D (six community palettes, depth sorted, depth-of-field blur near and far) while the odometer rolls to "740,000" (digit strips roll with blur); camera dollies back 1.15 to 1.0.
- 75: odometer lands on the beat with a 1.02 settle; 80 to 100 "people follow Mira." line-reveals below.
- 105 to 179: line swaps to "Until now, they were one number."; spheres are pulled into the number and vanish; "740,000" condenses to "740K"; "740K" shrinks into the MiraChip (Pure White pill: Mira's MK initials avatar on Lavender Tile, "Mira Kapoor", "740K followers").
- 180 to 239: copy exits (to 210); camera pushes in on the chip to scale 1.4; a Brick Red badge pops on the avatar at 210 and counts to 3.
- **Handoff H1 (frame 239 = Problem frame 0):** PageBackdrop; MiraChip centred at (960, 540), scale 1.4, badge "3".

### 2. Problem (360) on PageBackdrop
- 0 to 29: chip buzzes (2 px jitter); badge races up; DM bubbles burst out from behind it.
- 30 to 119: avalanche of the 14 demo DMs (white bubbles: avatar initials on a pastel tint, sender, "Instagram · 2m" meta, text, tag pill) landing on pile slots (landing `PILE` desk slots mapped to 1920 x 1080: heading block x 140 to 800, y 120 to 380; region R x 840 to 1800, y 60 to 1020; region L x 140 to 800, y 420 to 1020), tilted -7 to 6 degrees, plus about 40 smaller blurred background bubbles for volume. MiraChip shrinks to the top left; a Brick Red pill counts "3,214 unread". Headline line-reveals: "Thousands of messages a week."
- 120 to 209: camera drifts across the pile; the 3 gems (Arjun idea, Northwind collab, Leah investment) lift 1.04 with a 2 px ink ring and white label pills; spam bubbles slam on top (4 px decaying shake); headline swaps to "The ones that matter get buried."
- 210 to 269: pile blurs and dims behind; pills "Paid DMs", "Group chats", "Link-in-bio lists" land one per beat; an ink strike draws through each 7 frames after it lands.
- 270 to 329: "Most never get read." centred, 120 px.
- 330 to 359: everything is sucked into the centre and converges on a 20 px ink dot.
- **Handoff H2 (frame 359 = Solution frame 0):** PageBackdrop; 20 px ink #2D2D30 dot at (960, 540).

### 3. Solution (480)
- 0 to 44: the dot grows into the logo mark's filled circle; the outlined circle slides out from behind it; the ShellStage grows from the mark to full frame and the haze blooms in from the lower right; "Fellow Owners" reveals letter by letter beside the mark.
- 45 to 89: the lockup slides to the shell's top-left logo position.
- 60 to 149: tagline "Turn followers" / "into fellow owners." line-reveals (150 px, centred); "One link in your bio." at 105.
- 150 to 179: tagline recedes into depth with blur.
- 165 to 419: the clay loop footage (120 frames from `web/public/frames/loop/desktop`, 1600 x 900) fills the shell window (rounded 40, cover), played at half speed with crossfades between neighbouring frames and a slow 1.0 to 1.08 push. A Pure White pill rail at the bottom lists the five stages; the active stage is a lime pill (aria-current semantics), a progress hairline fills; the stage line sits above the rail. Stage spans (scene frames): Followers 180 to 227, Communities 228 to 285, Ideas 286 to 327, Collaboration 328 to 365, Action 366 to 419. From 390 the "Featured by Mira" card (Gym-log app for creators, Builders, team of 4, 212 signals, avatar stack) sits on the lifted card's face (fractions of the source frame: left 0.364, top 0.157, right 0.634, bottom 0.811) and tracks the push.
- 420 to 479: footage scales down into the shell and fades; "It starts with one link." reveals; a glass UrlPill types "fellowowners.app/mira" with a caret; the text exits by 470.
- **Handoff H3 (frame 479 = FanJoin frame 0):** ShellStage; UrlPill centred at (960, 540), 720 x 88, glass, Inter 500 40 px ink "fellowowners.app/mira", no caret.

### 4. FanJoin (300) on ShellStage
- 0 to 30: the UrlPill shrinks into the address bar of a phone (in-app browser chrome) while the phone body scales in around it at its final spot (right half, centre x about 1340); tag "01 Share your link" and "Fans join in under a minute." enter on the left.
- 30 to 110: Mira's bio page builds on the phone (96 px MK initials avatar, name, bio, follower chips YouTube 410K, Instagram 260K, X 70K, "Join a community" with pastel community cards and member counts, "Send Mira a pitch"); a tap lands on Builders' Join. Support line "They tap your bio link."
- 110 to 200: Join card (progress dots, "Step 2 of 3"); the intro types "Frontend dev who lifts" with a caret while the camera zooms 1.5x on the field; support line "One line about themselves."
- 175 to 240: "AI suggested" lime chips pop on Builders and Fitness Crew with the reason "Matches your intro: frontend dev who lifts"; taps select them (2 px ink border, check). Support line "The AI suggests where they fit."
- 240 to 275: purple "Join 2 communities" pressed (0.98), success screen, Builders count ticks 412 to 413.
- 276 to 299: the left column pushes out left (276 to 286); the phone bezel shrinks away while its flat pewter page floods past the frame corners (288 to 297, EASE.inOut).
- **Handoff H4 (frame 299 = Triage frame 0):** solid #DADADC fills the whole frame, nothing else.

### 5. Triage (240) on PageBackdrop
- 0 to 14: the full-frame pewter contracts (radius 0 to 40) into the dashboard shell at its 3D start pose while the haze and the shell contents fade up.
- 0 to 60: the creator dashboard shell (header "Welcome, Mira 🎉", glass tray with search, bell plus "9+" badge, MK avatar with online dot; glass sidebar with Inbox active in lime; tab bar All, Collabs, Investment, Ideas, Press, Fan notes, Filtered; toolbar; white table card) settles from a 3D angle (rotateX 18, rotateY -22, pushed back) to a slight 3/4 view on the right two thirds; tag "02 Your AI briefs you" and "Every pitch, summarized." on the left.
- 20 to 90: DMs fly in as small white pills and open into rows (avatar, type, one-line AI summary, fit pill filling to its score, status pill). Spam rows show the "AI reviewing" chip.
- 95 to 130: spam rows slide out into the Filtered tab; its count ticks to 4; line "Spam, filtered out."
- 130 to 175: rows re-sort by fit (88, 82, 76, 71, 69, 64, 58, 41, 35, 22) with a lift during the move; line "Sorted by fit, with the reason."
- 175 to 210: side panel slides in for Arjun's pitch: "AI pick" chip, fit 88, reason "Matches “fitness tools I would use myself” in your taste profile."; the camera leans in so the reason reads.
- 210 to 239: panel and copy exit; the dashboard re-centres flat.
- **Handoff H5 (frame 239 = Today frame 0):** PageBackdrop; dashboard shell flat, centred, 1680 px wide, Inbox active, table visible, no panel.

### 6. Today (240) on PageBackdrop
- 0 to 20: the lime pill slides from Inbox to Today; the content swaps to Today.
- 20 to 80: Today assembles with staggers: "Fanbase overview" glass band, stat cards (Members 1,218 "+18% this week", Ideas this week 37, Opportunities waiting 6) with tickers, "This week" card, "Your AI briefing" card with three AI-pick highlights, "Inbox mix" donut drawing, "Top ideas" table, "Fanbase activity" chart drawing with a lime tooltip.
- 60 to 200: camera flies in on the briefing (scale to about 1.6), glides down the highlights in time with the beat, pans to the stat cards, pulls back. Caption pill "Your morning briefing.".
- 185 to 224: "Minutes, not hours." at 120 px over the dimmed, blurred dashboard.
- 222 to 239: highlight 1 lifts out of the briefing card and morphs into an empty Paper White card while the dashboard pulls back into the full ShellStage frame and its contents mask away.
- **Handoff H6 (frame 239 = Build frame 0):** ShellStage plus an empty Paper White card, radius 24, left 510, top 300, 900 x 520.

### 7. Build (420) on ShellStage
- 0 to 120 (team): idea card (Builders chip, "Gym-log app for creators", summary, signals ticking to 212, avatar stack) and a team card (Frontend Arjun, Backend Priya, Mobile Leo, Designer open → Sana requests → accepted; status pills warm then cool; the stack grows to 4). Tag "03 Back what they build"; "Teams form around the best ideas." At 95 to 120 a cursor presses the card's purple Promote.
- 120 to 300 (promote): composer: platform tabs X (active) / Instagram / LinkedIn / YouTube; the draft types in Mira's voice with the character count; right panel with the post preview, the lavender summary well (Platform, Characters, Short link with Copy, Clicks so far) and the purple Publish; Copy and Open in X pills. "Drafts in your voice." then "One click to publish." Publish pressed at about 270, spinner, then the toast "Published. Your showcase page is live."
- 300 to 419 (showcase): a browser frame with the showcase page (fellowowners.app/mira/gym-log, "Live" pill) flies in with a 3D tilt; the tracked link card counts clicks 0 to 1,284 while its sparkline draws in Marigold with a lime peak tooltip. "A showcase page, and a link that counts every click."
- 396 to 419: everything collapses into the tracked-link card, which shrinks into one lavender clay sphere at the centre.
- **Handoff H7 (frame 419 = Outro frame 0):** ShellStage plus one clay sphere (Designers palette, r 34) at (960, 540).

### 8. Outro (240) on ShellStage
- 0 to 60: the single sphere bursts into 240 clay spheres that gather into six community clusters on a ring around the centre; thin white lines (70% alpha, no glow) draw between them.
- 50 to 110: logo lockup builds at centre (96 px); "Turn followers into fellow owners." reveals beneath.
- 110 to 170: purple "Start your space", white "Try the demo", "fellowowners.app".
- 170 to 239: hold; clusters drift. The last frame is a clean end card.

## 6. Handoffs (continuity contract)

| Cut | Type | Contract |
|---|---|---|
| H1 Hook → Problem | match | `MiraChip` at (960, 540), scale 1.4, badge 3, PageBackdrop |
| H2 Problem → Solution | match | 20 px ink dot at (960, 540), PageBackdrop |
| H3 Solution → FanJoin | match | glass `UrlPill` 720 x 88 at (960, 540) on ShellStage |
| H4 FanJoin → Triage | flood | the phone's flat pewter page floods past the frame corners (about 9 frames); boundary frame = solid #DADADC full frame; Triage contracts it into the dashboard shell |
| H5 Triage → Today | match | dashboard flat, centred, 1680 px wide, Inbox active |
| H6 Today → Build | morph | briefing highlight 1 lifts out and becomes an empty Paper White card (radius 24) at left 510, top 300, 900 x 520 on ShellStage; Build grows the idea card out of it |
| H7 Build → Outro | morph | everything collapses into one clay sphere (Designers palette, r 34) at (960, 540) on ShellStage; Outro bursts it into the six clusters (bookends the Hook's single sphere) |

The shared elements (`PageBackdrop`, `ShellStage`, `MiraChip`, `UrlPill`, `DashboardShell`) come from the foundation kit so both sides of a cut render identical pixels.

## 7. Audio

- **Music**: `video/scripts/make-music.ts` (Node 24 runs TypeScript directly; no dependencies) writes `video/public/audio/music.wav` (44.1 kHz, 16-bit stereo, 84 s) from `src/timeline.ts`. 120 BPM. Hook: sub pulses and a rising filtered pad into bar 4. Problem: B minor, busier hats, sparse notification-like pings, a two-beat drop-out before bar 10. Solution: an impact at bar 10, warm D major chords, groove from bar 12, plucked arpeggio (Karplus-Strong) from bar 14. Demo: steady groove, small fills at bars 23 and 31. Outro: drums drop at bar 38, final chord hit at bar 40, tail. Peak normalised to -1 dBFS, no clipping. A temp track: one file to swap.
- **SFX**: downloaded from `remotion.media` into `video/public/sfx/` (whoosh, whip, switch, mouse-click, ding, page-turn, shutter-modern), placed by the assembly step on taps, presses, toggles, whips, success moments; volumes 0.2 to 0.45, never louder than the music's peaks.

## 8. Architecture

```
video/
  public/loop/frame_0001.webp … frame_0120.webp   copied from web/public/frames/loop/desktop
  (no photo: web/public/demo/mira.jpg is an empty placeholder, so Mira is an MK initials avatar)
  public/audio/music.wav, public/sfx/*.wav
  scripts/make-music.ts
  src/index.ts, Root.tsx, LaunchVideo.tsx
  src/timeline.ts   bars, durations, starts (shared with the music script)
  src/theme.ts      tokens, type scale, easings, shadows, haze
  src/fonts.ts      Inter loader
  src/data.ts       demo data (from web/components/landing/*-data.ts)
  src/motion/       easing, reveal, stagger, Odometer, Ticker, Typewriter, DrawPath, Camera, WhipBlur, seeded helpers
  src/components/   backdrops, logo, glass and pills, cards, chips, buttons, avatars, DashboardShell, PhoneFrame, BrowserFrame, Cursor, ClaySphere, SphereField, DMBubble, ChapterTag, KineticLines, MiraChip, UrlPill, Grain
  src/kit/Kit.tsx   contact sheet of every component (QA composition)
  src/scenes/       Hook, Problem, Solution, FanJoin, Triage, Today, Build, Outro (one file each, optional helper folder each)
```

**Ownership** (prevents parallel edit conflicts): the foundation owns `theme`, `fonts`, `data`, `motion/`, `components/`, `kit/`, `Root.tsx` and the placeholder scenes; each scene builder owns only its scene file and `src/scenes/<scene>/`; the assembly owns `LaunchVideo.tsx` and `src/audio/`; the audio builder owns `scripts/` and `public/audio`, `public/sfx`. Scene builders never edit shared files; a missing primitive is built locally in the scene folder.

## 9. Verification

- `npx tsc --noEmit` and the template's ESLint (`@remotion/eslint-config`) pass.
- Sampled stills: `npx remotion render <id> out/<id> --frames=<list> --image-format=jpeg --scale=0.5 --concurrency=2`, viewed frame by frame.
- Continuity: frames on both sides of every cut (H1 to H7) compared.
- Contact sheets: every 15th frame of the full video at quarter size, tiled with ffmpeg, reviewed for pacing and density.
- Reviews by distinct lenses: brand compliance (DESIGN.md), motion direction, Remotion technical, copy. Findings fixed, then re-checked.
- Studio opens on `LaunchVideo` with no runtime errors; every scene composition opens on its own.

## 10. Build plan in agents

| Task | Model | Effort | Why |
|---|---|---|---|
| Foundation kit, motion library, Root | opus | high | every scene depends on it |
| Music and SFX | sonnet | high | DSP code, well-specified |
| Kit audit against DESIGN.md (fix in place) | sonnet | high | catch design drift before it spreads |
| Hook | opus | xhigh | particle system, odometer, first impression |
| Problem | opus | high | pile choreography, implosion |
| Solution | fable | high | brand reveal and story beat |
| FanJoin | sonnet | high | phone UI, typing, selection |
| Triage | opus | high | morph into rows, re-sort, camera |
| Today | sonnet | high | dashboard build, tickers, chart draws |
| Build | sonnet | high | team, composer, showcase |
| Outro | sonnet | medium | lockup and CTA |
| Assembly, audio mix, continuity | opus | high | cross-scene judgment |
| QA contact sheets | haiku | low | mechanical rendering |
| Brand review | sonnet | high | rule-by-rule check |
| Motion and direction review | fable | high | taste and pacing |
| Technical review | sonnet | medium | determinism, Remotion rules |
| Copy review | haiku | low | string-level checks |
| Fixers (per file group) | sonnet / opus | medium | apply verified findings |

A failed or empty agent result is retried once on opus.
