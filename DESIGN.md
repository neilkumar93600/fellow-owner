---
name: Fellow Owners
description: "The Clubhouse: a soft pewter shell of glass pills, pastel rooms and one purple invitation, where fans gather by interest and the creator drops by."
colors:
  page: "#F2F2F3"
  shell: "#DADADC"
  blur-1: "#AEB8E6"
  blur-2: "#9FD0D7"
  blur-3: "#D7CCB6"
  glass: "#FFFFFF73"
  card: "#F9F9FA"
  card-strong: "#FFFFFF"
  table-head: "#E9E9EB"
  ink: "#2D2D30"
  ink-soft: "#5E5E62"
  ink-muted: "#6E6E73"
  ink-faint: "#9A9AA0"
  line: "#E5E5E8"
  line-row: "#D4D4D8"
  line-strong: "#BDBDC2"
  line-field: "#8E8E94"
  lime: "#E8FA8B"
  peach: "#FFF3E3"
  peach-tile: "#FFE6C4"
  orange: "#F2A93B"
  lavender: "#F1ECFF"
  lavender-tile: "#E3D9FF"
  purple: "#7C3AED"
  purple-chart: "#8B5CF6"
  aqua: "#E1F7F9"
  aqua-tile: "#C9F0F4"
  teal: "#1FBFD0"
  success: "#16A34A"
  success-ink: "#15803D"
  warn-bg: "#FFF1D6"
  warn-ink: "#A45A00"
  info-bg: "#DDF5F8"
  info-ink: "#0E7490"
  danger: "#EF4444"
  danger-deep: "#DC2626"
typography:
  display:
    fontFamily: "Inter, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "32px"
    fontWeight: 500
    lineHeight: "40px"
    letterSpacing: "-0.01em"
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
  count:
    fontFamily: "Inter, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "32px"
    letterSpacing: "-0.01em"
    fontFeature: "'tnum' 1"
  trend:
    fontFamily: "Inter, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: "24px"
    letterSpacing: "normal"
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
  label-strong:
    fontFamily: "Inter, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: "22px"
    letterSpacing: "normal"
  small:
    fontFamily: "Inter, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
    letterSpacing: "normal"
    fontFeature: "'tnum' 1"
  small-strong:
    fontFamily: "Inter, 'Helvetica Neue', Arial, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
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
  search: "12px"
  tile: "14px"
  field: "16px"
  chip: "20px"
  idea: "24px"
  card: "28px"
  fan-shell: "32px"
  shell: "40px"
  pill: "9999px"
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
  app-shell:
    backgroundColor: "{colors.shell}"
    rounded: "{rounded.shell}"
    padding: "{spacing.xl}"
  fan-shell:
    backgroundColor: "{colors.shell}"
    rounded: "{rounded.fan-shell}"
    padding: "{spacing.xl}"
    width: "720px"
  sidebar-item:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "52px"
    padding: "0 20px"
  sidebar-item-hover:
    backgroundColor: "{colors.card}"
  sidebar-item-active:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.ink}"
    typography: "{typography.label-strong}"
  header-tray:
    backgroundColor: "{colors.glass}"
    rounded: "{rounded.pill}"
    height: "64px"
    padding: "0 12px"
  header-subtitle:
    textColor: "{colors.ink-soft}"
    typography: "{typography.body}"
  notification-badge:
    backgroundColor: "{colors.danger-deep}"
    textColor: "{colors.card-strong}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    size: "16px"
  tab-bar:
    backgroundColor: "{colors.glass}"
    rounded: "{rounded.pill}"
    height: "64px"
    padding: "0 24px"
  tab:
    textColor: "{colors.ink-soft}"
    typography: "{typography.body}"
  tab-active:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
  toolbar:
    backgroundColor: "{colors.glass}"
    rounded: "{rounded.pill}"
    padding: "{spacing.md}"
  button-primary:
    backgroundColor: "{colors.purple}"
    textColor: "{colors.card-strong}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 24px"
  button-secondary:
    backgroundColor: "{colors.card-strong}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 20px"
  button-secondary-hover:
    backgroundColor: "{colors.page}"
  button-toolbar:
    backgroundColor: "{colors.card-strong}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 16px"
  button-ghost:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "40px"
  button-ghost-row:
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
    size: "40px"
  button-ghost-fan:
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "44px"
  button-destructive:
    textColor: "{colors.danger-deep}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "40px"
    padding: "0 16px"
  search-square:
    backgroundColor: "{colors.card-strong}"
    textColor: "{colors.ink}"
    rounded: "{rounded.search}"
    size: "40px"
  dropdown:
    backgroundColor: "{colors.card-strong}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.search}"
    height: "40px"
    padding: "0 16px"
  overview-band:
    backgroundColor: "{colors.glass}"
    textColor: "{colors.ink}"
    typography: "{typography.h2}"
    rounded: "{rounded.card}"
    height: "72px"
    padding: "0 24px"
  stat-card-peach:
    backgroundColor: "{colors.peach}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.xl}"
  stat-card-lavender:
    backgroundColor: "{colors.lavender}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.xl}"
  stat-card-aqua:
    backgroundColor: "{colors.aqua}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.xl}"
  stat-card-white:
    backgroundColor: "{colors.card-strong}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.xl}"
  stat-value:
    textColor: "{colors.ink-soft}"
    typography: "{typography.stat}"
  stat-label:
    textColor: "{colors.ink-soft}"
    typography: "{typography.small-strong}"
  stat-trend:
    textColor: "{colors.success-ink}"
    typography: "{typography.trend}"
  stat-trend-lavender:
    textColor: "{colors.ink}"
    typography: "{typography.trend}"
  icon-tile-peach:
    backgroundColor: "{colors.peach-tile}"
    textColor: "{colors.orange}"
    rounded: "{rounded.tile}"
    size: "56px"
  icon-tile-lavender:
    backgroundColor: "{colors.lavender-tile}"
    textColor: "{colors.purple-chart}"
    rounded: "{rounded.tile}"
    size: "56px"
  icon-tile-aqua:
    backgroundColor: "{colors.aqua-tile}"
    textColor: "{colors.teal}"
    rounded: "{rounded.tile}"
    size: "56px"
  icon-tile-white:
    backgroundColor: "{colors.table-head}"
    textColor: "{colors.ink}"
    rounded: "{rounded.tile}"
    size: "56px"
  chart-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.xl}"
  chart-label:
    textColor: "{colors.ink-soft}"
    typography: "{typography.small}"
  chart-legend:
    textColor: "{colors.ink-soft}"
    typography: "{typography.body}"
  chart-tooltip:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "28px"
    padding: "0 12px"
  data-table:
    backgroundColor: "{colors.card-strong}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.card}"
    padding: "{spacing.md}"
  table-header:
    backgroundColor: "{colors.table-head}"
    textColor: "{colors.ink}"
    typography: "{typography.small-strong}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 24px"
  table-row:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.small}"
    height: "48px"
    padding: "0 24px"
  table-row-hover:
    backgroundColor: "{colors.card-strong}"
  table-compact-header:
    textColor: "{colors.ink-muted}"
    typography: "{typography.small}"
    height: "40px"
  table-compact-row:
    textColor: "{colors.ink-soft}"
    typography: "{typography.small}"
    height: "48px"
  table-compact-row-hover:
    backgroundColor: "{colors.card-strong}"
  pagination:
    backgroundColor: "{colors.glass}"
    rounded: "{rounded.pill}"
    padding: "4px 12px"
  page-item:
    textColor: "{colors.ink-soft}"
    typography: "{typography.small}"
    rounded: "{rounded.pill}"
    height: "32px"
    width: "60px"
  page-item-current:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.ink}"
    typography: "{typography.small-strong}"
  page-next:
    backgroundColor: "{colors.card-strong}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    size: "40px"
  chip-band:
    backgroundColor: "{colors.glass}"
    rounded: "{rounded.card}"
    padding: "{spacing.xs}"
  count-chip:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.small}"
    rounded: "{rounded.chip}"
    width: "160px"
    height: "80px"
    padding: "12px 16px"
  count-chip-hover:
    backgroundColor: "{colors.card-strong}"
  count-chip-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.card-strong}"
  count-value:
    textColor: "{colors.ink-soft}"
    typography: "{typography.count}"
  idea-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
    rounded: "{rounded.idea}"
    padding: "{spacing.lg}"
  idea-card-hover:
    backgroundColor: "{colors.card-strong}"
  community-card:
    backgroundColor: "{colors.peach}"
    textColor: "{colors.ink-soft}"
    typography: "{typography.h1}"
    rounded: "{rounded.card}"
    padding: "{spacing.xl}"
  status-pill-warn:
    backgroundColor: "{colors.warn-bg}"
    textColor: "{colors.warn-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    height: "24px"
    padding: "0 10px"
  status-pill-info:
    backgroundColor: "{colors.info-bg}"
    textColor: "{colors.info-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    height: "24px"
    padding: "0 10px"
  status-pill-neutral:
    backgroundColor: "{colors.table-head}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    height: "24px"
    padding: "0 10px"
  ai-chip:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    height: "24px"
    padding: "0 10px"
  ai-chip-reviewing:
    backgroundColor: "{colors.card}"
    textColor: "{colors.ink}"
  ai-chip-unanalyzed:
    backgroundColor: "{colors.table-head}"
    textColor: "{colors.ink}"
  fit-pill:
    backgroundColor: "{colors.card-strong}"
    textColor: "{colors.success-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    height: "24px"
    padding: "0 8px"
  fit-pill-mid:
    textColor: "{colors.warn-ink}"
  fit-pill-low:
    textColor: "{colors.ink-muted}"
  input:
    backgroundColor: "{colors.card-strong}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    height: "44px"
    padding: "0 14px"
  summary-well:
    backgroundColor: "{colors.lavender}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.field}"
    padding: "12px 16px"
  side-panel:
    backgroundColor: "{colors.card-strong}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    width: "480px"
    padding: "{spacing.xl}"
  dialog:
    backgroundColor: "{colors.card-strong}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    width: "440px"
    padding: "{spacing.xl}"
  toast:
    backgroundColor: "{colors.card-strong}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "12px 16px"
  avatar:
    backgroundColor: "{colors.lavender-tile}"
    textColor: "{colors.ink}"
    typography: "{typography.small-strong}"
    rounded: "{rounded.pill}"
    size: "40px"
  bottom-nav:
    backgroundColor: "{colors.card}"
    rounded: "{rounded.pill}"
    height: "64px"
    padding: "{spacing.xs}"
  bottom-nav-item:
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    height: "48px"
    padding: "0 16px"
  bottom-nav-item-active:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.ink}"
    typography: "{typography.label-strong}"
---

# Design System: Fellow Owners

## 1. Overview: The Clubhouse

**Creative North Star: "The Clubhouse"**

Fellow Owners is a warm, well-kept home where fans gather by interest and the creator drops by: friendly first, organized second. The look comes straight from the nine Starline reference screens in docs/design-reference: a pewter shell with 40px corners floating on a pale page, a strong haze of periwinkle, sea glass and sand pooling across its lower right, navigation made of frosted pills, and content on pastel and white cards with generous radii. Nothing is sharp, nothing shouts, and the single purple button on a screen is the invitation to act.

Density follows the person. The creator dashboard is a calm product surface: a fixed pill sidebar, a welcome header, then a tab bar, a toolbar and a white table or a grid of cards. Today opens on the AI briefing and three pastel stat cards, so the few things worth a decision come before any full list. Fan pages are the same clubhouse at phone scale: one centered column, 44px touch targets, pastel community cards and one obvious way in. Tabs, tables, side panels and pagination behave exactly as creators expect from the best tools; personality lives in color, radius and the shell's haze, never in invented affordances. Text speaks in two tones, as in the references: near-black ink for titles, labels and anything active, and a soft mid grey for data, figures and everything at rest.

The system rejects Discord-style noise, paid DMs, one-way link-in-bio pages and Google Forms, low-contrast status text, placeholder copy and the AI light show. The AI shows up as a small lime "AI pick" chip with its reason beside it, never as glow, gradient or sparkle confetti. Motion is soft and settled: 150 to 250ms ease-out color and opacity changes, a 0.98 press, and nothing that bounces, slides for show or shifts the layout. Theme is light only in v1, because the scene demands it: a creator at a laptop by a window in daylight between shoots, and a fan on a phone inside the bright white chrome of an Instagram, TikTok or YouTube in-app browser, both reading in full ambient light and both arriving from white screens. Dark mode is feature F26 and waits for P2.

**Deliberate departures from impeccable defaults.** Each one below is intentional. The reference screens and the approved brief (docs/04-ui-ux-brief.md) win over the general rule; future agents must not "fix" these.
- **Glassmorphism as default (impeccable: rare or nothing).** We use glass, a flat 45% white fill, as the standard skin for navigation chrome on the shell: sidebar and icon rail items, the header tray, tab bars, toolbars, the Ranked or Board segmented pill, pagination, the count chip band, the Fanbase overview title band, the fan community switcher and the bio link's platform chips. Why: it is the signature of every reference screen, and brief §3 and §5 specify it. Guard: no backdrop-filter, never on content cards, never over scrolling content (The Still Glass Rule).
- **Decorative blur (impeccable: blurs only when purposeful).** The app shell carries three blurred radial layers (blur-1, blur-2, blur-3) pooling across its lower right. Why: reference shell, brief §5 App shell. Guard: the shell is the only blurred thing in the product, and below the header only ink sets words directly on it (The Dark Words Rule).
- **The hero-metric template (impeccable: banned).** Today opens with three pastel stat cards: icon tile, 40px number, label, trend row. Why: reference dashboards and brief §6. Guard: only on Today, at most three, each opens the list it counts, no gradient accent anywhere (repeated as a Do).
- **Identical card grids (impeccable: banned).** Communities, the bio link community list and the Ideas grid use same-sized cards. Why: the reference POS machine cards and product grid, brief §5 and §7. Guard: tints rotate apricot, lavender, aqua, white; every card carries live, different data (members, trend, digest, signals); Communities never exceeds two columns (repeated as a Do).
- **Cards as the primary container (impeccable: cards are the lazy answer).** Stat, This week, briefing, chart, table, idea, community and Join cards carry most screens. Why: every reference screen is built from cards, brief §5. Guard: a card holds one object or one dataset (a stat, a chart, a table, a community, an idea); layout chrome stays glass or bare shell, and a card never holds a card (repeated as a Do).
- **Number tickers (impeccable: 150 to 250ms, motion conveys state only, no page-load sequences).** Stat numbers count up over 600ms ease-out-expo. Why: brief §5 Stat card. Guard: stat cards only, once on first load, never on refetch or tab return, and the final value under reduced motion.
- **Never #fff (impeccable: banned).** card-strong is pure #FFFFFF for table cards, the This week card, the white cards in the tint rotation, inputs, buttons, hovered rows and cards, and overlays; text and icons on purple, ink and Brick Red are pure white; the online dot and stacked avatars wear 2px pure white rings. The page and shell neutrals sit at OKLCH chroma 0.001 to 0.003, under impeccable's 0.005 tint floor. Why: brief §3 tokens, matching the reference whites (the e23ccb Sales card, hovered rows, buttons). Guard: pure white appears only in those roles (repeated as a Do).
- **High chroma near white (impeccable: reduce chroma as lightness nears 100).** Clubhouse Lime is oklch(94.8% 0.137 116.7). Why: the reference's active state and brief §3. Guard: small marker areas only (active nav pill, current page, current fan community, AI chips, chart tooltip), never a surface or text, always with ink on top (The Lime Means Here Rule).
- **Use OKLCH (impeccable: OKLCH first).** Hex is normative in this file's frontmatter; the canonical OKLCH and tonal ramps live in DESIGN.json. Why: the brief is written in hex and Stitch's linter validates hex only. Guard: no token is redefined in a third format (repeated under Colors).
- **Nested containers (impeccable: nested cards are always wrong; do not wrap everything).** Toolbars and pagination wrap their controls in glass, the count chip band holds chips, tables sit inside white cards, and the Promote panel holds one lavender summary well. Why: reference table, POS and dashboard screens, brief §5 and §7. Guard: exactly one level; glass holds only controls and titles, and a card never holds a card (The One Step Rule).
- **Type steps of at least 1.25 (impeccable).** Caption 12, Small 13, Body 15, Trend 18 and H2 20 sit 1.08 to 1.2 apart. Why: brief §4 scale plus the reference's 18px trend row. Guard: neighbouring steps never share a role, and weight separates them: Caption 500 against Small 400, Trend 500 against Body 400 (repeated under Typography).
- **Restrained color in product UI (impeccable: one accent at 10% or less).** Pastel tints fill whole cards and lime marks selection, so color covers far more than 10% of Today and Communities. Why: reference dashboards and POS machine cards. Guard: purple is the only action color, pastels are surfaces and never text, inactive states stay neutral.

**Deliberate corrections to the brief.** The brief is the approved translation of the reference screens, but in the places below it either fails WCAG 2.2 AA (brief §8 and PRODUCT.md require AA on every screen) or misreads the references, which are the visual target. This list is the one index of those corrections; the measured contrast values sit in the Colors ledger and the full specs in Components. This file wins in each case; do not change them back to the brief.
- **Secondary text tone (brief §3, §5 Header and Tab bar: ink-muted).** The header subtitle, inactive tabs, table body cells, page numbers, stat and count figures, stat card labels, community card names and chart labels are ink-soft (#5E5E62), and table header labels are ink. Why: the references set all of these in a mid grey, and ink-muted fails on the shell (3.6:1), glass (4.2:1) and the header pill (4.2:1), while ink-soft clears 4.6:1 and up.
- **Trend color (brief §3: success for trend text at 18px and above).** Meadow Green never sets words; every trend figure and rising arrow is success-ink, and the figure turns ink where success-ink fails. Why: the brief's 18px threshold is not WCAG large text (24px regular or 18.7px bold), so an 18px/500 trend figure needs 4.5:1, and Meadow Green is 3.3:1 on white and 2.85 to 3.01:1 on the tints.
- **Placeholders and the fit low band (brief §3: ink-faint).** Placeholders and the low fit number are ink-muted; ink-faint keeps only disabled glyphs and bars. Why: ink-faint is 2.8:1 on white.
- **Focus ring (brief §5 Inputs, §9 Focus: purple at 40%).** The ring is solid purple, 2px, offset 2px. Why: at 40% it measures 1.7 to 1.9:1, under the 3:1 that WCAG 1.4.11 sets for focus indicators.
- **Input border (brief §5 Inputs: 1px line).** Inputs rest on a 1px Field Grey (#8E8E94) border. Why: line is 1.26:1 on white, and the border is the field's only boundary (1.4.11 needs 3:1).
- **Notification badge (brief §3: danger).** The badge fills with Brick Red (#DC2626). Why: a white count on Signal Red is 3.8:1; on Brick Red it is 4.8:1.
- **Error and destructive words (brief §5 Buttons: red text ghost; §9 Error: `--danger` with an icon).** The words of field errors, destructive buttons and an over-limit character count are Brick Red (#DC2626), on Pure White or Paper White only; the icon and the error border stay Signal Red. Why: Signal Red words are 3.8:1 on white, while Brick Red keeps the brief's red words at 4.8:1 on white and 4.6:1 on Paper White (it fails on every tint, glass and the shell).
- **Chart label sizes (brief §4: Caption for chart labels).** Axis labels are Small (13px), legend labels Body (15px) and the tooltip figure Label (15px). Why: measured in e23ccb against its 20px card titles, the axis labels run about 13px, the legend about 15px and the "21,345" tooltip figure about 18px; Caption reads smaller and fussier than the reference charts.
- **Row dividers (brief §3: line for dividers).** Table rows are ruled in Ledger Grey (#D4D4D8); Hairline Grey keeps chart grids and outlines. Why: the reference tables rule their rows at #BEBDC0 to #DBDADD (299cc1, 3cd1c6, cda9bd, 063e6f) and about #CCCCCC in e23ccb's Top Products; at #E5E5E8 the ruled look nearly vanishes.
- **Which white (brief §5: "White" chart, briefing and idea cards).** Chart cards, the AI briefing card, idea cards, the Promote panel and inactive count chips rest at Paper White, the brief's default card, and step up to Pure White on hover; Pure White stays for tables, inputs, the This week card, the white cards in the tint rotation and overlays. Why: brief §3 (card is the default card) and §9 (cards switch to card-strong on hover), and the references: e23ccb chart cards #F7F6FB to #FAF8F6 beside a #FFFFFF Sales card, 096dc0 product cards #F7F6F9 and count chips #F7F7F7.
- **Shell haze strength (brief §3: 35 to 45% opacity).** The three layers peak at 0.72 to 0.90 alpha and fade linearly to their edges. Why: at 35 to 45% the haze renders as a faint tint, while the references show a strong colored pool (about #A5BED0 on the bottom edge, 60% across, in c7c71f).
- **Fanbase overview (brief §6: a glass container holding the stat cards).** A glass title band heads a stack of full-width cards set 8px apart; the glass does not run behind them. Why: reference dashboard e23ccb.
- **Trend row size (brief §4 has no 18px step).** A Trend role (18px, 500, tabular) sets stat card trend figures and the community card members line. Why: in the references the trend row and the machine card data lines are the card's second-largest text.
- **Dropdown shape (brief §5 Toolbar: white dropdown pill).** The dropdown is a white button with a 12px radius, matched to the search square beside it. Why: reference toolbars 063e6f, 299cc1, 3cd1c6 and cda9bd.
- **Theme button (brief §5 Header).** Not rendered in v1. Why: the product is light only until F26.
- **Card hover (brief §9: rows and cards switch to card-strong).** Pastel cards and Pure White cards keep their fill on hover; the stat card label steps to ink and a chevron fades in. Why: a white flash would erase the tint that identifies a pastel card, and a Pure White card has no lighter step.
- **Table rows (brief §5 Data table: the hovered row turns card-strong).** Rows rest at Paper White inside the Pure White table card, so the lift to Pure White on hover can show. Why: brief §3 and the elevation order put tables at Pure White, and rows already at Pure White would have nowhere to go.

**Key Characteristics:**
- A pewter shell (40px radius) on a pale page, with a strong haze of periwinkle, sea glass and sand pooling across its lower right.
- Frosted glass pills for every piece of navigation chrome: sidebar items, header tray, tab bars, toolbars, pagination.
- Lime marks where you are; purple marks the one thing to do.
- Pastel apricot, lavender and aqua cards with deeper icon tiles carry stats and communities.
- Two text tones: near-black ink for titles, labels and active states; a soft mid grey for data, figures and inactive tabs.
- White tables with a grey pill header row, 48px rows and ruled grey dividers.
- Flat tonal layers; only side panels, dialogs and popovers (menus and tooltips included) cast a shadow.
- Inter everywhere, weights 400 to 600, tabular figures on anything counted; soft and settled motion, a 0.98 press, nothing jumps.

## 2. Colors: The Clubhouse Pastels

A quiet pewter frame holding pastel rooms, with lime for "you are here" and purple for "do this".

Hex in the frontmatter is normative; DESIGN.json colorMeta holds the canonical OKLCH value and tonal ramp for every token. Never redefine a token in a third format.

### Primary
- **Invitation Purple** (#7C3AED): the fill of the primary button (Publish, Promote, Send pitch, Join, New post) and the focus ring, and nothing else. White label at 5.7:1. Hover mixes 6% ink into the fill; it never lightens.

### Secondary
- **Clubhouse Lime** (#E8FA8B): the active sidebar and icon rail item, the current page in pagination, the active bottom nav item, the current community in the fan switcher, the "AI pick" and "AI suggested" chips and the chart tooltip. Always with ink on top (12.1:1). Lime is a marker, not a surface.

### Tertiary: the pastel rooms
- **Apricot Cream** (#FFF3E3): stat card and community card tint; the Members stat on Today.
- **Apricot Tile** (#FFE6C4): the 56px icon tile on apricot cards; avatar tint.
- **Marigold** (#F2A93B): first chart series, icon stroke in apricot tiles. Never text (2.0:1 on white).
- **Lavender Mist** (#F1ECFF): stat card and community card tint; the Ideas this week stat on Today; the composer's summary well.
- **Lavender Tile** (#E3D9FF): icon tile on lavender cards; avatar tint.
- **Chart Violet** (#8B5CF6): second chart series, icon stroke in lavender tiles. Never a button, never text.
- **Pool Aqua** (#E1F7F9): stat card and community card tint; the Opportunities waiting stat on Today.
- **Pool Tile** (#C9F0F4): icon tile on aqua cards; avatar tint.
- **Lagoon Teal** (#1FBFD0): third chart series, icon stroke in aqua tiles. Never text (2.2:1 on white).

Chart series always run in the order Marigold, Chart Violet, Lagoon Teal, and no chart has a fourth series color: lime appears in a chart only as the tooltip pill and Fog Grey only as the hover guide. The Inbox mix donut therefore shows at most three segments: the two largest pitch types in Marigold and Chart Violet, and Everything else in Lagoon Teal, as the reference donut does. Its leader labels and legend name those three segments; the one-line summary and the Show data table list all five types (Collabs, Investment, Ideas, Press, Fan notes) with counts. White cards in a tint rotation take a Dove Grey icon tile with an ink icon.

### Neutral
- **Soft Daylight Grey** (#F2F2F3, page): everything outside the shell; also the hover fill of white secondary buttons and ghost icons on white.
- **Pewter Shell** (#DADADC, shell): the app shell, the fan shell, and the whole fan page background on phones.
- **Frosted Glass** (#FFFFFF73, glass: white at 45%): sidebar and icon rail items, the header tray, tab bars, toolbars, the Ranked or Board segmented pill, pagination, the count chip band, the Fanbase overview title band, the fan community switcher and the bio link's platform chips. Composites to #EBEBEC over the bare shell and about #D7DCEE over the deepest haze.
- **Paper White** (#F9F9FA, card): the default card: chart cards, the AI briefing card, idea cards, the Promote panel and inactive count chips; table rows at rest; the phone bottom nav; sidebar item hover; the "AI reviewing" chip.
- **Pure White** (#FFFFFF, card-strong): table cards, the This week card, the white cards in the tint rotation, inputs, buttons, the search square and dropdown, hovered and selected rows, hovered Paper White cards, the donut's inner disc, the post preview frame, side panels, dialogs, popovers and toasts; also the 2px rings around the online dot and stacked avatars.
- **Dove Grey** (#E9E9EB, table-head): the header pill of every full-page table, neutral status pills, the "Not analyzed" chip, the icon tile on white cards, skeleton blocks.
- **Charcoal Ink** (#2D2D30, ink): titles, labels, buttons, the active tab, table header labels, prose, the active count chip fill, the logo placeholder. The darkest color in the system; pure black is never used.
- **Iron Grey** (#5E5E62, ink-soft): the references' mid-grey data tone: the header subtitle, inactive tabs, table body cells, page numbers, stat and count figures, stat card labels, community card names, chart legend and axis labels, row action icons, and secondary text wherever ink-muted fails. It clears AA on every surface, glass over the deepest haze included (4.7:1); the one place it may not set words is directly on the hazed shell (3.6:1).
- **Graphite Grey** (#6E6E73, ink-muted): secondary text, placeholders and helper text, only on the surfaces the ledger below allows.
- **Fog Grey** (#9A9AA0, ink-faint): disabled glyphs, the fit bar's low band and the chart hover guide. Never words.
- **Hairline Grey** (#E5E5E8, line): outlines of secondary buttons, toasts and the post preview frame on white, the fit pill outline and bar track, the "AI reviewing" chip border, the donut disc's ring, chart grid lines.
- **Ledger Grey** (#D4D4D8, line-row): the 1px row dividers of full-page and compact tables and the compact table's header rule, matching the ruled rows of the reference tables (#BEBDC0 to #DBDADD).
- **Ring Grey** (#BDBDC2, line-strong): 1px outlines of controls that sit on glass (page items, the previous and next circles, the search square, toolbar pills), the tab hover underline, the summary well's total rule. 1.6:1 on glass: a drawn edge, never the only cue.
- **Field Grey** (#8E8E94, line-field): the 1px rest border of inputs and textareas (3.3:1 on white, 3.1:1 on Paper White) and the upcoming dots of Join and onboarding progress.
- **Periwinkle Haze** (#AEB8E6, blur-1): the top layer of the shell's haze, centred low and just right of the middle, peak alpha 0.72 (placement under App shell). Atmosphere only; never a fill, border or text.
- **Sea Glass Haze** (#9FD0D7, blur-2): the middle haze layer, pooling along the bottom edge, peak alpha 0.88. Atmosphere only.
- **Sand Haze** (#D7CCB6, blur-3): the bottom haze layer, on the right edge, peak alpha 0.90. Atmosphere only.

### Status
- **Meadow Green** (#16A34A, success): the online dot only. Never words (3.3:1 on white, 3.0:1 or less on the tints).
- **Deep Meadow** (#15803D, success-ink): every rising trend figure and arrow; the high band (70 to 100) of the fit pill.
- **Butter Wash** (#FFF1D6, warn-bg): the fill of "New", "Requested" and "Pending" pills and of the AI paused banner.
- **Toffee** (#A45A00, warn-ink): the words on Butter Wash (4.65:1); the mid band (40 to 69) number and bar of the fit pill; character counts from 90% of their limit (5.2:1 on white).
- **Ice Wash** (#DDF5F8, info-bg): the fill of "Shortlisted", "Accepted", "Replied" and "Live" pills.
- **Harbor Teal** (#0E7490, info-ink): the words on Ice Wash (4.72:1).
- **Signal Red** (#EF4444, danger): error icons, the error field border and the destructive icon. Never words (3.8:1 on white).
- **Brick Red** (#DC2626, danger-deep): the notification count badge fill (white Caption count at 4.8:1), and the words of field errors, destructive buttons and an over-limit character count, on Pure White or Paper White only (4.8:1 and 4.6:1).

### Contrast ledger (measured, WCAG 2.2)

| Text color | White | Paper White | Apricot | Aqua | Lavender | Header pill | Glass on shell | Shell |
|---|---|---|---|---|---|---|---|---|
| ink | 13.7 | 13.0 | 12.5 | 12.3 | 11.9 | 11.3 | 11.5 | 9.8 |
| ink-soft | 6.5 | 6.1 | 5.9 | 5.8 | 5.6 | 5.3 | 5.4 | 4.6 |
| ink-muted | 5.1 | 4.8 | 4.6 | 4.6 | 4.4 (no) | 4.2 (no) | 4.2 (no) | 3.6 (no) |
| success-ink | 5.0 | 4.8 | 4.6 | 4.5 | 4.3 (no) | 4.1 (no) | 4.2 (no) | 3.6 (no) |
| danger-deep | 4.8 | 4.6 | 4.4 (no) | 4.3 (no) | 4.2 (no) | 4.0 (no) | 4.0 (no) | 3.5 (no) |

Fixed pairs: warn-ink on warn-bg 4.65, info-ink on info-bg 4.72, ink on lime 12.1, white on purple 5.7, white on ink 13.7, white on Brick Red 4.8. ink-muted on the page is 4.53. The Shell column is the bare shell of the header band; over the deepest haze, glass composites to about #D7DCEE (ink 10.0, ink-soft 4.7, ink-muted 3.7) and the bare haze drops ink-soft to 3.6 and ink to 7.6.

Non-text contrast (WCAG 1.4.11, 3:1): the solid purple focus ring measures 5.7 on white, 5.4 on Paper White, 4.8 on glass, 4.1 on the bare shell and 3.1 over the deepest haze; Field Grey input borders and Join progress dots 3.3 on white; the Brick Red badge 4.0 against the glass tray; rising trend arrows in success-ink 4.3 even on lavender, so the arrow stays success-ink on every card. Chart strokes in Marigold (2.0:1) and Lagoon Teal (2.2:1) sit under 3:1 against the card, so a stroke is never the only source: the legend names each series, and the one-line summary and the Show data table carry every value.

Every place this file departs from the brief's colors for contrast is indexed once, under Deliberate corrections to the brief in the Overview; this ledger holds the numbers behind them.

### Named Rules
**The One Purple Rule.** Each screen has exactly one solid purple button: the action the screen exists for. On the creator Ideas grid each card is its own decision and may carry one purple Promote; nothing else on that screen is purple. Fan screens never show Promote. Purple never fills a card, a chip, a nav item or a link; outside the primary button it appears only as the focus ring.

**The Lime Means Here Rule.** Lime marks location or an AI pick: active nav and rail items, the current page, the active bottom nav item, the current community in the fan switcher, the "AI pick" and "AI suggested" chips, the chart tooltip. It is never a button fill, never a content background, never text, and never the only signal: active nav items are also weight 600 with a filled icon, the current page steps up to Small Strong, the current fan community to Label Strong, and every lime location marker carries aria-current.

**The Dark Words Rule.** Every word a person must read clears 4.5:1. Status is a tinted pill with dark text, never bare colored words. ink-muted sets words only on white, Paper White, Apricot Cream, Pool Aqua and the page, and success-ink only on the first four; on glass, lavender, the header pill and the shell's header band, secondary text steps up to ink-soft and trend figures to ink. Brick Red sets words only on white and Paper White. Below the header, only ink sets words directly on the shell, because the haze pulls anything lighter under 4.5:1. Marigold, Lagoon Teal, Chart Violet, Meadow Green, Signal Red and Fog Grey never set words.

## 3. Typography

**Display Font:** Inter (loaded with next/font as `--font-inter`, then Helvetica Neue, Arial, system-ui)
**Body Font:** Inter (same stack)
**Label/Mono Font:** none; Inter with tabular figures covers data

**Character:** One friendly, neutral sans at medium weights. Inter at 500 reads warm and settled at heading sizes and disappears into the task at 13 to 15px, which is what a clubhouse with a lot of tables needs. Load it with next/font, weights 400, 500 and 600 only.

### Hierarchy
- **Display** (500, 32px, 40px line, -0.01em): the creator welcome line, "Welcome, Mira 🎉", on the shell's header band. One per screen. The party emoji is the only emoji in product chrome.
- **H1 (headline)** (500, 24px, 32px line): page titles on fan pages and legal pages, community card names (in ink-soft), the creator name on the bio link.
- **H2 (title)** (500, 20px, 28px line): card titles ("Your AI briefing", "Inbox mix", "Top ideas"), the "Fanbase overview" band title, idea card titles, side panel titles, toolbar titles such as "Members", section heads on legal pages.
- **Stat** (600, 40px, 44px line, -0.02em, tabular): stat card numbers only, in ink-soft.
- **Count** (600, 24px, 32px line, tabular): the number inside a count chip; the nine figures of the "This week" card; in ink-soft.
- **Trend** (500, 18px, 24px line, tabular): the signed trend figure in stat cards and the "This week" card, in success-ink when rising (ink on lavender and when falling); the members line on community cards, whose "Members" label sets at the same size in 400.
- **Body** (400, 15px, 22px line): default reading text, inputs, inactive tabs, the header subtitle, toasts, the trend descriptor ("vs last week"), chart legend labels. Prose caps at 68ch: post bodies, pitch bodies, briefing highlights, legal pages (/privacy-policy, /terms, /cookies), showcase summaries and /about.
- **Label** (500, 15px, 22px line): buttons, sidebar items, the active tab, the selected segment, the chart tooltip figure (set tabular).
- **Label Strong** (600, 15px, 22px line): the active sidebar item, the active bottom nav item, the current community in the fan switcher, the wordmark, the summary well's total row.
- **Small** (400, 13px, 18px line, tabular): table cells, meta lines, count chip labels, the "This week" column heads, chart summaries, chart axis labels, page numbers.
- **Small Strong** (500, 13px, 18px line, tabular): table header labels, input labels, stat card labels, the "This week" metric names, the current page, donut label figures, avatar initials at 40px and in 28px table avatars.
- **Caption** (500, 12px, 16px line, 0.01em, tabular): status pills, AI chips, fit pill numbers, donut descriptors, the notification badge count, character counts, initials in 28px avatar stacks.

The steps from Caption to H2 (12, 13, 15, 18, 20) sit 1.08 to 1.2 apart by design, under impeccable's 1.25 minimum; weight, not size, separates neighbours, and no two neighbouring steps share a role.

### Named Rules
**The One Family Rule.** Inter carries everything: headings, labels, data, buttons. No second family, no display face, no italics for emphasis, no uppercase labels. Hierarchy comes from size and weight inside 400 to 600.

**The Counting Rule.** Every figure that can change or be compared is tabular ('tnum'): stat numbers, counts, trend figures, table cells, fit scores, pagination, chart axes and tooltips, character counts, clicks. The stat, count, trend, small, small-strong and caption tokens carry tnum, so numbers never shimmy when they update.

## 4. Elevation

Flat, tonal layers. Nothing casts a shadow at rest. Depth is a stacking order of five surfaces: the page (#F2F2F3) at the bottom; the Pewter Shell (#DADADC), one step darker, framing the work with its haze; then, from the shell up, each layer is lighter: frosted glass pills (white at 45%), Paper White cards (#F9F9FA: chart, briefing and idea cards, the Promote panel, count chips), and the Pure White layer (#FFFFFF) of table cards, the This week card, the white cards in the tint rotation and fields. A Paper White card steps up to Pure White on hover. Inside a Pure White table card, rows rest one step down at Paper White and lift to Pure White on hover or focus, the one deliberate inversion. Only overlays float above the layout, and they share one shadow: side panels, dialogs and popovers (dropdown menus and tooltips count as popovers). Toasts stay flat.

### Shadow Vocabulary
- **Overlay Soft** (`box-shadow: 0 24px 64px -16px rgba(45, 45, 48, 0.22)`): side panel (Sheet), dialog, popover, dropdown menu, fit reason tooltip. One layer, tinted with ink, never pure black. Toasts do not take it: they are Pure White with a 1px line border, flat like every card.
- **Focus Ring** (`outline: 2px solid #7C3AED; outline-offset: 2px`): keyboard focus on every interactive element. An outline, not a shadow, so it never shifts layout; 3:1 or better on every surface in the system.
- **Scrim** (ink at 20%, `rgba(45, 45, 48, 0.2)`): behind side panels and dialogs on screens narrower than 1024px, and behind dialogs at every width; on desktop the side panel has no scrim and the page stays readable beside it.

### Named Rules
**The Flat At Rest Rule.** Cards, pills, chips, buttons, tables, toasts and the shell never carry a shadow. If something needs to look raised, it moves one step up the tonal ladder instead. If it looks like a 2014 app, there is a shadow where a tone belongs.

**The Still Glass Rule.** Glass is a flat 45% white fill with no backdrop-filter. It sits only on the shell, holds only controls and titles (the list under Frosted Glass in Colors), never sits on a card or over scrolling content, and never holds body text longer than a label. The in-app browsers fans arrive in pay for every blur.

**The One Step Rule.** Glass sits only on the shell and holds controls, never content cards. Cards (pastel, Paper White or Pure White) sit on the shell, side by side or stacked under a glass title band. Inside a card only rows, inputs, tables, one bordered preview frame and one tinted summary well add a layer; table rows rest at Paper White inside the Pure White table card and lift to Pure White on hover or selection, the one deliberate inversion so the row hover shows. A card never holds a card.

## 5. Components

Soft and settled: pills and generous radii (12 to 40px), calm color changes, nothing jumps. Every interactive component ships default, hover, focus, pressed, disabled, loading and error states, and the selected state where it applies. The 4 to 40px spacing scale governs layout gaps and card padding; pill, chip and field internals may use 6, 10 and 14px to centre text optically.

### Shared states
- **Hover:** Paper White cards (chart, briefing and idea cards, inactive count chips) and table rows step up to Pure White; pastel and Pure White cards keep their fill and show hover on their own controls (the stat card label steps to ink and a chevron fades in); buttons darken about 6% (6% ink mixed into the fill). 150ms ease-out-quart, color and opacity only.
- **Focus:** the Focus Ring (2px solid purple, offset 2px) on `:focus-visible` only. Inputs also switch their border to purple. Controls inside a horizontally scrolling band keep at least 4px of clearance on every side, so the scroll box never clips the ring.
- **Pressed:** scale 0.98 over 150ms and back over 150ms (`--dur-fast`), on buttons, tabs, chips, page items and linked cards alike. Nothing else moves.
- **Disabled:** 50% opacity, `cursor: not-allowed`, no hover. Any message a person must read (a cap, a reason) sits beside the control at full opacity and is linked to it with aria-describedby.
- **Loading:** skeletons on first load in the exact shape of the final card; during a mutation a 16px spinner replaces the button's leading icon inside the same 20px box, the label stays, the width holds and the button carries aria-busy; the "AI reviewing" chip for AI work, with the item fully usable.
- **Error:** inline under the field (Signal Red icon, Brick Red words, aria-live polite); failed requests raise a persistent toast with Retry (see Toast) and revert optimistic changes.
- **Success:** a toast, and the list updates optimistically.
- **Selected:** lime for nav, the current page and the current fan community; ink fill with white text for count chips; a Pure White pill for the selected segment; Pure White for a table row whose side panel is open.
- **Touch targets:** on fan pages every interactive control is at least 44px: ghost icons become 44 by 44, and 40px pills and squares either grow to 44px or carry a 44px hit area through an inset ::before. Creator surfaces keep 40px controls and 32px page items, above the 24px minimum of WCAG 2.2 (2.5.8).

### App shell and layout
- **Page and shell:** page padding 24px on the page color. The creator shell is Pewter Shell, radius 40px, padding 24px, with three radial layers, each fading linearly to transparent at 100% of its radius and sized as a share of the shell box: Periwinkle Haze 38% by 53% centred at 53% 79%, peak alpha 0.72, on top; Sea Glass Haze 40% by 41% at 71% 102%, just past the bottom edge, alpha 0.88; Sand Haze 70% by 60% at 97% 80%, on the right edge, alpha 0.90, at the bottom of the stack. Check the visible result, not the numbers: about #BBC2DF at 50% 75%, #ABC9DA to #B2C7DC along the bottom edge between 60% and 70% across, #CECFC1 on the right edge 85% down, and near-bare Pewter across the top quarter and the left sixth. Content scrolls inside the shell; the haze stays fixed. The App Shell snippet in DESIGN.json is the one coded source of the haze; other snippets stage on a flat shell.
- **Creator grid:** the shell holds a 2 by 2 grid, as in every reference. Row one is the 88px header row: the logo cell, with the logo vertically centred on the welcome block, beside the header. Row two starts 24px lower and holds the sidebar (248px, fixed) beside the content, so the first sidebar pill shares its top edge with the first glass band (the tab bar, or the Fanbase overview band on Today). The sidebar sits 16px from the content; the content is a 12-column grid with 20px gaps. Vertical rhythm: 16px between tab bar, toolbar and content, 20px between cards, 16px above pagination.
- **Breakpoints:** 640, 768, 1024, 1280, 1536. Below 1024 the sidebar becomes an 88px icon rail. Below 768 the sidebar is replaced by a bottom nav (Today, Inbox, Ideas, More), the shell goes edge to edge with 16px padding and no radius, and tables become stacked rows.
- **Today at 1280 and up:** the left 4 columns hold the Fanbase overview: a glass title band (72px tall, 28px top corners, H2 "Fanbase overview" inset 24px), then directly beneath it, full column width and flush with the band's edges, three stat cards (Members in apricot, Ideas this week in lavender, Opportunities waiting in aqua) and the white "This week" card (Joins, Ideas, Pitches as Total, This month, Today), stacked 8px apart. The glass stops at the band, so the gaps between cards show the shell; the 8px stack gap is the one exception to the 20px card gap. Right 8 columns: the "Your AI briefing" Paper White card on top, the first thing the eye lands on; below it the "Inbox mix" donut card and the "Top ideas" compact table card side by side. Full width at the bottom: the "Fanbase activity" line chart, joins against ideas over 12 weeks. Below 1280 the briefing moves to the top, stat cards sit three across, then the rest stacks.
- **Fan pages:** one column, max width 720px, centered. On desktop it sits in a fan shell (Pewter Shell, radius 32px, padding 24px) on the page. On phones the whole page background is Pewter Shell, edge to edge, no radius, 16px padding, so glass chips and pills always sit on the shell. Layouts hold from 360px wide. Legal pages (/privacy-policy, /terms, /cookies) use the same column: H1 title, H2 section heads, Body at 68ch.

### Navigation
- **Sidebar item:** a glass pill, 52px tall, 20px icon plus Label, 12px gap, 8px between items. Hover: Paper White. Active: lime fill, Label Strong, filled icon, aria-current="page". Order: Today, Inbox, Ideas, Communities, People, Promote, Asks (P1), Settings, Help. Logo placeholder in the logo cell above: two overlapping 20px circles in ink beside the "Fellow Owners" wordmark in Label Strong.
- **Icon rail (768 to 1023):** 52px round glass items, icon only, the label in a tooltip on hover and focus and in the aria-label; active item lime with aria-current.
- **Bottom nav (below 768):** a Paper White pill, 64px tall, 12px from the screen edges plus the safe area, 1px line border, 8px padding. Items are 48px tall pills with 16px side padding, a 20px icon and Label in ink, no fill. Active item: lime pill with a filled icon and Label Strong. It is not glass, because it floats over scrolling content.
- **Header:** left, the Display welcome line with a Body subtitle in ink-soft ("Here's what needs you today."); both sit on the haze-free top of the shell. Right, a glass pill tray, 64px tall, 12px side padding, holding 40px ghost icon buttons: search, notifications (bell with a 16px Brick Red count badge, white Caption count, capped at "9+", on the bell's top right; the bell's aria-label carries the full count), and the 40px avatar with a 10px Meadow Green online dot ringed 2px in Pure White. The theme button from the reference is not rendered in v1 (light only); it returns with F26. In demo mode a white "Switch to fan view" pill sits left of the tray.
- **Tab bar:** a glass pill, 64px tall, 24px side padding, text tabs 48px apart (40px below 1024). Each tab is 48px tall, vertically centred in the bar, which leaves 8px above and below for the focus ring. Inactive: Body in ink-soft. Active: Label in ink with a 2px ink underline 6px below the baseline; the underline grows in place (scaleX, 200ms ease-out-quart) and never slides between tabs. Hover on an inactive tab: the underline appears in Ring Grey. Press: 0.98. Tabs live in the URL, so they are links, not ARIA tabs: a nav with an aria-label, each tab an anchor to its ?tab= URL, the active one with aria-current="page", Tab moving between them. When tabs overflow (phones and the icon rail widths) the bar scrolls horizontally: a thin native scrollbar shows under a fine pointer and hides under a coarse one, and the active tab scrolls into view.
- **Segmented pill (Ideas: Ranked or Board):** a glass pill, 4px padding, two 40px segments. Selected: a Pure White pill with Label in ink and aria-pressed="true". Unselected: Body in ink-soft, Paper White on hover. Focus ring and 0.98 press as everywhere; the choice writes ?view= to the URL.
- **Pagination:** a glass pill group, 4px by 12px padding: the previous circle, 8px, up to five page items 2px apart, 8px, the next circle (428px wide with five pages, as in 299cc1). Page items are 60 by 32px pills with a 1px Ring Grey outline and Small figures in ink-soft. The current page is lime with no outline, Small Strong in ink, and aria-current="page". Previous is a 40px circle with a Ring Grey outline and an ink chevron (Paper White on hover, disabled at 50% on page 1); next is a 40px Pure White circle with a Ring Grey outline. Five pages at most, with an ellipsis item.
- **Fan top bar:** creator avatar (back to the bio link), community switcher as horizontal glass pills; the current community is lime with Label Strong and aria-current="page", and the others step to Paper White on hover; "My space" in the avatar menu. It scrolls with the page and never sticks, so its glass always sits on the shell.

### Buttons
- **Shape:** always a full pill (9999px), except the 40px search square and the dropdown, which share a 12px radius.
- **Primary:** Invitation Purple, white Label, 48px tall, 24px side padding, optional 20px leading icon. Hover darkens 6%; pressed scales 0.98; loading swaps the icon for a 16px spinner and holds the width; disabled at 50%. One per screen (The One Purple Rule). Full width inside side panels and on phones.
- **Secondary:** Pure White pill with a 1px outline (line on white and Paper White surfaces, Ring Grey on glass), ink Label, 48px tall (40px in toolbars, with a trailing 16px "+" when it creates something: "Add community +", "New promotion +"). Hover: page grey fill. Pressed 0.98; disabled 50%.
- **Ghost icon:** 40 by 40 round (44 by 44 on fan pages), no fill, 20px icon, aria-label required. Hover: Pure White fill on glass and cards, page grey on white surfaces. Row actions (eye, pencil, row menu) are ghost icons in ink-soft; tray, close and card actions are ink.
- **Destructive:** a ghost pill with a Signal Red trash or archive icon and a Brick Red Label ("Archive community"), placed only on Pure White or Paper White (side panel footers, dialogs, settings cards); on glass or a tint the action moves into the row menu, where it keeps the same colors. It always opens a small confirm dialog; the confirm button inside repeats the verb as a secondary pill with the Signal Red icon and a Brick Red label.
- **Search square and dropdown:** the toolbar's right side holds a 40px Pure White search square (12px radius, 1px Ring Grey outline) and a Pure White dropdown (40px tall, 12px radius, no outline, Body label plus a 16px chevron), drawn as a matched pair. The search square expands into a 280px search input in place (swapped, not width-animated); Esc collapses it and returns focus to the square. The chart range control is the same dropdown.

### Toolbar
- A glass pill below the tab bar, 16px padding, so 72px tall around 40px controls. Left: an optional H2 title ("Members") or toolbar secondary pills. Right: search square, then dropdowns for sort and filters. Sort and filters write to the URL.

### Chips and pills
- **Count chips (Ideas):** always inside a full-width glass band (radius 28px, 8px padding, horizontal scroll with a thin native scrollbar under a fine pointer and none under a coarse one; the last chip clips at the band's edge to show there is more). Each chip is a Paper White card, 160 by 80px, radius 20px, 12px by 16px padding: Small label in ink-muted over a Count figure in ink-soft. Active chip: ink fill, white label and count, aria-pressed="true". Hover: Pure White; focus: the ring; press 0.98.
- **Status pill:** 24px tall, 10px side padding, Caption. Warm (Butter Wash, Toffee words): New, Requested, Pending. Cool (Ice Wash, Harbor Teal words): Shortlisted, Accepted, Replied, Live. Neutral (Dove Grey, ink words): Archived, Filtered, Draft, Unpublished. Never bare colored text.
- **AI chip:** lime pill, Caption in ink with a 14px Sparkles icon: "AI pick". "AI reviewing": Paper White with a 1px line border and ink words, while a soft Dove Grey highlight band sweeps across every 1.6s, drawn as a translated pseudo-element behind the words (transform only; static under reduced motion). "Not analyzed": Dove Grey with ink words and a Retry ghost for the owner. "AI suggested" (fan Join step): the "AI pick" chip's lime and Sparkles with its own words, always with a reason line beside it. The Sparkles icon appears nowhere else.
- **Fit pill (creator only):** Pure White pill with a 1px line border, 24px tall (the WCAG 2.5.8 minimum) and focusable (tabindex 0) so keyboard users reach its tooltip: a Caption tabular number plus a 24 by 4px bar (line track, filled to the score). 70 to 100: Deep Meadow number and bar. 40 to 69: Toffee number and bar. 0 to 39: ink-muted number, Fog Grey bar. Hover or focus opens a tooltip with the one-line fit reason; the reason is also in the row's side panel. A fit score never appears without its reason.
- **Community chip:** a pill in the community's tile tint with its Lucide icon and name in Caption, ink words.

### Cards / Containers
- **Corner style:** 28px (card, `--radius-3xl`) for cards, tables, chart cards, side panels and dialogs; 24px (idea, `--radius-2xl`) for idea cards; 20px (chip, `--radius-xl`) for count chips and banners; 16px (field, `--radius-lg`) for inputs, popovers, toasts and the summary well; 14px (tile, `--radius-md`) for icon tiles; 12px (search, `--radius-sm`) for the search square, the dropdown and tooltips; 32px (fan-shell, `--radius-4xl`) and 40px (shell, `--radius-shell`) for the shells.
- **Background:** pastel tint (stat and community cards), Paper White (chart, briefing and idea cards, the Promote panel, count chips), Pure White (table cards, the This week card, the white cards in the tint rotation). See Elevation; no card has a shadow or a colored side stripe.
- **Border:** none, except 1px line on Pure White cards that sit directly on Pure White.
- **Internal padding:** 24px for stat, chart, briefing and community cards; 20px for idea cards; 16px for table cards.
- **Stat card:** tint (apricot, lavender, aqua or white). Layout: the 56px icon tile at the top left, a 24px icon in the tile's accent (white cards: Dove Grey tile, ink icon); the Stat number in ink-soft and its label beneath stack to the tile's right, 16px from it, the pair spanning the tile's height; the trend row runs the full card width 16px below. The number ticks up (600ms ease-out-expo; final value under reduced motion); the label is Small Strong in ink-soft. Trend row: a 20px arrow, a signed Trend figure and the descriptor in Body ink-muted ("vs last week"). Rising: a trending-up arrow and "+18%" in success-ink. Falling: a trending-down arrow and "−4%" (the U+2212 minus) in ink, never red. Flat: a minus icon and "0%" in ink-soft. The sign always lives in the text and the arrow stays aria-hidden, so a screen reader hears the direction. On lavender the descriptor is ink-soft and a rising figure is ink; the arrow stays success-ink. Hover: the fill stays; the label steps to ink and a 16px ink chevron fades in at the top right (opacity only). The whole card links to its list and shows the focus ring.
- **"This week" card:** Pure White, H2 title, then a 3 by 3 grid of figures under three equal column heads, Total, This month and Today, in Small ink-muted. Each metric (Joins, Ideas, Pitches) takes one row: its name in Small Strong ink on its own line, then its three Count figures in ink-soft, tabular, each under its column head. Figures past 9,999 abbreviate to one decimal (12.5k), so none overflows its column at the 293px card width of a 1280 screen (four Count characters run 66px against a 76px column). Last, one trend row for Joins in the stat card's trend vocabulary.
- **AI briefing card:** Paper White, H2 headline, three to five highlights, each a row with an "AI pick" chip, a one-line Body summary and its reason in Small ink-muted, with thumbs up and down ghost icons on the right. Footer: a Regenerate secondary pill; after the daily cap it is disabled at 50% and "5 of 5 used today" sits beside it in Small ink-muted at full opacity, linked by aria-describedby.
- **Chart card:** Paper White, H2 title top left, legend top right (10px dots in series color plus Body labels in ink-soft), optional range dropdown. Monotone curves at 2.5px, no area fill, faint vertical grid lines in line color, Small axis labels in ink-soft, tabular. Hover shows a 1px Fog Grey vertical guide and a lime tooltip pill, 28px tall, with the figure in Label, tabular, ink. Donut: at most three segments (the series rule under Colors), 20px stroke, round caps, 10 to 12px gaps between segments; the total in Count sits in a Pure White inner disc ringed by a 1px line hairline; 1px leader lines in each series color, ending in a short rule under the label, carry the figure in Small Strong ink (never the series color) and the descriptor in Caption ink-muted. Under every chart: a one-line Small summary ("Joins up 18% on last week") and a "Show data" ghost toggle that reveals a table. Strokes are never the only source of a value.
- **Data table (full page):** a Pure White card, radius 28px, 16px padding. The header row is a Dove Grey pill, 48px, Small Strong ink labels. Rows rest at Paper White, 48px tall, Small ink-soft cells (secondary columns ink-muted), 28px avatars with Small Strong initials, 1px Ledger Grey dividers, 24px side padding; the hovered row, the row holding focus (:focus-within) and the selected row lift to Pure White. Status columns use status pills; fit columns use fit pills; the last column holds ghost icon actions in ink-soft (eye, pencil, or the row menu). The primary cell (sender or name) is a real link (ink-soft like its neighbours, underlined on hover) to the row's ?item= URL and the keyboard path into its side panel; a click anywhere else on the row opens the same panel, and the eye ghost repeats it. Below 768 each row becomes a stacked item: primary cell, then pills, then a chevron.
- **Compact table (inside Today cards, such as "Top ideas"):** no pill header and no row fill: Small ink-muted header labels over a 1px Ledger Grey rule, 48px rows with 1px Ledger Grey dividers, Small ink-soft cells, 28px round thumbnails or avatars. A hovered or focused row lifts to Pure White on its Paper White card.
- **Idea card:** Paper White, radius 24px, padding 20px: community chip, H2 title (two lines max), one Body summary line in ink-muted, overlapping 28px team avatars, signal counts in Small ink-muted ("12 would use this · 4 would help build"), then Open (secondary, 48px). On creator screens the card adds the fit pill and Promote (purple, 48px, the brief's primary height); on fan pages it shows Open only, and the floating New post is the screen's one purple action. Hover: the card steps up to Pure White and the title underlines; nothing moves. Grid: 3 columns at 1280, 2 at 768, 1 below.
- **Community card:** pastel tint rotating apricot, lavender, aqua, white in creation order, radius 28px, padding 24px. Top row: the 56px icon tile with the community's Lucide icon (Code2 Builders, PenTool Designers, LineChart Investors & Operators, Music Music & Creators, Dumbbell Fitness Crew, Leaf Local Impact) and the name in H1 ink-soft, centred on the tile. Then 40px of open space, then the data lines at the bottom left, as in the reference machine cards: the members line at 18px, a "Members" label in 400 ink-muted, the figure in Trend ink-soft and the signed trend ("+12% this month") in success-ink with its arrow; then the digest line in Body ink. A ghost pencil sits at the bottom right, aligned to the last line. On lavender the label turns ink-soft and the trend figure ink while the arrow stays success-ink; the white card takes a Dove Grey tile with an ink icon. On Communities the whole card links to /dashboard/communities/{slug}: the name is the link, stretched over the card, and the pencil sits above it as its own button. Hover: the name steps from ink-soft to ink and a 16px ink chevron fades in at the top right; focus rings the whole card; press 0.98. Two columns on Communities, one on phones. On the bio link the card is not a link: the pencil becomes a Join secondary pill.
- **Join community tiles:** the same pastel cards made selectable as checkboxes (role="checkbox", aria-checked). Hover: the name steps to ink. Selected: a 2px ink border and a check icon. Focus: the ring. Suggested tiles carry the "AI suggested" chip and one Small line under the name with the reason in the fan's own terms ("Matches your intro: frontend dev who lifts"). The lavender rule applies.
- **Summary well (Promote composer):** a lavender inset well, radius 16px, 12px by 16px padding, inside the composer's Paper White panel. Rows of Small ink labels on the left and tabular values on the right (Platform, Characters, Short link with a Copy ghost), then a 1px Ring Grey rule and a final row in Label Strong: Clicks so far. ink-muted never appears in the well.

### Inputs / Fields
- **Style:** Pure White, radius 16px, 44px tall (textareas 96px minimum, 12px by 14px padding), 1px Field Grey border, Body ink, placeholder in ink-muted that never carries required information. Label above in Small Strong ink, 6px gap; helper text below in Small ink-muted. Hover: the border steps to ink-muted.
- **Focus:** the Focus Ring plus a purple 1px border.
- **Error:** Signal Red 1px border, a 16px Signal Red icon and the message in Small Brick Red below the field, announced through aria-live.
- **Disabled:** 50% opacity on the whole field.
- **Character count:** Caption tabular in ink-muted at the bottom right; Toffee from 90% of the limit; over the limit, Brick Red words with a Signal Red icon and Publish disabled.

### Overlays
- **Side panel:** shadcn Sheet from the right, 480px wide, Pure White, left corners 28px, padding 24px, Overlay Soft shadow. Header: H2 title, status pill, close ghost. Body scrolls; the action footer (reply box, Shortlist, Archive, purple primary) sticks to the bottom. Enters with a 24px translate and fade (250ms ease-out-expo), exits in 150ms. On open, focus moves to the panel's H2 (tabindex -1). Below 1024px, where the scrim shows, focus is trapped in the panel; on desktop it is not, and the table stays usable beside it. Esc and Back close it, and focus returns to the row's primary-cell link. Below 640 it fills the screen width and drops its radius.
- **Dialog:** only for destructive confirmation. Pure White, radius 28px, 440px wide, Overlay Soft, scrim at all widths. Esc and Cancel close it; focus is trapped inside while it is open and returns to the trigger on close. Never the first answer: inline edits and side panels come first.
- **Popover and menu:** Pure White, radius 16px, 8px padding, Overlay Soft, 40px rows in Body. Esc closes it and focus returns to the trigger.
- **Toast:** sonner, Pure White, radius 16px, 1px line border, no shadow, Body ink. Error toasts carry Retry and a close ghost, stay until dismissed (no timer) and announce as role="alert". Success toasts announce as role="status", stay at least 6s and pause while hovered or focused. Alt+T, sonner's hotkey, moves focus into the toasts, and the toaster region's label names it. Bottom right on desktop; bottom center above the bottom nav on phones.
- **Tooltip:** Pure White, radius 12px, Small ink, 280px max width, Overlay Soft (a popover-class layer), 300ms delay on hover, instant on focus. It meets WCAG 1.4.13: Esc dismisses it without moving focus, the pointer can move onto it without closing it, and it stays until hover or focus leaves or Esc is pressed. It carries role="tooltip", and its trigger points to it with aria-describedby. Fit pills and icon rail items use it.

### Feedback states
- **Empty state:** a 56px icon tile in a pastel tint, one Body sentence that teaches ("No pitches yet. Your bio link has a Send a pitch button."), and one action. No illustrations, centered where the list would be.
- **Skeleton:** the exact shape of the final card, blocks in Dove Grey on the card's own surface, with a single soft highlight sweeping across every 1.6s as a translated pseudo-element (transform only); static under reduced motion.
- **Banner:** a Butter Wash band with 20px corners at the top of content and Toffee words, for "AI paused until tomorrow. New items will be analyzed then."

### Icons, avatars and logo
- **Icons:** every UI icon is lucide-react at a 1.5px stroke: 20px by default (nav, tray, row actions, trend arrows), 16px inside pills, chips and dropdowns, 24px in icon tiles. Active nav icons use the filled form (fill currentColor).
- **Avatar:** initials on a tile tint (Apricot Tile, Lavender Tile or Pool Tile) chosen by hashing the name: Small Strong ink at 40px and in 28px table avatars, Caption in 28px stacks (2px Pure White ring, -8px overlap), H1 at 96px on the bio link. The demo creator, Mira Kapoor, uses one licensed stock photo at the same sizes; everyone else gets initials. Lime is never an avatar tint.
- **Logo:** placeholder of two overlapping circles in ink until the mascot logo lands. Never the Starline asterisk or any star mark.
- **Open Graph image (next/og, 1200 by 630) for bio and showcase pages:** the Pewter Shell with its haze, 64px padding; the creator's avatar at 160px; the name in Inter 500 at 64px and the one-line bio at 32px, both in ink (image-only sizes, scaled for a feed thumbnail, and only ink because the haze sits behind); up to three community chips in their tile tints with ink words; the two-circle logo placeholder and wordmark at the bottom left. No purple, no lime, no fit scores.

### Motion
- **Durations:** 150ms hover, press and exits (`--dur-fast`), 200ms tabs, toggles and chips (`--dur-base`), 250ms panel and dialog entrances (`--dur-slow`), 600ms number tickers, 1.6s shimmer loop.
- **Easing:** ease-out-quart (`--ease-out-quart`, cubic-bezier(0.25, 1, 0.5, 1)) for state changes; ease-out-expo (`--ease-out-expo`, cubic-bezier(0.16, 1, 0.3, 1)) for entrances and tickers. The project also defines ease-out-quint (`--ease-out-quint`) for the brand-register landing page; product UI does not use it. No bounce, no elastic, no spring overshoot.
- **What moves:** color, opacity and transform only. Width, height, top, left, margins and background-position never animate. No page-load choreography beyond the stat ticker; content appears with the data.
- **Reduced motion:** tickers render the final value, fades and the shimmer are off, panels appear without translating.

### Screen recipes (reference to screen)
| Reference (docs/design-reference) | Pattern | Fellow Owners screen |
|---|---|---|
| e23ccb, bf1994, f8e7aa (dashboard) | Stat stack under a glass title band, line chart, donut, Top Products, bottom analytics | Today |
| 063e6f (orders) | Tab bar, toolbar with "+" pill, status table, pagination | Inbox |
| 096dc0 (POS) | Count chips in a glass band, product grid, right-side order panel with a tinted summary well and one purple button | Ideas (chips and grid); Promote composer (panel and purple Publish) |
| c7c71f (POS machines) | Pastel cards with icon tile and edit pencil | Communities |
| 299cc1 (customers) | Table with eye and pencil ghost actions | People |
| 3cd1c6, cda9bd (payroll, purchase) | Row menu, status column, pagination | Promote list, community detail |

- **Inbox:** tab bar (All, Collabs, Investment, Ideas, Press, Fan notes, Filtered) then toolbar (search, Sort: Fit or Newest, Status) then table (sender with avatar, type, one-line AI summary, fit pill, status pill, date) then the side panel with the full pitch, fit reason, actions and reply box.
- **Ideas:** count chips per community in their glass band (All active), the Ranked or Board segmented pill, then the idea card grid.
- **People:** a "Rising this fortnight" Paper White card (H2 title, then a row of 48px avatar links, each with the name in Small Strong ink and the top skill in Small ink-muted, each opening that member's side panel), a toolbar with skill search, the members table with an eye action.
- **Promote composer:** left 7 columns, platform tabs (X, Instagram, LinkedIn, YouTube) over an editable draft with its character count; right 5 columns, a Paper White panel like the POS order panel: the post preview in a Pure White frame with a 1px line border (radius 16px), the lavender summary well (Platform, Characters, Short link with Copy, then Clicks so far), full-width purple Publish, then Copy and Open in X as two secondary pills side by side.
- **Bio link:** 96px avatar, name in H1, one-line bio, platform follower chips (glass pills), "Join a community" with pastel cards in two columns (one on phones) carrying member counts and Join, a full-width "Send Mira a pitch" white pill, then "Featured by Mira" projects.
- **Join:** one Pure White card with progress dots (current step a 24 by 8px ink pill, done steps 8px ink dots, upcoming 8px Field Grey dots at 3.3:1) and "Step 2 of 3" in Small ink-muted beside them; the dot group carries the same text as its aria-label. Step 2: intro textarea, then the selectable community tiles. Creator onboarding (4 steps) uses the identical pattern.
- **Community feed:** a header band in the community's tint with name and member count, the tab bar (Ideas, Projects, Discussions), idea cards with Open only, and a floating purple "New post" pill on phones (bottom right, 16px from the edges, above the safe area).
- **Post detail:** title in H1, author and status pill, body at 68ch, Roles needed with Join as secondary pills, Team, signals, comments.

### Named Rules
**The Settled Press Rule.** On hover and press, a color change and a 0.98 press are all that happen. No lift, no glow, no slide. The only sanctioned movement is an overlay entering (the side panel's 24px translate) and the tab underline growing in place; if anything else moves more than 2px on interaction, it is wrong.

**The Reason Travels Rule.** An AI judgment never appears alone: the fit pill carries its reason in a tooltip and the side panel, every "AI pick" chip sits beside a reason line, and every "AI suggested" Join tile carries a one-line reason drawn from the fan's own intro. Fit scores and fit reasons exist only on /dashboard screens.

**The Same Shape Rule.** Skeletons, empty states and errors occupy the exact footprint of the content they replace, so nothing jumps when data arrives.

## 6. Do's and Don'ts

### Do:
- **Do** open every creator screen on the decision: the AI briefing, the top picks, the highest-fit pitches. Full lists come second.
- **Do** float the Pewter Shell (#DADADC, radius 40px, padding 24px) on the Soft Daylight Grey page (#F2F2F3) with the haze pooling across its lower right at reference strength (peak alpha 0.72 to 0.90), never as a faint tint.
- **Do** build navigation chrome from glass pills (white at 45%): sidebar items 52px tall, header tray and tab bar 64px, toolbar, pagination.
- **Do** mark the active sidebar item, the active bottom nav item and the current fan community in lime (#E8FA8B) with weight 600 and aria-current (nav items add a filled icon), and the current page in lime with Small Strong and aria-current.
- **Do** keep exactly one purple (#7C3AED) primary button per screen, or one Promote per card on the creator Ideas grid.
- **Do** limit pastel stat cards to Today, three at most, each one a link to the list it counts.
- **Do** rotate community card tints apricot, lavender, aqua, white in creation order, give every card different live data, and never exceed two columns on Communities.
- **Do** use pure white (#FFFFFF) only as the card-strong surface, as text and icons on purple, ink and Brick Red, and as the 2px rings around the online dot and stacked avatars.
- **Do** use a card only for one object or one dataset (a stat, a chart, a table, a community, an idea), and keep layout chrome on glass or the bare shell.
- **Do** show every status as a tinted pill with dark text: Butter Wash with Toffee for New, Requested and Pending; Ice Wash with Harbor Teal for Shortlisted, Accepted, Replied and Live; Dove Grey with ink for Archived, Filtered, Draft and Unpublished.
- **Do** set data, figures and inactive tabs in ink-soft (#5E5E62), titles, labels and active states in ink (#2D2D30), and step secondary text up to ink-soft on glass, lavender cards, the header pill and the shell's header band.
- **Do** put every full-page table in a Pure White card (radius 28px) with a Dove Grey (#E9E9EB) pill header, 48px rows, 13px cells and 1px Ledger Grey (#D4D4D8) dividers, with the hovered row lifting to Pure White; tables inside Today cards use the compact variant.
- **Do** set every number that can change in tabular figures, and carry a trend's direction in its sign ("+18%", "−4%"), never in color or the arrow alone.
- **Do** set error and destructive words in Brick Red (#DC2626) on Pure White or Paper White only, with the icon and the error border in Signal Red.
- **Do** pair every fit pill with its one-line reason, and keep fit scores off fan pages.
- **Do** give every chart a one-line text summary and a "Show data" table toggle.
- **Do** keep touch targets at 44px or more on fan pages, and make fan pages work from 360px wide inside in-app browsers.
- **Do** use skeletons in the exact shape of the final card, a spinner inside the button for mutations, and the shimmering "AI reviewing" chip for AI work.
- **Do** honor prefers-reduced-motion: tickers show the final value, fades and shimmer are off.
- **Do** write plain, specific, short copy with real demo data (Mira Kapoor, Arjun, Builders, Designers, Investors & Operators, Music & Creators, Fitness Crew, Local Impact).
- **Do** use initials on Apricot, Lavender or Pool tiles for avatars (Mira's one licensed photo is the exception), and two overlapping ink circles as the logo placeholder.

### Don't:
- **Don't** recreate Discord-style noise: no endless channel lists, no unread badges on sidebar items, community cards or tabs. The bell's count badge is the only count badge in the creator shell.
- **Don't** design anything that looks like paid DMs: no prices, tip jars, paywalls or "priority" upsells on the pitch form or inbox rows. Pitches are ranked by fit, never by payment.
- **Don't** ship a one-way link-in-bio page or a Google Form: the bio link always shows communities with member counts and Join, and the pitch form ends on a confirmation that says where the reply will appear.
- **Don't** show low-contrast status text: no light orange or teal words on white (Marigold is 2.0:1, Lagoon Teal 2.2:1). Status is a tinted pill with dark text, every time.
- **Don't** ship placeholder copy: no lorem ipsum, no "Lorem dashboard", no "Name Goes Here", no "Product full name goes here", in any shipped or demo screen.
- **Don't** stage the AI light show: no sparkles outside the AI chip, no glowing gradients, no hype words, and no AI action on fan content without a creator click.
- **Don't** reproduce the dense POS keypad or the Starline asterisk logo from the reference screens.
- **Don't** use ink-muted (#6E6E73) or success-ink (#15803D) on the shell, glass, lavender or the header pill, and never set words in Fog Grey (#9A9AA0), Meadow Green (#16A34A), Signal Red (#EF4444), Marigold, Lagoon Teal or Chart Violet.
- **Don't** set any words but ink directly on the hazed part of the shell.
- **Don't** use lime as a button fill, a content background or a text color.
- **Don't** add shadows to cards, pills, chips, buttons, tables or toasts; only side panels, dialogs and popovers (menus and tooltips included) take Overlay Soft.
- **Don't** put glass on content cards or over scrolling content, and never add backdrop-filter to it.
- **Don't** nest a card inside a card; glass holds only controls and titles, and a card never holds a card.
- **Don't** use border-left or border-right greater than 1px as a colored stripe on cards, rows, callouts or alerts.
- **Don't** use gradient text (background-clip: text over a gradient). Emphasis comes from weight or size.
- **Don't** reach for a modal first: side panels and inline edits come first, dialogs only confirm destructive actions.
- **Don't** animate width, height, top, left, margins or background-position, and never use bounce or elastic easing.
- **Don't** add a second typeface, a display font in labels or buttons, uppercase labels, or pure black (#000) text.
- **Don't** use em dashes or a double hyphen as a dash in UI copy; use commas, colons, periods or parentheses.
