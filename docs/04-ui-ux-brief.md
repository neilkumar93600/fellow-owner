# 04 · UI and UX Design Brief

Status: Active v1.0 · Updated: 2026-10-06  
Design System: **Fellow Prism** — Bespoke Frosted Glassmorphism Architecture.

## 1. Audience and tone

- **Creators** are busy and judge a tool by how fast it gets to the point. They use the dashboard on a laptop.
- **Fans** arrive on a phone from a bio link and decide in seconds whether to join.
- Three adjectives: **calm, luminous, credible.** The interface feels like an airy frosted glass atelier suspended over an ethereal aurora light mesh.

## 2. Design Foundation: Frosted Glassmorphism ("Fellow Prism")

Our interface is built entirely from physical glass optics and fluid light refraction:

| Material Tier | Optics & Physics | Product Application |
|---|---|---|
| **Tier 1: Ultra-Frost Chrome** | `backdrop-filter: blur(20px) saturate(180%)`, specular white border (`rgba(255,255,255,0.7)`), dual inner rim reflections | Floating navigation docks, search capsule, command tray, tab bars, toolbars |
| **Tier 2: Frosted Panels** | `backdrop-filter: blur(24px) saturate(160%)`, 36px-40px radii, ambient drop shadow + specular rim | App workspace shell, fan shell container, onboarding split panels |
| **Tier 3: Crystalline Cards** | `backdrop-filter: blur(14px)`, translucent refraction tints, frosted icon badges, hover specular glow | Stat cards, community tiles, idea cards, top ideas table |
| **Tier 4: Frosted Badges** | `backdrop-filter: blur(10px)`, soft luminous sheen, dark legible text | AI pick chips, category filters, status pills, count chips |

## 3. Color palette & Luminous Materials

All colors are CSS variables in Tailwind v4 `@theme`, with shadcn variables mapped onto them.

| Token | Hex / Value | Role in Frosted Glassmorphism |
|---|---|---|
| `--page` | `#F8FAFC` | Luminous, clean outer ambient canvas |
| `--shell` | `#EBF0F7` | Translucent crystal shell foundation |
| `--blur-1` to `--blur-4` | Indigo `#C7D2FE`, Glacier `#BAE6FD`, Amethyst `#DDD6FE`, Amber `#FEF3C7` | Multi-phase Aurora light mesh creating spectral backlighting |
| `--glass` | `rgba(255, 255, 255, 0.65)` | Base frosted glass surface with blur & specular borders |
| `--card` | `#F9F9FA` | Standard card base |
| `--card-strong` | `#FFFFFF` | Pure white tables, inputs, active overlays |
| `--ink` | `#1E293B` | High-contrast obsidian primary text |
| `--ink-muted` | `#64748B` | Secondary text (clears WCAG AA 5.2:1) |
| `--ink-faint` | `#94A3B8` | Placeholders and inactive glyphs |
| `--line` | `#E2E8F0` | Structural dividers |
| `--lime` | `#CCFBF1` / `#D9F99D` | Luminous frosted crystal active indicator and AI pick badge |
| `--peach` / `--peach-tile` | `#FFF7ED` / `#FED7AA` | Solstice Amber crystalline tint & frosted badge |
| `--lavender` / `--lavender-tile` | `#F5F3FF` / `#EDE9FE` | Nebula Iris crystalline tint & frosted badge |
| `--purple` | `linear-gradient(135deg, #4F46E5, #7C3AED)` | Luminous Aurora Violet primary action with specular rim |
| `--purple-chart` | `#8B5CF6` | Vibrant secondary series and icon accents |
| `--aqua` / `--aqua-tile` | `#F0FDFA` / `#CCFBF1` | Glacier Cyan crystalline tint & frosted badge |
| `--success` / `--success-ink` | `#16A34A` / `#15803D` | Positive trend indicator with AA contrast |
| `--warn-bg` / `--warn-ink` | `#FFFBEB` / `#B45309` | Warning / New status pills |
| `--danger` | `#EF4444` | Notification badges and destructive actions |

- Chart series order: orange, purple-chart, teal. Lime only for the tooltip.
- Fit score pill: 0 to 39 in `--ink-faint`, 40 to 69 in `--warn-ink`, 70 to 100 in `--success-ink`.
- Status is shown as a tinted pill with dark text, not as bare colored text. This is the one deliberate change from the reference, for contrast.

## 4. Typography

Inter via `next/font`; tabular numbers on stats and tables.

| Style | Size / line | Weight | Use |
|-------|-------------|--------|-----|
| Display | 32 / 40 | 500 | "Welcome, Mira 🎉" |
| H1 | 24 / 32 | 500 | Page titles on fan pages |
| H2 | 20 / 28 | 500 | Card titles |
| Stat | 40 / 44 | 600 | Stat card numbers |
| Body | 15 / 22 | 400 | Default |
| Small | 13 / 18 | 400 | Tables, meta |
| Caption | 12 / 16 | 500 | Pills, chart labels |

## 5. Components

| Component | Spec |
|-----------|------|
| App shell | Page padding 24; shell radius 40, padding 24, background `--shell` with three blurred radial layers |
| Sidebar item | Pill, height 52, icon 20 + label 15/500. Inactive `--glass`; active `--lime`, weight 600, filled icon |
| Header | Left: welcome title + muted subtitle. Right: glass pill tray with search, theme, bell with count badge, avatar with online dot |
| Tab bar | Glass pill; text tabs; active `--ink` with 2px underline; inactive `--ink-muted` |
| Toolbar | Glass pill. Left: white outlined pill buttons with "+". Right: white square search (radius 12), white dropdown pill |
| Stat card | Tint variant (peach, lavender, aqua, white), radius 28, padding 24, icon tile 56 (radius 14), number ticker, label, trend row |
| Chart card | White, radius 28; legend dots top right; monotone curves; faint vertical grid; lime tooltip pill |
| Data table | White card radius 28; header row is a grey pill (`#E9E9EB`); rows 48 high, 13px; `--line` dividers; hovered row turns `--card-strong`; ghost icon actions |
| Pagination | Glass pill group; current page lime; next arrow in a white circle |
| Count chips | Cards about 160 x 80, radius 20: muted label + 24/600 count. Active chip is `--ink` with white text |
| Idea card | White, radius 24: community chip, title, summary line, team avatars, signal counts, fit pill (creator only), Open and purple Promote |
| Community card | Pastel tint, radius 28: icon tile, name 24/500, members + trend, digest line, edit pencil |
| Fit pill | Number with a tiny bar; tooltip shows the fit reason |
| AI chip | Lime pill with a Sparkles icon: "AI pick". Variants: "AI reviewing" (shimmer), "Not analyzed" (grey) |
| Side panel | shadcn Sheet, 480 wide, left corners radius 28 |
| Buttons | Primary: `--purple`, white text, pill, height 48. Secondary: white outlined pill. Ghost: 40 x 40 round icon button. Destructive: red text ghost |
| Inputs | White, radius 16, height 44, 1px `--line`, focus ring 2px purple at 40% |
| Toasts | sonner, white card, radius 16 |
| Empty state | Icon tile + one sentence + one action. No illustrations |
| Skeletons | Same shape as the final card |
| Avatars | Initials on a pastel tint picked by hashing the name |

## 6. Layout rules

- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40.
- Breakpoints: 640, 768, 1024, 1280, 1536.
- **Creator:** sidebar 248 fixed; header 88; content is a 12-column grid with 20 gaps. Below 1024 the sidebar becomes an icon rail; below 768 a bottom nav (Today, Inbox, Ideas, More).
- **Today at 1280+** (mirrors reference `01`):
  - Left, 4 columns: "Fanbase overview" glass container holding three stat cards (Members, peach; Ideas this week, lavender; Opportunities waiting, aqua) and a white "This week" card (Joins, Ideas, Pitches as Total / This month / Today).
  - Right, 8 columns: "Your AI briefing" white card on top (headline, 3 to 5 highlights with lime "AI pick" chips, Regenerate, thumbs). Below it two cards side by side: "Inbox mix" donut and "Top ideas" table.
  - Full width bottom: "Fanbase activity" line chart, joins vs ideas over 12 weeks.
- **Fan pages:** max width 720, centered. Shell radius 32 on desktop; edge to edge with 16 padding on phones. Touch targets at least 44.

## 7. Screen notes

| Screen | Hierarchy |
|--------|-----------|
| Bio link | Avatar, name, one-line bio, platform follower chips -> "Join a community": pastel cards in 2 columns (1 on phones) with member counts and Join -> "Send Mira a pitch" white pill -> "Featured by Mira" projects |
| Join | One card with progress dots. Step 2: intro textarea, then community cards as selectable pastel tiles with an "AI suggested" lime chip |
| Community feed | Header in the community tint with member count -> tab bar -> idea cards -> floating purple "New post" on phones |
| Post detail | Title, author, status pill -> body -> Roles needed with Join buttons -> Team -> signals -> comments |
| Today | See layout above. The briefing is the first thing the eye lands on in the right column |
| Inbox | Tab bar -> toolbar (search, sort, status) -> table: sender, type, AI summary, fit pill, status pill, date -> side panel with full pitch, fit reason, actions, reply box |
| Ideas | Count chips per community -> view toggle (Ranked, Board) -> idea cards grid |
| Communities | Toolbar with "Add community +" -> 2-column pastel cards |
| People | "Rising this fortnight" strip of avatars -> toolbar with skill search -> table with eye action |
| Promote composer | Left: platform tabs with editable drafts and character counts. Right panel (like the POS order panel): preview card, short link, clicks, purple Publish, then Copy and Open in X |
| Settings | Tab bar: Profile, Taste profile, Bio link, Import audience |

## 8. Accessibility

- WCAG 2.2 AA. Token choices above already account for contrast (purple button, status pills, trend text).
- Every interactive element reachable by keyboard; visible focus ring; Esc closes panels and dialogs.
- Icon-only buttons have `aria-label`s. Form errors announced through `aria-live`.
- Respect `prefers-reduced-motion`: number tickers render the final value, fades are off.
- Each chart has a one-line text summary below it ("Joins up 18% on last week") and a "Show data" table toggle.

## 9. Interaction states

| State | Treatment |
|-------|-----------|
| Hover | Rows and cards switch to `--card-strong`; buttons darken about 6% |
| Focus | 2px ring, purple at 40%, offset 2 |
| Pressed | Scale 0.98 |
| Disabled | 50% opacity, no pointer |
| Loading | Skeletons on first load; spinner inside the button for mutations; shimmer chip for AI work |
| Error | Inline field errors in `--danger` with an icon; toasts with Retry for failed requests |
| Success | Toast; optimistic updates in lists |
| Selected | Lime for nav and current page; `--ink` fill for chips |

## 10. Assets needed

| Asset | Source |
|-------|--------|
| Logo mark and "Fellow Owners" wordmark | To design. Placeholder: two overlapping circles in `--ink` |
| Icons | lucide-react |
| Community icons | Lucide: Code2 (Builders), PenTool (Designers), LineChart (Investors & Operators), Music (Music & Creators), Dumbbell (Fitness Crew), Leaf (Local Impact) |
| Avatars | Initials on pastel tints; one demo creator photo (licensed stock) |
| Open Graph images | Generated with `next/og` for bio and showcase pages |
| Loom screenshots | Captured after the build |
