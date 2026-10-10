---
name: Fellow Owners
description: "Golden Hour Frost: frosted glass floating over a slow sunset aurora on cream, ink words, and one coral action per screen. A creator's studio and a fan's clubhouse, lit like a travel vlog at golden hour."
colors:
  cream: "#FBF7F2"
  ink: "#1E1B26"
  ink-soft: "#55506A"
  ink-muted: "#5F5A70"
  coral: "#C8432A"
  coral-hover: "#A9361F"
  sunset: "#F0603A"
  sky: "#2B6CA8"
  success: "#15803D"
  warn-ink: "#A45A00"
  danger: "#E04848"
  danger-deep: "#C42B2B"
  aurora-peach: "#FFD9C2"
  aurora-sky: "#BFDDF7"
  aurora-lilac: "#DCCFF7"
  aurora-mint: "#CFEFE3"
  glass-soft: "#FFFFFF8C"
  glass-chip: "#FFFFFF9E"
  glass-strong: "#FFFFFFB8"
  glass-fallback: "#FFFFFFEB"
  glass-edge: "#FFFFFF99"
  white: "#FFFFFF"
typography:
  display-xl:
    fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif"
    fontSize: "clamp(56px, 6.4vw, 120px)"
    fontWeight: 400
    lineHeight: "0.95"
    letterSpacing: "-0.02em"
  display:
    fontFamily: "'Instrument Serif', Georgia, 'Times New Roman', serif"
    fontSize: "36px"
    fontWeight: 400
    lineHeight: "1.1"
    letterSpacing: "normal"
  h1:
    fontFamily: "Inter, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: "32px"
    letterSpacing: "-0.005em"
  h2:
    fontFamily: "Inter, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: "28px"
    letterSpacing: "normal"
  stat:
    fontFamily: "Inter, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 600
    lineHeight: "44px"
    letterSpacing: "-0.02em"
    fontFeature: "'tnum' 1"
  body:
    fontFamily: "Inter, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "22px"
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 500
    lineHeight: "22px"
    letterSpacing: "normal"
  small:
    fontFamily: "Inter, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
    letterSpacing: "normal"
    fontFeature: "'tnum' 1"
  caption:
    fontFamily: "Inter, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0.01em"
    fontFeature: "'tnum' 1"
rounded:
  field: "16px"
  idea: "24px"
  panel: "28px"
  chip: "999px"
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
    backgroundColor: "{colors.coral}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.chip}"
    height: "48px"
    padding: "0 24px"
  button-primary-hover:
    backgroundColor: "{colors.coral-hover}"
  button-secondary:
    backgroundColor: "{colors.glass-chip}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
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
  match-label:
    backgroundColor: "{colors.glass-chip}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.chip}"
    height: "28px"
    padding: "0 12px"
  nav-item-active:
    backgroundColor: "{colors.glass-strong}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
  status-pill-warm:
    backgroundColor: "{colors.aurora-peach}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.chip}"
    height: "24px"
  status-pill-cool:
    backgroundColor: "{colors.aurora-sky}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.chip}"
    height: "24px"
---

# Design System: Fellow Owners

## 1. Overview: Golden Hour Frost

**Creative North Star: "the last hour of light on a trip."** Fellow Owners is where a lifestyle and travel creator (the demo is Mira Lane, a fictional LA vlogger) meets the fans who want to plan, shoot and explore with her. The screen should feel like her vlog looks: warm low sun, soft haze, frosted glass you could write on. It is an original system. It does not track any reference screen.

**The three layers.**
1. **The aurora.** A page-wide backdrop on cream (#FBF7F2): four large, soft radial pools of peach (top left, like a low sun), sky and lilac across the top and right, and mint at the foot, with a 3% grain. It drifts for a few 40s passes and then rests. It is static under `prefers-reduced-motion`. It is rendered once, in `app/layout.tsx`, by `AuroraBackdrop`.
2. **Frosted glass.** Every surface floats directly on the aurora. There is no outer frame, shell or tray around the content.
3. **Ink and one action.** Words are ink or soft ink. In the app, one coral button per screen marks the thing to do. On the marketing landing, one rainbow button per viewport marks "Try the live demo".

**Key characteristics**
- Content floats on the aurora as frosted panels. Nothing is framed.
- Instrument Serif for display headlines (28px and up only), with the occasional italic accent word. Inter for everything else.
- One coral action per app screen, and one rainbow marketing action per landing viewport. Everything else is glass, ink or a bare icon.
- Active navigation is a glass chip with an ink icon and a 3px sunset dot.
- Matches are words ("Strong match", "Worth a look"), never numbers, outside a side panel.
- Real-looking golden-hour photography of the creator and her travels. Until a file exists, a same-ratio gradient stands in.

## 2. Colours

Hex in the frontmatter is normative. The Tailwind names come from the `@theme` block in `web/app/globals.css`. DESIGN.json holds OKLCH values.

| Token | Hex | Tailwind | Use |
|---|---|---|---|
| cream | #FBF7F2 | `bg-cream` | The page under the aurora, and `<body>`. |
| ink | #1E1B26 | `text-ink` | Titles, labels, body words and the focus ring. |
| ink-soft | #55506A | `text-ink-soft` | Secondary words, figures and inactive tabs. |
| coral | #C8432A | `bg-coral` | The one primary action per screen. White words. |
| coral-hover | #A9361F | `hover:bg-coral-hover` | Primary hover (darker, never lighter). |
| sunset | #F0603A | `bg-sunset` | Decoration only: the active nav dot, glows and illustrations. Never text, never under text. |
| sky | #2B6CA8 | `text-sky` | Links and info. |
| success | #15803D | `text-success` | Rising trends and done states. |
| warn-ink | #A45A00 | `text-warn-ink` | Warnings, always on a light warm fill. |
| aurora peach / sky / lilac / mint | #FFD9C2 / #BFDDF7 / #DCCFF7 / #CFEFE3 | `bg-aurora-*` | The backdrop pools, community icon tiles, chips and status fills. |

**Coral and sky are darker than the brief.** The brief asked for coral #F0603A and sky #3B82C4. White on #F0603A measures 3.26:1 and #3B82C4 on white measures 4.06:1, so both fail AA for text. The tokens are therefore #C8432A (white on it 4.89:1) and #2B6CA8 (5.51:1 on white). The brief's #F0603A survives as `sunset`, for decoration only. The plan's Global Constraints line should read: coral `#C8432A`, coral-hover `#A9361F`, sky `#2B6CA8`, sunset `#F0603A` (decoration only).

**Community tints.** The shared `Tint` values map to frosted card washes (`web/components/shared/tint.ts`):

| Tint | Card | Tile and chip | Icon |
|---|---|---|---|
| peach | #FFF1E8 at 80%, frosted | aurora-peach | coral |
| lavender | #F5F0FF at 80%, frosted | aurora-lilac | #5B47A8 |
| aqua | #EFFAF5 at 80%, frosted | aurora-mint | #22694F |
| white (and lime) | white at 72%, frosted | white | ink |

### Contrast ledger (WCAG 2.2, measured with `node web/scripts/contrast-check.mjs`)

The worst case is white glass at 55% over the brightest pool (peach), which composites to #FFF0E7.

| Pair | Ratio | Needs |
|---|---|---|
| ink on #FFF0E7 | 15.22 | 4.5 |
| ink-soft on #FFF0E7 | 6.88 | 4.5 |
| ink-muted (legacy) on #FFF0E7 | 5.93 | 4.5 |
| white on coral | 4.89 | 4.5 |
| white on coral-hover | 6.49 | 4.5 |
| coral on cream | 4.59 | 4.5 |
| sky on white | 5.51 | 4.5 |
| sky on #FFF0E7 | 4.95 | 4.5 |
| success on #FFF0E7 | 4.51 | 4.5 |
| warn-ink on #FFF3E0 | 4.74 | 4.5 |
| ink on aurora-peach / aurora-sky (status pills) | 12.87 / 12.02 | 4.5 |
| ink-soft on aurora-peach / lilac / mint (tiles) | 5.82 / 5.22 / 6.24 | 4.5 |
| coral / #5B47A8 / #22694F icon on its tile | 3.72 / 4.92 / 5.34 | 3 (non-text) |
| ink focus ring on cream / white / peach | 15.9 / 16.9 / 12.9 | 3 |

## 3. Glass

| Class | Fill | Use |
|---|---|---|
| `.glass` | white 55% | Panels that carry short text: hero cards, stat and idea cards, toolbars and tab bars. |
| `.glass-strong` | white 72% | Long text, lists, forms, side panels, dialogs, data tables and the icon rail. |
| `.glass-chip` | white 62%, full pill | Small controls: secondary buttons, match labels, tooltip chips and nav chips. |

All three share the following:
- `backdrop-filter: blur(24px) saturate(160%)` (with the `-webkit-` prefix).
- A 1px `rgba(255,255,255,.6)` edge.
- A 1px top-left inner highlight, `inset 1px 1px 0 rgba(255,255,255,.7)`.
- The glass shadow, `0 20px 60px -20px rgba(40,30,60,.18)` (`shadow-glass`). Chips use a tighter `0 6px 18px -10px`.

The radius is 28px for panels (`rounded-panel`) and 999px for chips (`rounded-chip`). The classes live in the components layer, so a caller's `rounded-*`, `bg-*` or `shadow-*` utility overrides them. In React, use `<GlassPanel strength="soft|strong" as="section">`.

**Fallback.** Where `@supports not (backdrop-filter: blur(1px))` (older in-app webviews), every glass class and the landing `.btn-secondary` drop to a 92% white fill. Text is never see-through on a busy backdrop.

**Overlays.** Popovers, menus and the select list are white at 90% with a frost. Tooltips are solid white. All of them use `shadow-overlay`.

## 4. Typography

- **Instrument Serif** (`font-display`, `next/font`, variable `--font-instrument-serif`) is for display only, at 28px and up: the landing headlines, page titles (`PageHeading` level 1 at 36px) and the dashboard top-bar title. It is always weight 400. Italic is allowed for one accent word in a headline ("a way to *hear* them").
- **Inter** (`font-sans`, `--font-inter`) is for all UI and body text. The app scale (`text-h1`, `text-h2`, `text-body`, `text-label`, `text-small`, `text-caption`, `text-stat`) is unchanged. Anything counted uses tabular figures.
- Never set serif under 28px. Never set a whole paragraph in serif.

## 5. Components

- **Buttons** (`components/ui/button-variants.ts`):
  - `primary`: coral, white label, 48px pill, coral-hover on hover. Use it once per screen.
  - `secondary`: a glass-chip pill with ink words. On plain white it gains a hairline border.
  - `ghost`: a bare 40px round icon button with a required `aria-label`. On fan pages it is 44px.
  - `destructive`: brick-red words.
  - `rainbow` (`components/ui/rainbow-button.tsx`, landing only): a dark pill (`default`, over the aurora) or a light pill (`outline`, on glass) with a rainbow border and glow. It runs three passes once in view, then rests, and is still under reduced motion. Focus is the ink outline. `DemoButton variant="rainbow"` wears it.

  Press is 0.98 through `press`. Hover only changes colour.
- **Match label** (`MatchLabel`, creator side only): a glass chip with a tier dot and words. 80 and up reads "Strong match", 60 to 79 reads "Worth a look", and under 60 reads "Not for you". It never shows a number. The "why this one" reason sits beside it as its own line. `FitPill` is a legacy alias that puts the reason in a tooltip.
- **Tab bar:** a glass pill of 48px tab pills. The active tab is a white chip with a 3px sunset dot under the word.
- **Status pill:** 24px, caption, with ink words on an aurora tint. Warm is peach, cool is sky, and neutral is white 75% with an ink/10 ring. It never uses bare colour.
- **Side panel / sheet:** `glass-strong`, 480px from the right, with 28px left corners and `shadow-overlay`.
- **Data table:** a `glass-strong` panel, a white 70% pill header and rows ruled at ink 10% that lift to white 80%. It sits behind a "Table" toggle. Card lists are the default.
- **Cards:** idea cards are `.glass` at radius 24. Community and stat cards are frosted tint washes at radius 28, with a solid aurora tile for the icon.
- **Creator image** (`CreatorImage name alt`): `next/image` once `CREATOR_ASSETS[name].ready` is true. Until then it renders a same-ratio golden-hour gradient in the asset's tone, with `role="img"` and the alt text. It never shows a broken image and never shifts the layout.
- **Navigation:** the dashboard has a 72px `glass-strong` icon rail on the left, and a bottom bar on mobile. The active item is a glass chip with an ink icon and a 3px sunset dot. There is no lime and no filled pill.
- **Focus:** a solid 2px ink outline with a 2px offset everywhere. It reads on cream, glass, the aurora and coral.

## 6. Motion

- State changes ease out over 150 to 250ms (`--ease-out-quart`). Cards use `motion` springs.
- Press is a 0.98 scale.
- Nothing loops forever in view. The aurora makes six 40s passes and then rests.
- Under `prefers-reduced-motion`, the aurora is static, there are no slides, and every transition is effectively instant.

## 7. Imagery

- Realistic, warm golden-hour photography of the fictional creator (a woman in her late 20s) and her travels: Lisbon streets, night markets, a van on the coast, cafés, mountain sunrises and hostel friends.
- No real people, no logos and no text in images.
- WebP files in `web/public/creator/`, each 250 KB or less. Stills are 1600x1000, portraits 1200x1500 and fan faces 256x256. They are listed in `web/lib/creator-assets.ts` and the prompts are recorded in `prompt.md`.
- Images sit inside frosted frames. Never put text on an image without a glass panel under it.

## 8. Rules

- **One rainbow marketing action per viewport; the app keeps coral.** On the landing, rainbow marks "Try the live demo" (hero, navbar once the hero CTA scrolls away, demo CTA) and never shows twice in one viewport. Dashboard and fan-app screens never use it: one coral per screen. If two things look primary, one of them is secondary.
- **Words are ink.** Use ink or ink-soft on glass, and never pastel words. Coral is never small text on glass.
- **Text on glass reaches AA.** Check new pairs with `node web/scripts/contrast-check.mjs <fg> <bg>`. A `#rrggbbaa` foreground composites over the background.
- **Glass carries text. The aurora does not.** Body text never sits directly on a bright pool. Display serif on cream is fine.
- **Serif only at 28px and up.**
- **No numbers for matches outside a side panel.**
- **Touch targets of 44px on fan pages.**
- **The AI never sends anything to fans without a creator click.**

## 9. Not this

These belong to the old "Clubhouse" system. Do not bring them back:
- The pewter shell: a 40px-radius grey frame around the app, the hazed shell and the header tray.
- The lime active pill, or any lime fill.
- The purple (violet) primary button and the purple focus ring.
- A pill sidebar with text labels plus a "Welcome 🎉" header tray over a tab bar and a table, which is the old layout.
- Flat white 45% "glass" with no blur.
- The clay-diorama sphere canvas, the clay loop video and its frames, and the clay auth/onboarding art.
- Dense admin tables as the default view, raw fit-score bars and "Export CSV" as a primary button.

Legacy Clubhouse tokens (`bg-page`, `text-ink-muted`, `--purple`, `--lime` and similar) remain in `globals.css` under `/* legacy: remove in Task 15 */` until `rg` finds no caller.
