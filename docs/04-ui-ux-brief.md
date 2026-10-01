# 04 · UI and UX Design Brief

Status: draft v0.1 for review · Updated: 2026-10-01
Style source: the nine screens in `design-reference/` ("Starline" dashboard set). We copy the visual language, not the brand.

## 1. Audience and tone

- **Creators** are busy and judge a tool by how fast it gets to the point. They use the dashboard on a laptop.
- **Fans** arrive on a phone from a bio link and decide in seconds whether to join.
- Three adjectives: **calm, warm, credible.** The AI should feel like a sharp assistant, not a light show.

## 2. Reference products

| Reference | Borrow | Avoid |
|-----------|--------|-------|
| Starline set, `design-reference/01` to `09` | Grey app shell with a soft gradient blur; pill nav, tab bars, toolbars and pagination; lime active state; pastel stat cards with icon tiles; white table cards with a pill header row; count chips from the POS screen; one purple primary action per screen; Inter; dark grey text instead of black | Status text in light orange or teal that fails contrast; placeholder copy; the dense POS keypad; the Starline asterisk logo |

| Reference file | Pattern | Our screen |
|----------------|---------|------------|
| `01`, `02`, `07` dashboard | Stat stack, line chart, donut, Top Products, bottom analytics | Today |
| `04` orders with tabs | Tab bar, toolbar, status table | Inbox |
| `05` POS | Count chips, product grid, right-side order panel, purple Payment | Ideas (chips + grid), Promote composer (panel + purple Publish) |
| `08` POS machine cards | Pastel cards with icon tile and edit pencil | Communities |
| `06` customers | Table with eye and pencil actions | People |
| `03`, `09` tables | Status text, row menu, pagination | Promote list, community detail |

## 3. Color palette

All colors are CSS variables in Tailwind v4 `@theme`, with shadcn variables mapped onto them.

| Token | Hex | Use |
|-------|-----|-----|
| `--page` | `#F2F2F3` | Outside the shell |
| `--shell` | `#DADADC` | App shell background |
| `--blur-1` / `--blur-2` / `--blur-3` | `#AEB8E6` / `#9FD0D7` / `#D7CCB6` | Radial blurs in the shell's bottom right, 35 to 45% opacity |
| `--glass` | `rgba(255,255,255,0.45)` | Pills, tab bars, toolbars on the shell |
| `--card` | `#F9F9FA` | Default card |
| `--card-strong` | `#FFFFFF` | Tables, inputs, hovered rows |
| `--ink` | `#2D2D30` | Primary text |
| `--ink-muted` | `#6E6E73` | Secondary text (about 5:1 on white) |
| `--ink-faint` | `#9A9AA0` | Placeholders, disabled. Never body text |
| `--line` | `#E5E5E8` | Dividers |
| `--lime` | `#E8FA8B` | Active nav, current page, "AI pick" chip, chart tooltip |
| `--peach` / `--peach-tile` / `--orange` | `#FFF3E3` / `#FFE6C4` / `#F2A93B` | Stat card, icon tile, accent |
| `--lavender` / `--lavender-tile` | `#F1ECFF` / `#E3D9FF` | Stat card, icon tile |
| `--purple` | `#7C3AED` | Primary button background (white text passes AA) |
| `--purple-chart` | `#8B5CF6` | Chart series, icons |
| `--aqua` / `--aqua-tile` / `--teal` | `#E1F7F9` / `#C9F0F4` / `#1FBFD0` | Stat card, icon tile, accent |
| `--success` | `#16A34A` | Trend text at 18px and above |
| `--success-ink` | `#15803D` | Trend text below 18px |
| `--warn-bg` / `--warn-ink` | `#FFF1D6` / `#A45A00` | "New", "Requested" pills |
| `--info-bg` / `--info-ink` | `#DDF5F8` / `#0E7490` | "Shortlisted", "Accepted" pills |
| `--danger` | `#EF4444` | Notification badge, destructive actions |

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
