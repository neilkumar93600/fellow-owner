---
name: Fellow Owners
description: "Parchment Frost: the Monad style, adopted by the owner on 2026-10-12, with frosted glassmorphism kept. Frosted glass over soft pastel washes on warm parchment, serif headings at 400, monospace UI, hairline Ash borders, and one Lake Blue action per screen."
colors:
  parchment: "#F6F3F1"
  ink: "#242424"
  graphite: "#4E4D4D"
  ink-muted: "#6B6968"
  smoke: "#797776"
  ash: "#CECAC8"
  lake: "#2B59D1"
  lake-hover: "#234AAE"
  periwinkle: "#CFDAF5"
  coral: "#FF9473"
  sky-wash: "#A0B5EB"
  mint: "#A7FCCD"
  gold: "#ECDA98"
  crimson: "#F37A0A"
  success: "#15803D"
  warn-ink: "#A45A00"
  danger: "#E04848"
  danger-deep: "#C42B2B"
  glass-soft: "#FFFFFF8C"
  glass-chip: "#FFFFFF9E"
  glass-strong: "#FFFFFFB8"
  glass-fallback: "#FFFFFFEB"
  glass-edge: "#CECAC8BF"
  white: "#FFFFFF"
typography:
  display:
    fontFamily: "Newsreader, Georgia, 'Times New Roman', serif"
    fontSize: "40px"
    fontWeight: 400
    lineHeight: "1.2"
    letterSpacing: "-0.01em"
  h1:
    fontFamily: "Newsreader, Georgia, 'Times New Roman', serif"
    fontSize: "32px"
    fontWeight: 400
    lineHeight: "1.2"
    letterSpacing: "-0.02em"
  h2:
    fontFamily: "Newsreader, Georgia, 'Times New Roman', serif"
    fontSize: "24px"
    fontWeight: 400
    lineHeight: "1.2"
    letterSpacing: "-0.02em"
  hero:
    fontFamily: "Newsreader, Georgia, 'Times New Roman', serif"
    fontSize: "clamp(3rem, 1.6rem + 4.4vw, 5rem)"
    fontWeight: 400
    lineHeight: "1.1"
    letterSpacing: "-0.02em"
  stat:
    fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: "44px"
    letterSpacing: "-0.02em"
    fontFeature: "'tnum' 1"
  body:
    fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "22px"
    letterSpacing: "-0.02em"
  body-long:
    fontFamily: "Inter, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "22px"
    letterSpacing: "-0.006em"
  label:
    fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: "22px"
    letterSpacing: "-0.02em"
  button:
    fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "1"
    letterSpacing: "-0.02em"
    textTransform: "uppercase"
  small:
    fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
    letterSpacing: "-0.02em"
    fontFeature: "'tnum' 1"
  caption:
    fontFamily: "'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0.01em"
    textTransform: "uppercase"
    fontFeature: "'tnum' 1"
rounded:
  field: "16px"
  card: "28px"
  panel: "40px"
  chip: "9999px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  2xl: "32px"
  3xl: "40px"
components:
  button-primary:
    backgroundColor: "{colors.lake}"
    textColor: "{colors.white}"
    typography: "{typography.button}"
    rounded: "{rounded.chip}"
    height: "48px"
    padding: "0 32px"
  button-primary-hover:
    backgroundColor: "{colors.lake-hover}"
  button-secondary:
    backgroundColor: "{colors.glass-strong}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.chip}"
    height: "48px"
    padding: "0 20px"
  glass-panel:
    backgroundColor: "{colors.glass-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  glass-panel-strong:
    backgroundColor: "{colors.glass-strong}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
  tag:
    backgroundColor: "{colors.glass-chip}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.chip}"
    height: "32px"
    padding: "0 14px"
  nav-item-active:
    backgroundColor: "{colors.periwinkle}"
    textColor: "{colors.lake}"
    rounded: "{rounded.chip}"
---

# Design System: Fellow Owners

## 1. Overview: Parchment Frost

**Creative North Star: "an editorial journal on warm parchment, lit by frosted glass."** Fellow Owners is where a lifestyle and travel creator (our sample creator is Mira Lane, a fictional LA vlogger) meets the fans who want to plan, shoot and explore with her. The serif announces, the mono instructs.

**Where this came from.** On 2026-10-12 the owner adopted the "Monad" style reference and asked to keep frosted glassmorphism. Parchment Frost replaces "Golden Hour Frost" (cream, Instrument Serif and Inter, coral action, rainbow marketing button). The foundation lives in `web/app/globals.css`, `web/lib/fonts.ts` and `web/components/ui/button-variants.ts`. Light theme only.

Two owner decisions shape everything below:
1. **Mono for all UI strings; Inter for long reads.** Post bodies, comments, legal text, newsletter and email content and bio "about" paragraphs use `font-sans` (Inter).
2. **Lake Blue (#2B59D1) is the one action colour everywhere.** The rainbow button is retired.

**The three layers.**
1. **The washes.** A page-wide backdrop on parchment (#F6F3F1): large, soft radial blobs in the Monad pastels (coral, sky-wash, gold, mint) at 0.5 opacity, with a 3% grain. Each blob is a transformed radial gradient, not a CSS blur filter. It drifts for six 40s alternate passes and then rests, and is static under `prefers-reduced-motion`. It is rendered once, in `app/layout.tsx`, by `AuroraBackdrop` (`.aurora`, `.aurora-blob`, `.grain`).
2. **Frosted glass.** Every surface floats directly on the washes, with real backdrop blur and an Ash hairline. There is no outer frame, shell or tray around the content.
3. **Ink and one action.** Words are ink or graphite. One Lake Blue button per screen marks the thing to do.

**Key characteristics**
- Content floats on the washes as frosted panels with Ash hairlines and almost no shadow.
- Newsreader serif headings at weight 400, never bold. Geist Mono for everything else. Inter only for long reads.
- Nav labels, buttons, tags and small meta are uppercase mono.
- One Lake Blue action per screen. Everything else is a frosted secondary, a ghost icon, or a text link with an arrow.
- Active navigation is a periwinkle chip with a lake icon.
- Matches are words ("Strong match", "Worth a look"), never numbers, outside a side panel.
- Real-looking golden-hour photography of the creator and her travels. Until a file exists, a same-ratio gradient stands in.

## 2. Colours

Hex in the frontmatter is normative. The names come from the `@theme` block in `web/app/globals.css`. DESIGN.json holds OKLCH values.

| Token | Hex | Tailwind | Role |
|---|---|---|---|
| parchment | #F6F3F1 | `bg-parchment` (`bg-cream` alias) | The canvas under the washes, and `<body>`. |
| lake | #2B59D1 | `bg-lake`, `text-lake` | The one action per screen. White words on it. |
| lake-hover | #234AAE | `hover:bg-lake-hover` | Primary hover (darker, never lighter). |
| periwinkle | #CFDAF5 | `bg-periwinkle` | Soft surface, the active nav chip, text selection. |
| ash | #CECAC8 | `border-border`, `border-line` | Hairlines: borders, inputs, the glass edge. |
| ink (off-black) | #242424 | `text-ink` | Titles, labels, body words and the focus ring. |
| graphite (ink-soft) | #4E4D4D | `text-ink-soft` | Secondary words, figures, inactive tabs. |
| ink-muted | #6B6968 | `text-ink-muted` | Helper text. AA on parchment. |
| smoke | #797776 | `text-smoke`, `border-line-field` | Usage limits (below). Large text, field borders and decoration only. |
| coral | #FF9473 | `bg-coral` | Decorative pastel. Washes, tiles, illustration, avatar tints. |
| sky-wash | #A0B5EB | `bg-sky-wash` | Decorative pastel. |
| mint | #A7FCCD | `bg-mint` | Decorative pastel. |
| gold | #ECDA98 | `bg-gold` | Decorative pastel. |
| crimson | #F37A0A | `bg-crimson` (`sunset` alias) | Decorative pastel. |
| success | #15803D | `text-success` | Rising trends and done states. |
| warn-ink | #A45A00 | `text-warn-ink` | Warnings, always on a light warm fill. |
| danger / danger-deep | #E04848 / #C42B2B | `text-danger`, `text-danger-deep` | Destructive icons and words. `--destructive` is #C42B2B. |

**Old names still resolve to the new palette:** `cream` is parchment, `ink-soft` is graphite, `sunset` is crimson, `sky` is lake, and `aurora-peach / sky / lilac / mint` are pale tints (#FFD9CC, periwinkle, #DFE5F8, #D2FDE5) for solid fills such as tiles and chips. **`coral` now means the decorative pastel #FF9473.** Every former coral action class was renamed to `lake`.

**Pastels are decoration only.** Coral, sky-wash, mint, gold and crimson never act as text and never sit under text. If a pastel must carry text (a tile, a chip), measure the pair with `node web/scripts/contrast-check.mjs <fg> <bg>` and stay at 4.5:1 or above.

### Contrast ledger (WCAG 2.2, from the comment in `globals.css`)

| Pair | Ratio | Needs |
|---|---|---|
| white on lake | 6.1 | 4.5 |
| lake on parchment | 5.5 | 4.5 |
| graphite on parchment | 7.6 | 4.5 |
| ink-muted #6B6968 on parchment | 4.9 | 4.5 |
| smoke #797776 on parchment | 4.0 | 3 for large text and field borders only |
| ink focus ring on parchment | 14 | 3 |

Graphite on any glass fill over the brightest wash stays above 6:1.

## 3. Glass

| Class | Fill | Radius | Use |
|---|---|---|---|
| `.glass` | white 55% | 40px | Panels that carry short text: hero cards, stat and idea cards, toolbars and tab bars. |
| `.glass-strong` | white 72% | 40px | Long text, lists, forms, side panels, dialogs, data tables and the icon rail. |
| `.glass-chip` | white 62% | full pill | Small controls: secondary buttons, tags, nav chips. |

All three share the following:
- `backdrop-filter: blur(24px) saturate(160%)` (with the `-webkit-` prefix).
- A 1px Ash hairline, `rgb(206 202 200 / 0.75)`: slightly see-through so the wash still glows at the edge.
- A 1px top-left inner highlight, `inset 1px 1px 0 rgb(255 255 255 / 0.7)`.
- Almost no shadow: `0 0 10px 0 rgb(0 0 0 / 0.06)` (`shadow-glass`). Chips carry the highlight only.

The classes live in the components layer, so a caller's `rounded-*`, `bg-*` or `shadow-*` utility overrides them. Do not make panels opaque.

**Fallback.** Where `@supports not (backdrop-filter: blur(1px))` (older in-app webviews), every glass class and `.btn-secondary` drop to a 92% white fill. Text is never see-through on a busy backdrop.

**Overlays.** Dialogs, popovers, menus, the select list and side panels use `shadow-overlay` (`0 24px 64px -16px rgba(45,45,48,.22)`). Nothing else casts a shadow: cards and tiles carry none.

## 4. Typography

- **Geist Mono** (`font-mono`, `--font-geist-mono`) is the page default (`html` sets it, with -0.02em tracking) and sets every UI string: nav, buttons, badges, tags, chips, tabs, table headers, meta, timestamps, counters, form labels and short body copy.
- **Newsreader** (`font-display`, `--font-newsreader`) is the serif for headings, weight 400 only, with an italic cut. Every `<h1>` and `<h2>` is serif at 400 automatically (base layer, -0.02em). Other big titles (an h3, a card title of 20px or more, a FAQ question, a big stat written as words) opt in with `font-display`. **Never bold a heading.** A heading that should read as UI (a small card label) opts out with `font-mono`. Italic is allowed for one accent word, in ink or lake.
- **Inter** (`font-sans`, `--font-inter`, optical-size axis) is for long reads only: post bodies, comments, legal text, newsletter and email content, bio "about" paragraphs, any paragraph read at length. Its tracking is -0.006em instead of the mono's. This is the owner's decision; short UI copy stays mono.

**Scale** (tokens in `globals.css`):

| Role | Size / line | Weight | Face |
|---|---|---|---|
| `text-hero` | clamp(3rem, 1.6rem + 4.4vw, 5rem) / 1.1 | 400 | serif, landing |
| `text-section` | clamp(2.25rem, 1.5rem + 2.4vw, 3rem) / 1.2 | 400 | serif, landing |
| `text-lead` | clamp(1.125rem, 1rem + 0.4vw, 1.375rem) / 1.45 | | landing lead |
| `text-display` | 40px / 1.2 | 400 | serif |
| `text-h1` | 32px / 1.2 | 400 | serif |
| `text-h2` | 24px / 1.2 | 400 | serif |
| `text-stat` | 40px / 44px | 600 | mono figures |
| `text-count` | 24px / 32px | 600 | mono figures |
| `text-trend` | 18px / 24px | 500 | mono figures |
| `text-body` | 15px / 22px | | mono |
| `text-label` / `text-label-strong` | 15px / 22px | 500 / 600 | mono |
| `text-small` | 13px / 18px | | mono, tabular |
| `text-caption` | 12px / 16px | 500 | mono, tabular, 0.01em |

Anything counted uses tabular figures (the Counting Rule).

**Uppercase mono.** Nav labels, buttons, tags, badges, eyebrows and small (12px) meta are UPPERCASE mono with tight tracking. Do not uppercase sentences, names, user content or long helper text.

## 5. Components

- **Buttons** (`components/ui/button-variants.ts`; landing twins `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`). Always a full pill, mono 14px weight 500, uppercase, -0.02em:
  - `primary`: Lake Blue fill, white words, 48px, no shadow, `lake-hover` on hover. Use it once per screen.
  - `secondary`: a frosted `glass-chip` pill with ink words and an Ash hairline (on plain white it gains a `border-line`). Every other action.
  - `ghost`: a bare 40px round icon button with a required `aria-label`. On fan pages it is 44px (`icon-fan`).
  - `destructive` and `destructive-secondary`: brick-red words, the second on a glass pill.
  - Press is a 0.98 scale through `press`. Hover only changes colour, never on a disabled or busy control. The old `rainbow` button is **retired**: no rainbow CTA, no gradient text, no rainbow effects.
- **Tags and eyebrows** (`.eyebrow`): a 32px hairline pill (Ash border, `glass-chip` fill), mono 12px uppercase, weight 500.
- **Match label** (`MatchLabel`, creator side only): a tag with a tier dot and words. 80 and up reads "Strong match", 60 to 79 reads "Worth a look", and under 60 reads "Not for you". It never shows a number.
- **Tab bar:** a glass pill of tab pills in mono. The active tab is a white chip.
- **Status pill:** 24px, caption, ink words on a pale tint. It never uses bare colour.
- **Side panel / sheet:** `glass-strong`, 480px from the right, `shadow-overlay`.
- **Data table:** a `glass-strong` panel with Ash-ruled rows, behind a "Table" toggle. Card lists are the default.
- **Cards and panels:** radius 24 to 40px, never under 16px; big panels use `rounded-panel` (40px), the card token `rounded-card` is 28px. A 1px Ash hairline, no drop shadow. Icon tiles are solid pale tints.
- **Creator image** (`CreatorImage name alt`): `next/image` once `CREATOR_ASSETS[name].ready` is true. Until then it renders a same-ratio gradient with `role="img"` and the alt text. It never shows a broken image and never shifts the layout.
- **Navigation:** the dashboard has a 72px `glass-strong` icon rail on the left and a bottom bar on mobile. **The active item is a periwinkle chip (#CFDAF5) with a lake icon**, replacing the old peach chip, coral icon and sunset dot. Labels are uppercase mono.
- **Platforms:** a creator adds platforms one link at a time. The links are fetched in order, one after another. A card whose fetch failed shows the error state with **Retry** and a way to enter a **manual count**, so one bad link never blocks the rest.
- **Focus:** a solid 2px off-black outline (`--color-ink`) with a 2px offset everywhere. It reads on parchment, glass, the washes and Lake Blue. Selection is periwinkle.

## 6. Motion

- State changes ease out over 150 to 250ms (`--ease-out-quart`). Cards use `motion` springs. Reveal on scroll is 600ms.
- Press is a 0.98 scale.
- Nothing loops forever in view. The washes make six 40s alternate passes and then rest. Skeleton and "AI reviewing" blocks sweep every 1.6s and are static under reduced motion.
- Under `prefers-reduced-motion`, the washes are static and every transition is effectively instant.

## 7. Imagery

- Realistic, warm golden-hour photography of the fictional creator (a woman in her late 20s) and her travels: Lisbon streets, night markets, a van on the coast, cafés, mountain sunrises and hostel friends.
- No real people, no logos and no text in images.
- WebP files in `web/public/creator/`, each 250 KB or less. Stills are 1600x1000, portraits 1200x1500 and fan faces 256x256. They are listed in `web/lib/creator-assets.ts` and the prompts are recorded in `prompt.md`.
- Images sit inside frosted frames. Never put text on an image without a glass panel under it.

## 8. Rules

- **One Lake Blue primary per screen.** If two things look primary, one of them is secondary. No other saturated fill marks an action. The rainbow CTA is retired everywhere, landing included (owner decision, 2026-10-12).
- **Headings are serif at 400, never bold** (Monad rule).
- **UI strings are mono; long reads are Inter** (owner decision, 2026-10-12).
- **Uppercase** applies to nav, buttons, tags and 12px meta only.
- **Words are ink.** Use ink or graphite on glass. Pastels never carry words.
- **Text on glass reaches AA.** Check new pairs with `node web/scripts/contrast-check.mjs <fg> <bg>`. A `#rrggbbaa` foreground composites over the background.
- **Glass carries text. The washes do not.** Body text never sits directly on a bright wash.
- **Hairlines, not shadows.** 1px Ash borders; no drop shadows on cards; do not make panels opaque.
- **Radii:** panels 40px, cards 24 to 40px, never under 16px; buttons, tags and chips are full pills.
- **Monospace is about 20% wider than Inter.** Check every screen at 1440px and 390px for overflow, clipping and ugly wraps (`min-w-0`, `truncate`, `line-clamp`).
- **No numbers for matches outside a side panel.**
- **Touch targets of 44px on fan pages.**
- **The AI never sends anything to fans without a creator click.**

## 9. Not this

Do not bring these back:
- The Golden Hour Frost look: cream #FBF7F2, Instrument Serif, Inter as the UI face, the coral #C8432A action, the sunset nav dot and the rainbow marketing button.
- Bold headings, gradient text and rainbow effects.
- The pewter shell (a grey frame around the app), the lime active pill, the purple primary button and focus ring.
- Flat white "glass" with no blur, and opaque panels.
- Drop shadows on cards.
- The clay-diorama sphere canvas, the clay loop video and the clay auth/onboarding art.
- Dense admin tables as the default view, raw fit-score bars and "Export CSV" as a primary button.

Legacy tokens (`bg-page`, `text-ink-muted`, `--purple`, `--peach`, `--lavender` and similar) remain in `globals.css` under the `legacy:` comments, re-pointed at the new palette, until `rg` finds no caller.
