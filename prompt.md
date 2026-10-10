# Fellow Owners: image and design prompts

Every prompt behind the auth redesign, in one place: the images for `/gpt-image-2` (one for the auth screens, one per onboarding step, the 404 page and the link-share card), then the briefs for `/signup-login-page-generator` and `/ui-ux-pro-max`.

All images live in one world (soft matte clay diorama, faceless rounded figurines, pewter walls, pastel nooks). Stock libraries such as Lummi have nothing in this look, so each image is generated from its prompt here; mixing in a different style would break the set.

## 1. /gpt-image-2: the auth image

**Status: made and switched on.** `web/public/auth/auth-art.webp` (1254 x 1254 WebP) fills the image column beside the form on every auth screen (/login, /create-account, /verify-otp, /forgot-password, /reset-password) from 1024px wide. Below 1024px the column is hidden and phones never download it. Run this prompt again only to replace the picture: the command writes over the same file, so no code changes.

```text
Intended use: the image column beside the log-in and sign-up forms of Fellow Owners, a web app where creators turn followers into communities. The column crops this square image anywhere from 3:4 portrait to 3:2 landscape, and a white text card covers the lower-left corner, so keep every important element inside the central 60% of the frame and keep the lower-left area (about 55% wide, 40% tall) and the top-left corner plain and light.

Scene: a bright, calm miniature clubhouse lounge built as a soft matte clay diorama, seen from a gentle three-quarter angle slightly above. Smooth pewter-grey floor and walls (#DADADC). Soft window daylight from the upper left; across the lower right the light pools into a soft haze of periwinkle (#AEB8E6), sea-glass (#9FD0D7) and warm sand (#D7CCB6).

Subject: three small friendly groups of faceless rounded capsule figurines gathered around low round tables, each group in its own rounded nook: apricot cream (#FFF3E3, deeper #FFE6C4), lavender mist (#F1ECFF, deeper #E3D9FF) and pool aqua (#E1F7F9, deeper #C9F0F4). One figurine walks in toward the nearest group, which turns to welcome it; one empty seat with a small lime (#E8FA8B) cushion waits for it.

Details: behind the groups, two large overlapping circles stand like a doorway, one an open ring and one a solid soft-charcoal disc (#2D2D30), the only nod to the brand mark. Rounded edges everywhere, matte surfaces, soft contact shadows, shallow depth of field, clean high-detail 3D render; warm, organized, welcoming; light theme.

Constraints: square 1:1. No text, letters, numbers, logos, phones, laptops or screens. No stars, sparkles, neon, glow or lens flare. No dark scene, no purple wash, no realistic faces.
```

### Run it

**With Claude:** type `/gpt-image-2 Make the auth image from prompt.md`.

**By hand, in Git Bash at the repo root:**

1. Set your key for this shell only: `export OPENAI_API_KEY=...` (never in a file).
2. Save the script from the gpt-image-2 skill (its "The CLI script" section) as `gpt_image_cli.py`. Python and its `openai` and `python-dotenv` packages are already installed here.
3. Save the prompt above as `auth-art.txt`, then run:

```bash
python gpt_image_cli.py -p "$(cat auth-art.txt)" --size 2048x2048 --quality high --format webp --compression 90 -f web/public/auth/auth-art.webp
```

Notes for this machine: `python3` opens the Microsoft Store stub, so use `python`. Use Git Bash, not Windows PowerShell, which mangles the quote marks inside `$(cat ...)`. OpenAI bills every call and each quality step costs about ten times the one below, so try `--quality low` first if you are exploring. Delete `auth-art.txt` and the script afterwards; they are not part of the app.

Throw it away and run again if you see:
- text, letters, numbers, a logo, a sign, a screen, or a star, sparkle or asterisk shape
- faces on the figurines, glow, neon, a dark mood, or a purple flood
- busy detail in the lower left or the top-left corner (the caption card and the demo pill cover them)

### How it is used

The picture fills the whole column in a panel with 28px corners, cropped to the window's shape: about 3:4 portrait on a 1024 x 768 screen, a little wider than square on most laptops, about 3:2 at 1920 x 1080. A white demo pill sits on its top-left corner and a white caption card ("Turn followers into fellow owners." plus one line) on its lower left, so no words ever sit on the picture. The switch and the crop point live in `web/components/auth/auth-art.ts`:

```ts
export const AUTH_ART: AuthArt | null = {
  src: '/auth/auth-art.webp',
  alt: '',
  // Keeps the newcomer walking in (right of centre) in frame when the column turns portrait.
  focus: '72% 45%',
};
```

Set it to `null` and the column shows real product moments from the demo space instead. A new picture with its subject elsewhere only needs a different `focus` (a CSS `object-position`).

## 1b. /gpt-image-2: onboarding, one image per step

**Status: made and switched on** (`web/components/onboarding/onboarding-art.ts`). Four portrait images, one for each step of /onboarding ("Create your space"). From 1024px wide, the current step's image fills the right-hand panel behind the live phone preview of the creator's bio link page, and it crossfades to the next one when the step changes; the "Live preview" label and its caption sit on white over its top left. Phones never show or download them.

| Step | Screen title | Save as | Size |
|---|---|---|---|
| 1 | Claim your link | `web/public/onboarding/step-1-link.webp` | 1536 x 2048 WebP |
| 2 | Where your audience is | `web/public/onboarding/step-2-platforms.webp` | 1536 x 2048 WebP |
| 3 | Communities | `web/public/onboarding/step-3-communities.webp` | 1536 x 2048 WebP |
| 4 | Taste | `web/public/onboarding/step-4-taste.webp` | 1536 x 2048 WebP |

All four live in the same world as the auth image and share one rule: **the phone covers the middle**, so every detail sits in the left third and the right third, the central column stays plain bright floor and wall, and the top-left corner stays plain for the label. Each prompt below repeats the shared style, so it works on its own and the four match.

### Step 1: Claim your link

```text
Intended use: the background of the live-preview panel on step 1 ("Claim your link") of the onboarding screen of Fellow Owners, a web app where creators turn followers into communities. A phone mockup covers the centre: keep the central column (about 45% wide, from 15% to 95% of the height) plain bright floor and wall with nothing in it, put every detail in the left third and the right third, and keep the top-left corner plain. Portrait 3:4; the panel crops it from about 3:5 to 4:5.

Scene: the front entrance of a brand-new clubhouse on its opening morning, seen straight on from slightly above. Left third: a faceless rounded capsule figurine hangs a blank round apricot sign beside a tall rounded doorway (the sign has no letters), with a fresh doormat and a potted plant at the door. Right third: a figurine holds up a large rounded key toward the door, and another waves from inside a lavender nook; high on the right wall an open ring and a solid soft-charcoal disc (#2D2D30) overlap like the brand mark.

Style: a soft matte clay 3D diorama. Smooth pewter-grey floor and walls (#DADADC), soft window daylight from the upper left, a soft haze of periwinkle (#AEB8E6), sea-glass (#9FD0D7) and warm sand (#D7CCB6) pooling low on the right. Pastel apricot (#FFF3E3, deeper #FFE6C4), lavender (#F1ECFF, deeper #E3D9FF) and aqua (#E1F7F9, deeper #C9F0F4); at most one small lime (#E8FA8B) accent. Rounded forms, soft contact shadows, shallow depth of field, clean high-detail render; warm, organized, welcoming; light theme.

Constraints: portrait 3:4, nothing in the central column. No text, letters, numbers, logos, phones, laptops or screens. No stars, sparkles, neon, glow or lens flare. No dark scene, no purple wash, no realistic faces.
```

```bash
python gpt_image_cli.py -p "$(cat step-1-link.txt)" --size 1536x2048 --quality high --format webp --compression 90 -f web/public/onboarding/step-1-link.webp
```

### Step 2: Where your audience is

```text
Intended use: the background of the live-preview panel on step 2 ("Where your audience is") of the onboarding screen of Fellow Owners, a web app where creators turn followers into communities. A phone mockup covers the centre: keep the central column (about 45% wide, from 15% to 95% of the height) plain bright floor and wall with nothing in it, put every detail in the left third and the right third, and keep the top-left corner plain. Portrait 3:4; the panel crops it from about 3:5 to 4:5.

Scene: guests arriving at the clubhouse from many places, seen straight on from slightly above. Left third: two round portals set into the wall, one apricot and one aqua, with small faceless rounded capsule figurines stepping through them, one carrying a small bag. Right third: a third, lavender portal with a short line of figurines walking in, one pausing to look back, and a bench beside it with one small lime cushion. The floor in the middle stays clean and empty.

Style: a soft matte clay 3D diorama. Smooth pewter-grey floor and walls (#DADADC), soft window daylight from the upper left, a soft haze of periwinkle (#AEB8E6), sea-glass (#9FD0D7) and warm sand (#D7CCB6) pooling low on the right. Pastel apricot (#FFF3E3, deeper #FFE6C4), lavender (#F1ECFF, deeper #E3D9FF) and aqua (#E1F7F9, deeper #C9F0F4); at most one small lime (#E8FA8B) accent. Rounded forms, soft contact shadows, shallow depth of field, clean high-detail render; warm, organized, welcoming; light theme.

Constraints: portrait 3:4, nothing in the central column. No text, letters, numbers, logos, phones, laptops or screens. No stars, sparkles, neon, glow or lens flare. No dark scene, no purple wash, no realistic faces.
```

```bash
python gpt_image_cli.py -p "$(cat step-2-platforms.txt)" --size 1536x2048 --quality high --format webp --compression 90 -f web/public/onboarding/step-2-platforms.webp
```

### Step 3: Communities

```text
Intended use: the background of the live-preview panel on step 3 ("Communities") of the onboarding screen of Fellow Owners, a web app where creators turn followers into communities. A phone mockup covers the centre: keep the central column (about 45% wide, from 15% to 95% of the height) plain bright floor and wall with nothing in it, put every detail in the left third and the right third, and keep the top-left corner plain. Portrait 3:4; the panel crops it from about 3:5 to 4:5.

Scene: the clubhouse floor settling into friendly groups, seen straight on from slightly above. Left third: an apricot nook where three faceless rounded capsule figurines sit around a low round table. Right third: a lavender nook and, nearer the viewer, an aqua nook, each with its own small group; one figurine walks toward the aqua group, which turns to welcome it, and a single lime cushion marks the empty seat waiting there.

Style: a soft matte clay 3D diorama. Smooth pewter-grey floor and walls (#DADADC), soft window daylight from the upper left, a soft haze of periwinkle (#AEB8E6), sea-glass (#9FD0D7) and warm sand (#D7CCB6) pooling low on the right. Pastel apricot (#FFF3E3, deeper #FFE6C4), lavender (#F1ECFF, deeper #E3D9FF) and aqua (#E1F7F9, deeper #C9F0F4); at most one small lime (#E8FA8B) accent. Rounded forms, soft contact shadows, shallow depth of field, clean high-detail render; warm, organized, welcoming; light theme.

Constraints: portrait 3:4, nothing in the central column. No text, letters, numbers, logos, phones, laptops or screens. No stars, sparkles, neon, glow or lens flare. No dark scene, no purple wash, no realistic faces.
```

```bash
python gpt_image_cli.py -p "$(cat step-3-communities.txt)" --size 1536x2048 --quality high --format webp --compression 90 -f web/public/onboarding/step-3-communities.webp
```

### Step 4: Taste

```text
Intended use: the background of the live-preview panel on step 4 ("Taste", the creator's private taste profile) of the onboarding screen of Fellow Owners, a web app where creators turn followers into communities. A phone mockup covers the centre: keep the central column (about 45% wide, from 15% to 95% of the height) plain bright floor and wall with nothing in it, put every detail in the left third and the right third, and keep the top-left corner plain. Portrait 3:4; the panel crops it from about 3:5 to 4:5.

Scene: a calm curator's corner of the clubhouse, seen straight on from slightly above. Left third: a faceless rounded capsule figurine at a rounded desk sorts a few blank pastel cards into two neat trays, one apricot and one lavender (the cards have no writing). Right third: a tall rounded shelf holding a few blank aqua tiles, with one small lime tile set apart on its own as a figurine reaches up to place it; high on the right wall an open ring and a solid soft-charcoal disc (#2D2D30) overlap like the brand mark.

Style: a soft matte clay 3D diorama. Smooth pewter-grey floor and walls (#DADADC), soft window daylight from the upper left, a soft haze of periwinkle (#AEB8E6), sea-glass (#9FD0D7) and warm sand (#D7CCB6) pooling low on the right. Pastel apricot (#FFF3E3, deeper #FFE6C4), lavender (#F1ECFF, deeper #E3D9FF) and aqua (#E1F7F9, deeper #C9F0F4); at most one small lime (#E8FA8B) accent. Rounded forms, soft contact shadows, shallow depth of field, clean high-detail render; warm, organized, welcoming; light theme.

Constraints: portrait 3:4, nothing in the central column. No text, letters, numbers, logos, phones, laptops or screens. No stars, sparkles, neon, glow or lens flare. No dark scene, no purple wash, no realistic faces.
```

```bash
python gpt_image_cli.py -p "$(cat step-4-taste.txt)" --size 1536x2048 --quality high --format webp --compression 90 -f web/public/onboarding/step-4-taste.webp
```

Throw any of them away and run again if you see:
- anything in the central column (the phone preview covers it, and objects peeking out around the phone look like clutter)
- text, letters or numbers on signs, cards, tiles or walls; a logo, a screen, a star, sparkle or glow
- faces on the figurines, a dark mood, a purple flood, or a style that no longer matches the other images

## 1c. /gpt-image-2: the 404 page

**Status: waiting for you.** One landscape image above the "This page isn't here." heading on the 404 page, inside its rounded pewter card (about 560px wide on a laptop, full card width on phones). The error page ("Something went wrong") stays text only: it shows when something has failed, so it should load nothing extra.

Save as `web/public/errors/not-found.webp`, 1536 x 1024 WebP.

```text
Intended use: a small illustration above the heading "This page isn't here." on the 404 page of Fellow Owners, a web app where creators turn followers into communities. Shown about 560px wide with 28px rounded corners on a light pewter card, so keep the subject in the central 70% and the edges plain. Landscape 3:2.

Scene: a quiet, empty corridor of the clubhouse on a calm morning, seen straight on from slightly above. In the centre, one faceless rounded capsule figurine stands in front of a tall rounded doorway that opens onto a plain pewter wall (nothing behind it), holding a small blank apricot card and looking back over its shoulder, gently puzzled rather than sad. To the left, a short bench with one small lime cushion; to the right, a potted plant and, further back, a lavender nook with a warm light where the others are, a short walk away.

Style: a soft matte clay 3D diorama. Smooth pewter-grey floor and walls (#DADADC), soft window daylight from the upper left, a soft haze of periwinkle (#AEB8E6), sea-glass (#9FD0D7) and warm sand (#D7CCB6) pooling low on the right. Pastel apricot (#FFF3E3, deeper #FFE6C4), lavender (#F1ECFF, deeper #E3D9FF) and aqua (#E1F7F9, deeper #C9F0F4); at most one small lime (#E8FA8B) accent. Rounded forms, soft contact shadows, shallow depth of field, clean high-detail render; calm and friendly; light theme.

Constraints: landscape 3:2. No text, letters, numbers (no "404"), arrows, signs with writing, logos, phones, laptops or screens. No stars, sparkles, neon, glow or lens flare. No dark scene, no purple wash, no realistic faces, nothing broken or sad.
```

```bash
python gpt_image_cli.py -p "$(cat not-found.txt)" --size 1536x1024 --quality high --format webp --compression 90 -f web/public/errors/not-found.webp
```

## 1d. /gpt-image-2: the link-share card

**Status: waiting for you.** The picture shown when someone shares fellowowners.app on Instagram, WhatsApp, iMessage, X, LinkedIn or Slack. The home page already asks for a large image card but has no image, so shared links show a blank card today. The card is built like the site (glassmorphism, docs/design-reference): the picture's plain left side is the same pewter as the shell, the logo sits on it in a frosted glass pill and "Turn followers into fellow owners." is set in ink beside it, so the picture itself carries no words.

Save as `web/public/share/share-art.jpg`, 2400 x 1264 JPEG (cut down to the standard 1200 x 630 card).

```text
Intended use: the background of the link-preview card of Fellow Owners, a web app where creators turn followers into communities. The logo and a short headline are set over the left side, so keep the left 45% of the frame plain, bright pewter wall and floor with nothing in it; put the whole scene in the right 55%. Platforms may trim the edges slightly, so keep the subject away from the borders. Wide 1.9:1.

Scene: the clubhouse lounge from the auth image, seen from a gentle three-quarter angle slightly above: on the right, three small friendly groups of faceless rounded capsule figurines gathered around low round tables in rounded nooks, one apricot, one lavender, one aqua; one figurine walks in toward the nearest group, which turns to welcome it, and one empty seat with a small lime cushion waits for it. Behind them, an open ring and a solid soft-charcoal disc (#2D2D30) overlap like a doorway, the only nod to the brand mark.

Style: a soft matte clay 3D diorama. Smooth pewter-grey floor and walls (#DADADC), soft window daylight from the upper left, a soft haze of periwinkle (#AEB8E6), sea-glass (#9FD0D7) and warm sand (#D7CCB6) pooling low on the right. Pastel apricot (#FFF3E3, deeper #FFE6C4), lavender (#F1ECFF, deeper #E3D9FF) and aqua (#E1F7F9, deeper #C9F0F4); at most one small lime (#E8FA8B) accent. Rounded forms, soft contact shadows, shallow depth of field, clean high-detail render; warm, organized, welcoming; light theme.

Constraints: wide 1.9:1, left 45% plain. No text, letters, numbers, logos, phones, laptops or screens. No stars, sparkles, neon, glow or lens flare. No dark scene, no purple wash, no realistic faces.
```

```bash
python gpt_image_cli.py -p "$(cat share-art.txt)" --size 2400x1264 --quality high --format jpeg -f web/public/share/share-art.jpg
```

Throw either away and run again if you see text or numbers anywhere, faces, glow or a dark mood, anything in the left 45% of the share image, or a style that no longer matches the auth and onboarding images.

## 2. /signup-login-page-generator

### Brief to paste

```text
/signup-login-page-generator Audit the signup and login pages of Fellow Owners. Read PRODUCT.md and DESIGN.md at the repo root first; DESIGN.md wins every visual decision.

Product: one link in a creator's bio that moves followers into interest-based communities, ideas and collaborations. Free to join.
Goal: account creation. No trial, no paid plan at signup, no discounts, no promo codes, no student offer.
Auth: self-hosted Better Auth 1.7 on our own Express API, with same-site cookie sessions. Email or username plus password. New email accounts confirm a 6-digit code at /verify-otp, then the page logs them in with the password they just typed. Password reset by code at /forgot-password and /reset-password. Social sign-in: Google, Apple and Facebook (Facebook stands in for Instagram, which has no general sign-in; Google is hidden inside in-app browsers because Google blocks sign-in there).
Audience: creators with 100K to 2M followers, on a laptop between shoots, and their fans, who arrive on a phone from a bio link inside the Instagram, TikTok or YouTube in-app browser and decide in seconds.
Pages (dedicated pages on the main domain, already built):
- /create-account (the old /sign-up redirects here permanently): Google, Apple, Facebook; then full name and email on one line, username with a live availability check, an optional social profile (a platform icon picker plus handle), password with a strength meter and show/hide, confirm password, a line confirming 18 or older and agreeing to the Terms of Service and Privacy Policy, and one purple "Create account" button.
- /login: Google, Apple, Facebook; then email or username, password with "Forgot password?" on the label row, "Log in", the legal line, a link to create an account, and a no-account demo (Creator view, Fan view).
Media: from 1024px wide, a two-column layout: one image column beside the form, shared by every auth screen (our own generated artwork under a white demo pill and a white caption card with the headline). No stock art.
Code: web/app/(auth)/ and web/components/auth/.

Give me: the domain and URL check, modal or page, the page structure (headline, trust signals that suit a free product with no payment step, media, form), the robots meta for each auth URL, and anything that would cost sign-ups inside in-app browsers. Keep the field list: the username powers username log-in and the social profile is optional. List findings first and change nothing until I confirm.
```

### What to expect

- **Domain and URL:** main-domain paths. Its example paths are /signup and /login; /create-account is a deliberate choice, and /sign-up redirects to it.
- **Modal or page:** dedicated pages, because the flow creates an account and confirms an email.
- **Structure:** a value headline, trust signals (privacy and terms links; no payment logos, since nothing is sold), media (the image column), a short form with social sign-in first.
- **Discount block:** none; it should say to skip it.
- **SEO:** `noindex, nofollow` on /login and `noindex, follow` on /create-account, which matches the page metadata. It may also flag that `web/app/robots.ts` disallows the auth paths, because a crawler has to load a page to read its noindex.

It may push for a shorter, email-first form. Treat that as input, not a change order: the field list is decided.

## 3. /ui-ux-pro-max

Three things on this machine differ from the skill's own docs:

- The working script is `C:/Users/Lenovo/.claude/skills/ui-ux-pro-max/ui-ux-pro-max/scripts/search.py`. The shorter `.../ui-ux-pro-max/scripts/search.py` is a git symlink Windows left as a small text file, so it does not run.
- `python3` opens the Microsoft Store stub; use `python`.
- Add `-X utf8`, or the design-system output crashes the Windows console on an emoji.

These lines work the same in Git Bash and PowerShell. DESIGN.md is the master design file, so nothing here needs `--persist`.

### Design system (read for ideas, let DESIGN.md decide)

```bash
python -X utf8 "C:/Users/Lenovo/.claude/skills/ui-ux-pro-max/ui-ux-pro-max/scripts/search.py" "creator community platform fans calm warm pastel light" --design-system -p "Fellow Owners" -f markdown
```

### UX rules for the auth forms

```bash
python -X utf8 "C:/Users/Lenovo/.claude/skills/ui-ux-pro-max/ui-ux-pro-max/scripts/search.py" "form label helper error inline validation submit" --domain ux -n 5
python -X utf8 "C:/Users/Lenovo/.claude/skills/ui-ux-pro-max/ui-ux-pro-max/scripts/search.py" "password visibility toggle autofill" --domain ux -n 5
python -X utf8 "C:/Users/Lenovo/.claude/skills/ui-ux-pro-max/ui-ux-pro-max/scripts/search.py" "social sign in buttons touch target loading feedback" --domain ux -n 5
python -X utf8 "C:/Users/Lenovo/.claude/skills/ui-ux-pro-max/ui-ux-pro-max/scripts/search.py" "animation reduced motion duration easing" --domain ux -n 5
python -X utf8 "C:/Users/Lenovo/.claude/skills/ui-ux-pro-max/ui-ux-pro-max/scripts/search.py" "accessibility contrast focus keyboard skip link" --domain ux -n 5
python -X utf8 "C:/Users/Lenovo/.claude/skills/ui-ux-pro-max/ui-ux-pro-max/scripts/search.py" "autocomplete password paste spellcheck submit inline errors" --domain web -n 6
```

Checked on 2026-10-02: every line runs. The design-system call suggests a vibrant block style, blue and orange, and Lora with Raleway; all of that loses to DESIGN.md. The forms query returns Inline Validation, Submit Feedback, Error Messages, Input Labels and Form Labels.

### Review prompt

```text
/ui-ux-pro-max Review the redesigned auth pages of Fellow Owners against your Quick Reference: /login, /create-account, /verify-otp, /forgot-password and /reset-password. Code: web/app/(auth)/ and web/components/auth/ (shell in auth-shell.tsx, tab bar in auth-nav.tsx, the image column in auth-panel.tsx with its picture in auth-art.ts, the platform icon picker in social-profile-field.tsx), with the Magic UI pieces in web/components/magicui/.

DESIGN.md at the repo root wins every conflict with your database, even where you would choose differently: Inter only (weights 400 to 600, no uppercase labels), the pewter shell with its haze, glass only for navigation chrome on the shell and never with backdrop blur, flat cards and buttons with no shadows, exactly one purple button per screen, lime only as a "you are here" marker, only ink words on the bare shell and words over the picture only on white (the demo pill and the caption card), 150 to 250ms motion that never bounces, light theme only, and no em dashes in copy. Do not propose new fonts, palettes, gradients, glow, dark mode or a different style. Where one of your rules disagrees with DESIGN.md, note it in one line and move on.

Check in this order: accessibility, touch and interaction, performance, layout and responsive, forms and feedback, animation. Test at 360px (fans arrive inside Instagram and TikTok in-app browsers), 768px, 1024px and 1440px, and with prefers-reduced-motion on.

Report a table, most severe first: file and line, rule, what is wrong, and the fix in DESIGN.md terms. Change nothing until I confirm.
```

## 4. Master Prompt: Awwwards-Winning Full-Product UI/UX & Layout Implementation (Claude Opus 5.5 / Frontier Agent)

Use the prompt below when commanding Claude Opus 5.5 or an equivalent frontier coding agent to design, build, or audit the complete Fellow Owners experience across all auth, onboarding, legal, public bio-link/dashboard, creator dashboard, settings, and marketing routes.

```xml
<system_role>
You are an award-winning Principal Design Engineer and Staff Frontend Architect specializing in bespoke, tactile digital craftsmanship (Awwwards Site of the Year caliber). You build web applications that marry haute-couture visual serenity with bulletproof engineering: zero layout shift, pristine token discipline, WCAG 2.2 AA accessibility, and micro-interactions that feel organic and weighted.

You are implementing and perfecting the entire design system and layout architecture for **Fellow Owners** ("The Clubhouse"), a platform where high-leverage creators turn social followers into active, interest-based communities, shared ideas, and collaboration pipelines.
</system_role>

<task_objective>
Design and implement an Awwwards-winning, production-grade layout and component system across ALL suites of the Fellow Owners web application:
1. **Authentication Suite** (`/login`, `/create-account`, `/verify-otp`, `/forgot-password`, `/reset-password`)
2. **Onboarding & Fan Join Suite** (`/onboarding`, `/[handle]/join`)
3. **Creator Dashboard Suite** (`/dashboard`, `/dashboard/inbox`, `/dashboard/ideas`, `/dashboard/communities`, `/dashboard/people`, `/dashboard/promote`, `/dashboard/asks`, `/dashboard/settings`)
4. **Public Bio Link & Fan Community Suite** (`/[handle]`, `/[handle]/c/[slug]`, `/[handle]/p/[id]`, `/[handle]/pitch`, `/[handle]/me`, `/[handle]/new`, `/[handle]/s/[slug]`)
5. **Legal & Documentation Suite** (`/privacy-policy`, `/terms`, `/cookies`, `/refunds`)
6. **Public Marketing & System States** (`/`, `/about`, `/pricing`, `/blog`, `/contact`, `404 not-found`, `error`)

Every single page must look and feel like part of the unified "Clubhouse" design language: calm, tactile, pastel-hued, frosted glassmorphic, and effortlessly premium.
</task_objective>

<visual_grounding_and_references>
CRITICAL: Before writing or modifying a single line of code, you MUST inspect and internalize the visual benchmark files in the workspace:

1. **Inspect all 9 reference images in `docs/design-reference/`**:
   - `e23ccb205111609.66b4db072ab21.webp`: The Master Dashboard benchmark. Study the 40px rounded Pewter Shell floating on a pale Daylight page, the warm 3-layer color haze pooling in the lower-right, the fixed frosted glass pill sidebar, the 88px header row with welcome headline + glass action tray, the glass "Fanbase overview" title band, the stacked pastel stat cards (apricot, lavender, aqua) with 56px icon tiles, the Pure White "This week" 3x3 metric grid, the Paper White AI briefing card, the 3-segment donut chart, the compact table, and the 12-week line chart.
   - `c7c71f205111609.66b4db072956c.webp`: The pastel machine card benchmark. Notice the rotating tints (apricot, lavender, aqua, white), 56px icon tiles with matching monochrome icons, 40px open breathing room, data lines at the bottom left (18px Trend numbers), and the ghost edit pencil at the bottom right.
   - `096dc0205111609.66b5eba1a844f.webp`: The POS grid and order panel benchmark. Notice the count chips inside a continuous horizontally scrolling glass pill band, the clean card grid, and the right-side summary well with one solitary purple primary button.
   - `299cc1205111609.66b4db0724b04.webp`: The Customers table benchmark. Pure White card container, Dove Grey pill header row, ruled 1px ledger dividers, ghost action icons (eye, pencil), and the signature glass pagination pill group (circular prev, up to 5 pill numbers with lime active pill, circular next).
   - `063e6f205111609.66b4efd8c9a65.webp`: Orders table, tab bar pills, and toolbar with matched 40px search square and dropdown pill.
   - `3cd1c6205111609.66b4db071dfa8.webp` & `cda9bd205111609.66b4db072a08c.webp`: Detail table rows, status pills, and dropdown selectors.
   - `bf1994205111609.66b4db072299f.webp` & `f8e7aa205111609.66b4db0725afe.webp`: Alternative dashboard balances and curve charting ergonomics.

2. **Read `DESIGN.md` (and `DESIGN.json`) at the repository root**:
   `DESIGN.md` is the normative master specification for all colors, typography, elevations, spacing, and component behaviors. It supersedes general framework habits, default Tailwind presets, or external suggestions.
</visual_grounding_and_references>

<core_design_system_and_philosophy>
### The Creative North Star: "The Clubhouse"
Fellow Owners is a warm, well-kept home where fans gather by interest and the creator drops by. It is friendly first, organized second. Nothing is sharp, nothing shouts, and exactly one purple invitation button on a screen guides action.

### The Frosted Glassmorphism Architecture
This application uses a signature, disciplined interpretation of glassmorphism:
- **Pewter Shell**: `#DADADC` with 40px corners floating on a `#F2F2F3` Daylight page.
- **The Atmospheric 3-Layer Haze**: Fixed in the lower-right quadrant of the shell:
  - Top layer: Periwinkle Haze (`#AEB8E6`, 38%x53%, peak alpha 0.72)
  - Middle layer: Sea Glass Haze (`#9FD0D7`, 40%x41%, peak alpha 0.88)
  - Bottom layer: Sand Haze (`#D7CCB6`, 70%x60%, peak alpha 0.90)
- **The Still Glass Rule**: Frosted Glass (`#FFFFFF73`, flat 45% white fill) is used ONLY for navigation chrome directly on the pewter shell: sidebar pills, icon rail items, header tray, tab bars, toolbars, count chip band, pagination, and segmented pills.
  - **ABSOLUTE RULE**: NO `backdrop-filter: blur(...)`. The in-app browsers fans arrive in (Instagram, TikTok) suffer severe GPU lag with backdrop filters. Glass is flat 45% white fill. Glass NEVER sits on content cards and NEVER sits over scrolling content.

### Color Tokens & Contrast Matrix (Strict WCAG 2.2 AA)
- **Primary / Action**: Invitation Purple (`#7C3AED`). Used ONLY for the single primary conversion button per screen and the focus ring. White text at 5.7:1 contrast.
- **Location Marker**: Clubhouse Lime (`#E8FA8B`). Used ONLY to indicate current location or an AI pick (active sidebar pill, current page, active bottom nav, current fan community, "AI pick" chip, chart tooltip). Always paired with Charcoal Ink text (12.1:1). NEVER a button fill, NEVER a content card background, NEVER text.
- **Pastel Rooms**:
  - Apricot Cream (`#FFF3E3`) with Apricot Tile (`#FFE6C4`) and Marigold (`#F2A93B` icon stroke only).
  - Lavender Mist (`#F1ECFF`) with Lavender Tile (`#E3D9FF`) and Chart Violet (`#8B5CF6` stroke only).
  - Pool Aqua (`#E1F7F9`) with Pool Tile (`#C9F0F4`) and Lagoon Teal (`#1FBFD0` stroke only).
- **Surfaces**:
  - Page: Soft Daylight Grey (`#F2F2F3`)
  - Shell: Pewter Shell (`#DADADC`)
  - Glass: Frosted Glass (`#FFFFFF73`)
  - Default Card: Paper White (`#F9F9FA`)
  - High Surface: Pure White (`#FFFFFF`, card-strong)
  - Table Header: Dove Grey (`#E9E9EB`)
- **Typography & Ink**:
  - Headings / Active Labels: Charcoal Ink (`#2D2D30`)
  - Data / Figures / Inactive Tabs: Iron Grey (`#5E5E62`, clearing 4.6:1+ everywhere)
  - Muted secondary text: Graphite Grey (`#6E6E73`, only on white/paper white)
  - Borders: Field Grey (`#8E8E94`) for inputs; Ledger Grey (`#D4D4D8`) for table row dividers; Hairline Grey (`#E5E5E8`) for card outlines; Ring Grey (`#BDBDC2`) for controls on glass.
  - Status Pills: Butter Wash (`#FFF1D6`) with Toffee text (`#A45A00`) for New/Pending; Ice Wash (`#DDF5F8`) with Harbor Teal (`#0E7490`) for Shortlisted/Active; Dove Grey (`#E9E9EB`) with Ink text for Neutral.
  - Errors & Destructive: Brick Red (`#DC2626`) for error copy (4.8:1); Signal Red (`#EF4444`) for icons and error borders only.

### Named Golden Rules (Non-Negotiable)
1. **The One Purple Rule**: Exactly ONE solid purple button per screen (e.g., "Create account", "Publish", "Join community", "Send pitch"). Outside of this primary CTA, purple exists ONLY as the keyboard `:focus-visible` outline.
2. **The Lime Means Here Rule**: Lime marks current presence. Active nav items also carry weight 600, filled icon, and `aria-current="page"`.
3. **The Flat At Rest Rule**: Cards, pills, chips, buttons, tables, and toasts carry ZERO drop shadow at rest. Depth is achieved via clean tonal elevation (Page -> Shell -> Glass -> Paper White -> Pure White).
4. **The Overlay Soft Rule**: Only floating overlays (side panel Sheet, dialogs, dropdown popovers, tooltips) cast a shadow: `box-shadow: 0 24px 64px -16px rgba(45, 45, 48, 0.22)`.
5. **The One Step Rule**: Glass sits on the shell; cards sit on the shell. A card NEVER holds another card.
6. **The Counting Rule**: Every figure that changes or compares uses tabular figures (`font-variant-numeric: tabular-nums`).
7. **The Dark Words Rule**: No light text on light backgrounds. Every label and data point must clear WCAG 2.2 AA (4.5:1+).
8. **The Reason Travels Rule**: AI suggestions or fit scores NEVER appear alone; they must always include the human-readable rationale.
9. **The Settled Press Rule**: Interactive elements scale to 0.98 on press with 150ms ease-out-quart easing. No bouncing, no rubber-banding, no layout-shifting hover lifts.
</core_design_system_and_philosophy>

<page_by_page_blueprints>
Execute or audit the following suites to perfection:

### Suite 1: Authentication (`web/app/(auth)/`)
- **Routes**: `/login`, `/create-account`, `/verify-otp`, `/forgot-password`, `/reset-password`.
- **Layout**:
  - Split 2-column desktop layout (from 1024px): Left form column on Pewter Shell with glass tab bar (`/create-account` vs `/login`); Right visual panel carrying the custom 3D diorama clay artwork (`web/public/auth/auth-art.webp`), capped by a Pure White demo pill top-left and Pure White caption card bottom-left ("Turn followers into fellow owners").
  - Mobile (<1024px): Single-column, full-bleed Pewter Shell optimized for Instagram/TikTok/YouTube in-app browsers. The heavy image is not loaded on mobile.
- **Form Architecture**:
  - Social sign-in buttons (Google, Apple, Facebook) styled as secondary Pure White pills with 1px border. Google sign-in is automatically hidden inside in-app WebViews to prevent 403 disallowed_useragent errors.
  - Inputs: Pure White fill, 16px radius, 44px height, 1px Field Grey (`#8E8E94`) border, Charcoal Ink text, floating label in Small Strong, inline error state with Signal Red icon and Brick Red text.
  - Username field with live availability feedback badge.
  - Password field with show/hide toggle and strength meter.
  - Submit Button: The screen's ONE purple button (`#7C3AED`, 48px height, full width on mobile).

### Suite 2: Onboarding & Fan Join
- **Creator Onboarding** (`web/app/(dashboard)/onboarding/`):
  - 4-step wizard: Step 1 (Claim your link), Step 2 (Where your audience is), Step 3 (Communities), Step 4 (Taste profile).
  - Stepper indicator: Current step is a 24x8px Charcoal Ink pill; completed steps are 8px ink dots; upcoming steps are 8px Field Grey dots.
  - Split view on desktop: Form on the left; live interactive mobile preview on the right, backed by the 4 dedicated portrait 3D diorama artworks (`web/public/onboarding/step-1` to `step-4`) crossfading smoothly.
- **Fan Join Flow** (`web/app/(public)/[handle]/join/`):
  - 3-step rapid flow: Step 1 (Social connect / handle), Step 2 (Intro bio + selectable pastel community tiles with "AI suggested" reason pills), Step 3 (Confirmation + welcome).
  - Community tiles act as selectable checkbox cards with Apricot/Lavender/Aqua tints and 56px icon tiles.

### Suite 3: Creator Dashboard Suite (`web/app/(dashboard)/dashboard/`)
- **Shell Structure**:
  - Desktop (>1024px): Fixed 248px glass pill sidebar (`Today`, `Inbox`, `Ideas`, `Communities`, `People`, `Promote`, `Asks`, `Settings`). 88px header row with Display welcome line ("Welcome, Mira 🎉") and glass tray (search, bell with Brick Red count badge, avatar with Meadow Green online dot).
  - Tablet (768px-1023px): Collapses to an 88px icon rail with tooltips.
  - Mobile (<768px): Shell expands edge-to-edge; navigation moves to a Paper White floating bottom nav pill (Today, Inbox, Ideas, More) with 48px items.
- **Today (`/dashboard`)**:
  - Left 4 columns: Frosted glass title band ("Fanbase overview") atop 3 stacked pastel stat cards (Members in Apricot, Ideas in Lavender, Opportunities in Aqua) + Pure White "This week" 3x3 metric grid (Joins, Ideas, Pitches x Total, This month, Today).
  - Right 8 columns: Paper White "Your AI briefing" card with thumbs up/down feedback and cap tracker ("5 of 5 used today"); 3-segment "Inbox mix" donut card; compact "Top ideas" table card.
  - Full Width Bottom: "Fanbase activity" line chart (monotone curves, lime tooltip pill, "Show data" table toggle).
- **Inbox (`/dashboard/inbox`)**:
  - Horizontal glass tab bar (All, Collabs, Investment, Ideas, Press, Fan notes, Filtered) with URL query state.
  - Glass toolbar with matched 40px search square and filter dropdown.
  - Pure White data table card (28px radius): Dove Grey pill header, 48px rows resting at Paper White and lifting to Pure White on hover/focus, 1px Ledger Grey dividers, status pills, fit score pills (with tooltip reason), and ghost action icons.
  - Sheet Side Panel (480px, Pure White, Overlay Soft shadow): Full pitch transcript, sender context, fit score breakdown, reply box, and action buttons.
- **Ideas (`/dashboard/ideas`)**:
  - Glass chip band holding 160x80px Paper White count chips with active ink state.
  - Segmented pill toggle: Ranked vs. Board view.
  - 3-column idea card grid: Paper White cards (24px radius), community pill, team avatars, signal counts, and purple Promote CTA.
- **Communities (`/dashboard/communities`)**:
  - 2-column grid of pastel machine cards (Apricot, Lavender, Aqua, White rotation) with 56px icon tiles, member counts at 18px Trend font, trend line, and ghost edit pencil.
- **Promote (`/dashboard/promote`)**:
  - Left 7 cols: Platform tabs (X, Instagram, LinkedIn, YouTube) with live character counter.
  - Right 5 cols: POS-style preview panel with post preview frame, lavender summary well, and full-width purple Publish button.
- **Settings (`/dashboard/settings`)**:
  - Clean card-based settings sections: Creator Profile, Taste Profile (AI matching directives), Notification Matrix, Team Permissions, Connected Social Accounts, and API Keys.

### Suite 4: Public Bio Link & Fan Clubhouse (`web/app/(public)/[handle]/`)
- **Bio Link (`/[handle]`)**:
  - Single centered 720px column inside fan shell.
  - 96px creator avatar, H1 creator name, verified badge, one-line bio, glass follower platform chips.
  - "Join a community" section featuring 2-column pastel cards with member counts and white "Join" pills.
  - Full-width white "Send [Creator] a pitch" pill leading to the pitch submission flow.
  - "Featured by [Creator]" showcase section.
- **Fan Community Hub (`/[handle]/c/[slug]`)**:
  - Tinted header banner, community switcher glass pills, idea list, and floating purple "New post" pill on mobile.

### Suite 5: Legal & System States (`web/app/(legal)/`, error, 404)
- **Legal Suite** (`/privacy-policy`, `/terms`, `/cookies`, `/refunds`):
  - Centered 720px reading column on Daylight page in Pewter fan shell.
  - H1 document title, last-updated badge, structured H2 sections, body copy capped at 68ch line-length for maximum readability.
- **404 Not Found** (`web/app/not-found.tsx`):
  - Pewter card holding the 3D clay diorama corridor illustration (`web/public/errors/not-found.webp`), warm headline ("This page isn't here."), friendly explanation, and primary button returning to the clubhouse.
</page_by_page_blueprints>

<interaction_and_motion_standards>
- **Micro-interactions**:
  - Hover: Paper White cards step to Pure White; buttons darken by 6% ink mix over 150ms ease-out-quart.
  - Pressed: Scale exactly `0.98` over 150ms (`--dur-fast`).
  - Active Tab Underline: 2px Charcoal Ink line expanding via `transform: scaleX(...)` (200ms ease-out-quart), never sliding between tabs.
  - Side Panel (Sheet): Translates 24px on the X-axis with fade over 250ms ease-out-expo.
- **Accessibility & Focus**:
  - Focus Ring: `outline: 2px solid #7C3AED; outline-offset: 2px` on all `:focus-visible` states.
  - Touch Targets: Minimum 44x44px hit areas on all fan and mobile interfaces.
  - Reduced Motion: Respect `prefers-reduced-motion: reduce`. Disables translation, instant ticker values, static shimmer pseudo-elements.
</interaction_and_motion_standards>

<technical_guardrails_and_antipatterns>
- **NO Generic Tailwind Vibe**: Do not use generic indigo/blue palettes, dark mode toggles, or floating drop-shadow cards.
- **NO Backdrop Blur on Glass**: Glass is strictly a flat 45% white fill (`#FFFFFF73`).
- **NO Multiple Purple CTAs**: Adhere strictly to The One Purple Rule.
- **NO AI Light Show**: No glowing gradients, no rainbow borders, no sparkle confetti. The only AI indicator is the small lime "AI pick" / "AI suggested" pill with its accompanying plain-English reason.
- **NO Text on Shell Haze below Header**: Only Charcoal Ink (`#2D2D30`) may sit directly on the pewter shell.
- **NO Nested Cards**: A card never holds another card.
- **NO Em Dashes in Copy**: Use commas, colons, or parentheses instead.
</technical_guardrails_and_antipatterns>

<execution_protocol>
1. **Analyze Existing Code**: Deeply review the existing files in `web/app/` and `web/components/`. Note any drift from `DESIGN.md`.
2. **Phase 1: Foundations & Shell**: Verify `globals.css`, token variables, and layout shells (creator shell with 3-layer haze, fan shell, and mobile bottom nav).
3. **Phase 2: Auth & Onboarding**: Perfect `/login`, `/create-account`, and `/onboarding` flows with responsive 3D diorama panels and bulletproof validation.
4. **Phase 3: Creator Dashboard & Data Tables**: Perfect `/dashboard` (Today), `/inbox` (Sheet side panel), `/ideas`, `/communities`, `/people`, `/promote`, and `/settings`.
5. **Phase 4: Public Bio Link & Community Pages**: Polish the public fan experience at `/[handle]`.
6. **Phase 5: Legal & System Polish**: Polish `/privacy-policy`, `/terms`, `/cookies`, and `not-found.tsx`.
7. **Verification**: Audit against WCAG 2.2 AA contrast, 360px viewport responsiveness, and interaction timings.
</execution_protocol>
```



## Creator pivot — fal.ai

Generated by web/scripts/generate-creator-media.mjs. Images: openai/gpt-image-2.5/flare/text-to-image, and /edit with the mira-portrait as reference for shots showing Mira. Clip: bytedance/seedance-2.5/image-to-video (8s, 720p, muted via ffmpeg). Shared style suffix: realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks. No seed parameter is exposed, so request ids are recorded instead.

Note: Seedance rejected frames showing a realistic face (content_policy_violation), so the clip animates a person-free Lisbon street frame (clip-source); vlog-lisbon remains the poster.

### mira-portrait
- endpoint: openai/gpt-image-2.5/flare/text-to-image · quality high
- request_id: 01a12024-ae14-75b0-8d55-c10011c071ef
- prompt: Close portrait of a fictional American woman in her late 20s, shoulder-length wavy dark-brown hair, light olive skin, small gold hoop earrings, linen shirt, relaxed warm smile looking just past the camera, golden-hour sun on one side, softly blurred sunlit terracotta street behind her. realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks

### vlog-night-market
- endpoint: openai/gpt-image-2.5/flare/text-to-image · quality medium
- request_id: 01a12025-253c-7722-b644-4e4098e7e605
- prompt: A lively evening street food night market, warm string lights, steaming stalls, blurred crowd, no faces in focus, vivid but natural colours. realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks

### vlog-lisbon
- endpoint: openai/gpt-image-2.5/flare/edit · quality medium
- request_id: 01a12025-231e-7810-93fa-a17899ac6f49
- prompt: Keep the exact same woman as the reference photo (same face, hair, earrings, linen shirt). The same woman walking down a steep cobbled Lisbon street at golden hour, pastel tiled buildings, a yellow tram in the distance, seen from a few metres away, hands relaxed, camera at chest height. realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks

### vlog-van-coast
- endpoint: openai/gpt-image-2.5/flare/edit · quality medium
- request_id: 01a12025-2550-7a73-8677-ef8dccceb926
- prompt: Keep the exact same woman as the reference photo (same face, hair, earrings, linen shirt). The same woman sitting on the open sliding door of a small camper van parked on a cliff above the Pacific coast at sunset, holding a mug, wide landscape shot. realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks

### mira-portrait-alt
- endpoint: openai/gpt-image-2.5/flare/edit · quality high
- request_id: 01a12025-2323-7e61-816d-59ff6787e5ca
- prompt: Keep the exact same woman as the reference photo (same face, hair, earrings, linen shirt). The same woman, different framing: laughing, turned three-quarters, sitting on a sunny stone step with a small canvas backpack beside her, soft warm light. realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks

### vlog-mountain
- endpoint: openai/gpt-image-2.5/flare/text-to-image · quality medium
- request_id: 01a12025-9b58-7b81-a697-90829dcc806c
- prompt: Mountain sunrise from a rocky viewpoint, soft pink and gold clouds over layered ridges, a lone hiker silhouette far away, calm and wide. realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks

### cover-budget-travel
- endpoint: openai/gpt-image-2.5/flare/text-to-image · quality medium
- request_id: 01a12025-9d8a-7833-91aa-211bfdc9cf02
- prompt: Flat lay on a wooden table: passport, a worn paper map, loose coins, a boarding pass with no text, a small notebook and a coffee, warm morning light. No people. realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks

### vlog-hostel
- endpoint: openai/gpt-image-2.5/flare/text-to-image · quality medium
- request_id: 01a12025-9da4-71a3-81e7-c033d48bbde3
- prompt: Five young travellers of mixed backgrounds laughing around a long wooden table in a bright hostel common room, shared dinner, backpacks on the floor, candid, faces not in sharp focus. realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks

### vlog-cafe
- endpoint: openai/gpt-image-2.5/flare/edit · quality medium
- request_id: 01a12025-9d89-70d2-9392-39edf0a4e91b
- prompt: Keep the exact same woman as the reference photo (same face, hair, earrings, linen shirt). The same woman working on a laptop at a sunlit corner cafe table with a flat white and a croissant, plants in the window, relaxed and focused. realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks

### cover-travel-photography
- endpoint: openai/gpt-image-2.5/flare/text-to-image · quality medium
- request_id: 01a12026-02e3-75f2-8108-505b07661f8c
- prompt: A mirrorless camera resting on a stone wall overlooking a golden-hour old town skyline, lens catching soft light. No people. realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks

### cover-food-finds
- endpoint: openai/gpt-image-2.5/flare/text-to-image · quality medium
- request_id: 01a12026-0515-7f32-b5df-0841a00c93cd
- prompt: A small family-run restaurant table with colourful shared dishes, grilled fish, salad and bread, warm tungsten light, hands reaching in, no faces. realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks

### cover-road-trips
- endpoint: openai/gpt-image-2.5/flare/text-to-image · quality medium
- request_id: 01a12026-050d-7c51-aee1-2bf41049c9b2
- prompt: A vintage camper van on an empty coastal highway at sunset, long shadows, wildflowers on the verge. No people. realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks

### cover-solo-travelers
- endpoint: openai/gpt-image-2.5/flare/text-to-image · quality medium
- request_id: 01a12026-02dd-7c23-aac2-9788c50ca661
- prompt: A single traveller seen from behind with a backpack on a quiet pier at golden hour, calm water, small figure in a wide frame. Face not visible. realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks

### fan-2
- endpoint: openai/gpt-image-2.5/flare/text-to-image · quality medium
- request_id: 01a12026-58ca-7cf0-aa02-5d2578d4a192
- prompt: Head-and-shoulders portrait of a fictional South Asian woman in her late 20s, long dark hair, friendly expression, neutral warm backdrop. realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks

### fan-3
- endpoint: openai/gpt-image-2.5/flare/text-to-image · quality medium
- request_id: 01a12026-58d7-77d1-a882-6eaee4291293
- prompt: Head-and-shoulders portrait of a fictional white man in his 40s, short beard and glasses, easy smile, neutral warm backdrop. realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks

### cover-slow-living
- endpoint: openai/gpt-image-2.5/flare/text-to-image · quality medium
- request_id: 01a12026-58f2-7a32-bec6-86c1e0dd1acd
- prompt: A sunlit window nook with a linen blanket, a ceramic cup of tea, an open paperback and a plant, soft morning haze. No people. realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks

### fan-6
- endpoint: openai/gpt-image-2.5/flare/text-to-image · quality medium
- request_id: 01a12026-c230-7763-8388-b59190c4bd16
- prompt: Head-and-shoulders portrait of a fictional older woman in her 60s, silver bob, kind expression, neutral warm backdrop. realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks

### fan-4
- endpoint: openai/gpt-image-2.5/flare/text-to-image · quality medium
- request_id: 01a12026-c000-7d22-bc0a-41f41b7900d5
- prompt: Head-and-shoulders portrait of a fictional Latina woman in her early 20s, curly hair, bright laugh, neutral warm backdrop. realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks

### fan-5
- endpoint: openai/gpt-image-2.5/flare/text-to-image · quality medium
- request_id: 01a12026-c229-7d33-9f8b-f9ff30d94049
- prompt: Head-and-shoulders portrait of a fictional East Asian man in his late 20s, casual jacket, relaxed smile, neutral warm backdrop. realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks

### auth-art
- endpoint: openai/gpt-image-2.5/flare/edit · quality medium
- request_id: 01a12026-c21f-7753-957e-b4eae5423503
- prompt: Keep the exact same woman as the reference photo (same face, hair, earrings, linen shirt). The same woman from behind and slightly to the side, looking out over a sunlit terrace at rooftops and the sea, a soft breeze in her hair, calm and open composition with space above. realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks

### fan-1
- endpoint: openai/gpt-image-2.5/flare/text-to-image · quality medium
- request_id: 01a12027-309b-70d2-85c3-af1ad7472fde
- prompt: Head-and-shoulders portrait of a fictional Black woman in her 30s, short natural hair, warm smile, neutral warm beige backdrop. realistic editorial photograph, warm golden-hour light, soft film grain, natural skin texture, candid, shallow depth of field, no text, no logos, no watermarks

### clip-source
- endpoint: openai/gpt-image-2.5/flare/text-to-image
- request_id: 01a12038-09e2-7421-9fe3-075bbfc52efe
- prompt: 

### one-week
- endpoint: bytedance/seedance-2.5/image-to-video
- request_id: 01a12038-40d8-7dd0-ad00-18ee667ecdf6
- prompt: Slow handheld walk forward through a Lisbon street at golden hour, pastel buildings, gentle natural camera sway, warm light, calm ambience.


### footer-landscape
- endpoint: openai/gpt-image-2.5/flare/text-to-image · quality high · 2560x1024 (cropped to web/public/creator/footer-landscape.webp 2400x760 and footer-landscape-mobile.webp 1200x702)
- request_id: 01a121f8-bad4-7172-bb72-fce23917514c
- prompt: A wide, soft, abstract landscape of layered rolling hills at golden hour, seen as a calm panorama. Palette: pale peach sky (#FFD9C2) glowing at the top, sunset coral (#F0603A) hills in the foreground, lilac (#DCCFF7) and sky blue (#BFDDF7) hills receding into dreamy haze, a hint of mint green (#CFEFE3). Smooth overlapping hill silhouettes with gentle gradients, atmospheric haze between layers, a low warm sun glow. Heavy film grain and risograph print texture, slightly grainy gradients, matte paper feel, premium and calm. No people, no text, no buildings, no roads, no trees in detail, no watermark. The top 30 percent of the image is a very pale, almost cream peach haze so it can fade into a cream page.

### hero-scenery
- endpoint: openai/gpt-image-2.5/flare/text-to-image · quality high · 1536x1024 (exported to web/public/creator/hero-scenery.webp 2400x1600 and hero-scenery-mobile.webp 1200x1259, a right-side crop)
- request_id: 01a12217-d956-7102-a412-854090dba024
- prompt: Wide golden-hour landscape photograph of soft coastal hills and a winding road at sunset, warm peach and lilac sky, the low sun glowing near the right side, gentle haze over the sea, calm and spacious, realistic travel photography, subtle film grain, muted pastel tones. The left third of the frame is open soft hazy sky and pale hillside with no detail (empty space for text). No people, no cars, no buildings, no text, no logos, no watermark.
