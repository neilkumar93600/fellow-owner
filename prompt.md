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
