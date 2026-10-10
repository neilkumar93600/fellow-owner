# Fellow Owners Launch Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An 84 s, 1920 x 1080, 30 fps Remotion launch video for Fellow Owners (hook, problem, solution, demo, outro) with heavy motion graphics in the Clubhouse glassmorphism system.

**Architecture:** A standalone Remotion project in `video/`. One foundation layer (tokens, fonts, demo data, motion helpers, a component kit that mirrors DESIGN.md) feeds eight scene compositions built in parallel, each owning one file. A main `LaunchVideo` composition plays the scenes back to back on a 120 BPM bar grid shared with a script-generated music bed.

**Tech Stack:** Remotion 4.0.533 (`remotion`, `@remotion/cli`, `@remotion/google-fonts`, `@remotion/media`, `@remotion/paths`, `@remotion/noise`, `@remotion/transitions`, `@remotion/layout-utils`), React 19, TypeScript, `lucide-react`, Node 24 (runs `.ts` scripts directly), ffmpeg (QA sheets).

**Spec:** `docs/superpowers/specs/2026-10-06-launch-video-design.md`

## Global Constraints

- 1920 x 1080, 30 fps, 2520 frames, 120 BPM (beat 15 frames, bar 60 frames); scene lengths only from `video/src/timeline.ts`.
- Inter 400/500/600 only, sentence case, no uppercase labels, tabular figures on every number.
- One solid purple #7C3AED button per frame; lime #E8FA8B only for "here" or AI picks, ink on top; Brick Red #DC2626 only for the notification badge; only ink #2D2D30 sets words on the hazed shell; no pure black, no gradient text, no glow, no sparkles outside the AI chip.
- Glass is flat `rgba(255,255,255,0.45)`, no `backdrop-filter`, only on the shell.
- No bounce, elastic or overshoot easing.
- Copy: exactly the copy deck in spec section 4; no em dashes.
- Remotion: `useCurrentFrame()` + `interpolate()` with clamps; no CSS transitions/animations; `premountFor={fps}` on timed components; `staticFile()` for assets; `<Img>` for images; no `Math.random()`, `Date.now()`, `new Date()`.
- Key text at least 140 px from left/right, 100 px from top/bottom; every sentence on screen at least 45 frames.
- Studio port 3100. Never stop or reuse port 3000 (another project).
- No final MP4 export unless the user asks; verification uses sampled stills (`--scale=0.5 --concurrency=2`).
- No git commits unless the user asks (harness rule); work stays in the working tree.

## Review Focus

1. Inter fails to load in a frame and a fallback font renders: every frame must show Inter. Test in Task 1 (Kit still check of letterforms) and Task 12.
2. Non-deterministic pixels (random, clocks, CSS animation) make frames differ between renders: the same frame must render byte-identical twice. Test in Task 4 and Task 12.
3. A match cut jumps (H1, H2, H3, H5): the last frame of a scene and the first frame of the next must be near-identical (SSIM at least 0.97). Test in Task 12.
4. The 🎉 in "Welcome, Mira 🎉" renders as tofu in headless Chrome: it must render as an emoji. Test in Task 1 (Kit) and Task 8 (Triage frame 60).
5. Loop footage frames stall or go blank during the half-speed crossfade: every Solution frame from 180 to 419 must show footage. Test in Task 6.

---

### Task 0: Scaffold, assets, timing, Studio (orchestrator, inline)

**Files:**
- Create: `video/` (create-video blank template), `video/src/timeline.ts`, `video/scripts/check.ts`
- Create: `video/public/loop/frame_0001.webp` … `frame_0120.webp` (copy of `web/public/frames/loop/desktop/`), `video/public/images/mira.jpg` (copy of `web/public/demo/mira.jpg`)
- Modify: `biome.json` (exclude `video`)

**Interfaces:**
- Produces: `FPS, WIDTH, HEIGHT, BPM, BEAT, BAR, SCENE_BARS, SceneId, SCENE_ORDER, DURATION, START, TOTAL` from `video/src/timeline.ts`.

- [ ] **Step 1: Scaffold and install**

```bash
cd e:/idea/fellow-owner
npx create-video@latest --yes --blank --no-tailwind video
cd video && npm i
npx remotion add @remotion/google-fonts @remotion/media @remotion/paths @remotion/noise @remotion/transitions @remotion/layout-utils
npm i lucide-react
```

- [ ] **Step 2: Write the timing source of truth**

```ts
// video/src/timeline.ts
// Single source of truth for timing. Read by src/Root.tsx, src/LaunchVideo.tsx and scripts/make-music.ts,
// so scene cuts and the music's bar lines always agree. Plain TS (no enums) so Node can run it directly.
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const BPM = 120;
export const BEAT = (FPS * 60) / BPM; // 15 frames
export const BAR = BEAT * 4; // 60 frames = 2 s

export const SCENE_BARS = {
  Hook: 4,
  Problem: 6,
  Solution: 8,
  FanJoin: 5,
  Triage: 4,
  Today: 4,
  Build: 7,
  Outro: 4,
} as const;

export type SceneId = keyof typeof SCENE_BARS;
export const SCENE_ORDER = Object.keys(SCENE_BARS) as SceneId[];

export const DURATION = Object.fromEntries(
  SCENE_ORDER.map((id) => [id, SCENE_BARS[id] * BAR]),
) as Record<SceneId, number>;

export const START = (() => {
  let at = 0;
  const out = {} as Record<SceneId, number>;
  for (const id of SCENE_ORDER) {
    out[id] = at;
    at += DURATION[id];
  }
  return out;
})();

export const TOTAL = SCENE_ORDER.reduce((sum, id) => sum + DURATION[id], 0);
```

- [ ] **Step 3: Write the one runnable check**

```ts
// video/scripts/check.ts. Run: node scripts/check.ts
import assert from 'node:assert/strict';
import { BAR, BEAT, DURATION, FPS, START, TOTAL } from '../src/timeline.ts';

assert.equal(BEAT, 15);
assert.equal(BAR, 60);
assert.equal(TOTAL, 2520, 'video must be 84 s at 30 fps');
assert.equal(TOTAL / FPS, 84);
assert.deepEqual(START, {
  Hook: 0, Problem: 240, Solution: 600, FanJoin: 1080,
  Triage: 1380, Today: 1620, Build: 1860, Outro: 2280,
});
for (const [id, d] of Object.entries(DURATION)) assert.equal(d % BAR, 0, `${id} must be whole bars`);
console.log('timeline ok');
```

Run: `cd video && node scripts/check.ts` → Expected: `timeline ok`

- [ ] **Step 4: Assets and lint scope**

```bash
mkdir -p video/public/loop video/public/images
cp web/public/frames/loop/desktop/*.webp video/public/loop/
cp web/public/demo/mira.jpg video/public/images/
ls video/public/loop | wc -l   # Expected: 120
```

Add `"!video"` to `files.includes` in the root `biome.json`.

- [ ] **Step 5: Studio**

Run in the background: `cd video && npx remotion studio --port=3100`. Expected: Studio at http://localhost:3100.

---

### Task 1: Foundation kit (agent: opus, high)

**Files:**
- Create: `video/src/theme.ts`, `video/src/fonts.ts`, `video/src/data.ts`
- Create: `video/src/motion/index.ts` and component files under `video/src/motion/`
- Create: `video/src/components/*.tsx`, `video/src/kit/Kit.tsx`
- Create (placeholders, final export names): `video/src/scenes/{Hook,Problem,Solution,FanJoin,Triage,Today,Build,Outro}.tsx`
- Create: `video/src/LaunchVideo.tsx` (skeleton), Modify: `video/src/Root.tsx`

**Interfaces:**
- Consumes: `video/src/timeline.ts`.
- Produces (exact names; scenes import these):

```ts
// theme.ts
export const C: { page; shell; glass; card; cardStrong; tableHead; ink; inkSoft; inkMuted; inkFaint; line; lineRow;
  lineStrong; lineField; lime; limeTint; peach; peachTile; orange; lavender; lavenderTile; purple; purpleChart;
  aqua; aquaTile; teal; success; successInk; warnBg; warnInk; infoBg; infoInk; danger; dangerDeep;
  blur1; blur2; blur3 }                                    // hex strings from DESIGN.md frontmatter; glass 'rgba(255,255,255,0.45)'
export const R: { search: 12; tile: 14; field: 16; chip: 20; idea: 24; card: 28; fanShell: 32; shell: 40; pill: 9999 }
export const EASE: { expo; quart; quint; inOut; in }       // Easing.bezier(...) per spec section 3
export const SHADOW: { overlay: string; device: string }
export const HAZE: { shell: string; page: string }         // CSS background strings
export const TYPE: Record<'tagline'|'statement'|'heroNumber'|'caption'|'support'|'display'|'h1'|'h2'|'stat'|'count'
  |'trend'|'body'|'label'|'labelStrong'|'small'|'smallStrong'|'caption12', React.CSSProperties>
export const TNUM: React.CSSProperties                     // fontVariantNumeric 'tabular-nums' + fontFeatureSettings "'tnum' 1"
// fonts.ts
export const FONT: string                                  // Inter family from @remotion/google-fonts + fallbacks
// data.ts (copied and adapted from web/components/landing/{demo,problem,how,features,loop,creators,fans}-data.ts)
export const creator, fan, communities, messages, PILE, ROW_ORDER, PICK_ORDER, briefing, stats, promoteDraft,
  DRAFT, showcase, TEAM, CLICKS_BY_DAY, CLICKS_TOTAL, loopStages, LOOP_CARD_FACE, PALETTES, FAN_INTRO, JOIN_TILES,
  avatarTint(name: string): string, initials(name: string): string
// motion/index.ts
export const clamp: { extrapolateLeft: 'clamp'; extrapolateRight: 'clamp' }
export function ramp(frame: number, start: number, duration: number, easing?: (t: number) => number): number // 0..1
export function mix(a: number, b: number, t: number): number
export function LineReveal(p: { lines: string[]; start: number; stagger?: number; style?: React.CSSProperties;
  lineStyle?: React.CSSProperties; exitAt?: number }): JSX.Element               // mask reveal, optional exit
export function Odometer(p: { value: number; start: number; duration: number; from?: number; style?: React.CSSProperties }): JSX.Element
export function Ticker(p: { from: number; to: number; start: number; duration: number; format?: (n: number) => string;
  style?: React.CSSProperties }): JSX.Element
export function Typewriter(p: { text: string; start: number; charsPerFrame?: number; caret?: boolean; style?: React.CSSProperties }): JSX.Element
export function DrawPath(p: { d: string; start: number; duration: number; stroke: string; strokeWidth: number;
  viewBox: string; width: number; height: number }): JSX.Element
export function Camera(p: { children: React.ReactNode; perspective?: number; scale?: number; x?: number; y?: number;
  rotateX?: number; rotateY?: number; style?: React.CSSProperties }): JSX.Element
export function WhipBlur(p: { amount: number; children: React.ReactNode }): JSX.Element   // horizontal blur
export function Grain(p: { opacity?: number }): JSX.Element
// components (one file per group; re-exported from components/index.ts)
PageBackdrop({ haze?: number }), ShellStage({ children?, hazeDrift?: number }), Haze({ variant: 'shell'|'page' }),
LogoMark({ size?: number }), Wordmark({ size?: number }), LogoLockup({ size?: number; reveal?: number }),
GlassPill, WhitePill, Card({ tint: 'paper'|'white'|'peach'|'lavender'|'aqua'|'lime'; radius? }), IconTile,
StatCard({ tint; icon; value; label; trend; progress }), AiChip({ variant: 'pick'|'reviewing'|'suggested'|'unanalyzed'; label? }),
FitPill({ score; fill }), StatusPill({ tone: 'warm'|'cool'|'neutral'; children }), Avatar({ name; src?; size?; ring? }),
AvatarStack({ names; size?; count? }), PrimaryButton({ children; press?; width? }), SecondaryButton({ children; press? }),
CommunityChip({ community }), CommunityCard({ community; join?; selected?; suggested?; reason? }), Badge({ count }),
DashboardShell({ active: 'today'|'inbox'|'ideas'|'communities'|'people'|'promote'; children; width?: 1440; height?: 810 }),
TabBar({ tabs; active }), Toolbar, TableCard, TableHeaderRow, TableRow, SidePanel,
PhoneFrame({ url; title; children }), BrowserFrame({ url; width; height; children }),
Cursor({ x; y; press? }), TapRipple({ x; y; progress }),
SphereCanvas({ spheres: Sphere3D[]; width; height; focal?: number; focusZ?: number; dof?: number }),
makeFollowers(count: number, seed: string): Follower[], DMBubble({ message; width? }),
ChapterTag({ n; label; surface: 'page'|'shell' }), MiraChip({ badge?: number }), UrlPill({ text; caret?: boolean })
type Sphere3D = { x: number; y: number; z: number; r: number; color: string; alpha?: number }
type Follower = { color: string; cluster: number; ux: number; uy: number; uz: number; size: number; seed: number }
```

- [ ] **Step 1:** Read `DESIGN.md` (whole file), the 9 images in `docs/design-reference/`, `web/public/frames/loop/desktop/frame_0010.webp`, `web/components/landing/hero-field.tsx` (clay sphere lighting and palettes), and the landing data files. Read the Remotion skill references listed in the spec.
- [ ] **Step 2:** Write `theme.ts`, `fonts.ts`, `data.ts` with the exact names above.
- [ ] **Step 3:** Write `motion/` helpers and components.
- [ ] **Step 4:** Write `components/` to the DESIGN.md specs at product scale (1x) except `MiraChip`, `UrlPill`, `ChapterTag` (video scale: MiraChip white pill 96 px tall with 72 px photo, name 30/600, "740K followers" 22/500 ink-soft, Brick Red badge 30 px on the photo's top right; UrlPill 720 x 88 glass, text 40/500 ink; ChapterTag 56 px pill, number in a 36 px Dove Grey circle, label 24/500 ink). `SphereCanvas` draws pre-rendered matte clay sprites (lit as in hero-field.tsx) on one canvas, depth sorted, with blur levels quantized for depth of field.
- [ ] **Step 5:** Write the eight placeholder scenes (ShellStage + scene name + frame number, final export names) and `LaunchVideo.tsx`:

```tsx
<Series>
  <Series.Sequence name="Hook" durationInFrames={DURATION.Hook} premountFor={fps}><Hook /></Series.Sequence>
  {/* … one Series.Sequence per scene in SCENE_ORDER, each its own JSX node */}
</Series>
```

- [ ] **Step 6:** Register in `Root.tsx`: `LaunchVideo` (TOTAL frames), `<Folder name="Scenes">` with one `<Composition>` per scene (`durationInFrames={DURATION.<id>}`), `<Folder name="Kit">` with `Kit` (150 frames). Each a separate JSX node.
- [ ] **Step 7:** `Kit.tsx`: one frame showing every component (incl. DashboardShell with "Welcome, Mira 🎉", a SphereCanvas sample, MiraChip, UrlPill) on PageBackdrop and ShellStage halves.
- [ ] **Step 8: Verify**

```bash
cd video
npx tsc --noEmit
npx eslint src --ext .ts,.tsx
node scripts/check.ts
npx remotion render Kit out/kit --frames=0,75 --image-format=jpeg --scale=0.5 --concurrency=2
npx remotion render LaunchVideo out/skeleton --frames=0,240,600,1080,1380,1620,1860,2280 --image-format=jpeg --scale=0.25 --concurrency=2
```

Expected: no type or lint errors; Kit stills show Inter letterforms (double-storey a, flat-topped t), the 🎉 as an emoji, glass pills on the shell, lime only on the active nav, one purple button; skeleton stills show each placeholder name.

---

### Task 2: Music and SFX (agent: sonnet, high; runs alongside Task 1)

**Files:**
- Create: `video/scripts/make-music.ts`, `video/public/audio/music.wav`, `video/public/sfx/{whoosh,whip,switch,mouse-click,ding,page-turn,shutter-modern}.wav`, `video/src/audio/sfx.ts`
- Modify: `video/scripts/check.ts` (append audio assertions)

**Interfaces:**
- Consumes: `BPM, BAR, FPS, TOTAL, START, DURATION` from `../src/timeline.ts`.
- Produces: `SFX` map in `src/audio/sfx.ts`: `export const SFX = { whoosh: staticFile('sfx/whoosh.wav'), … } as const;` and `public/audio/music.wav` (84 s or longer).

- [ ] **Step 1:** Download the seven SFX from `https://remotion.media/<name>.wav` into `public/sfx/`.
- [ ] **Step 2:** Write `make-music.ts` (pure TypeScript, Node built-ins only): synth voices (soft kick, clap, hats, sub bass, detuned pads with a one-pole low-pass, Karplus-Strong pluck, noise riser, impact), a Schroeder reverb, the arrangement in spec section 7 keyed to `START` and `BAR`, peak normalisation to -1 dBFS, 44.1 kHz 16-bit stereo WAV writer.
- [ ] **Step 3:** Append to `check.ts`:

```ts
import { existsSync, readFileSync } from 'node:fs';
const wav = readFileSync(new URL('../public/audio/music.wav', import.meta.url));
assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
const channels = wav.readUInt16LE(22);
const rate = wav.readUInt32LE(24);
const bits = wav.readUInt16LE(34);
const dataBytes = wav.length - 44;
assert.deepEqual([channels, rate, bits], [2, 44100, 16]);
assert.ok(dataBytes / (rate * channels * 2) >= TOTAL / FPS, 'music must cover the whole video');
for (const n of ['whoosh', 'whip', 'switch', 'mouse-click', 'ding', 'page-turn', 'shutter-modern'])
  assert.ok(existsSync(new URL(`../public/sfx/${n}.wav`, import.meta.url)), `missing sfx ${n}`);
console.log('audio ok');
```

- [ ] **Step 4:** Run `node scripts/make-music.ts && node scripts/check.ts` → Expected: `timeline ok`, `audio ok`; the script prints peak dBFS ≤ -1.0 and RMS per section.

---

### Task 3: Kit audit against DESIGN.md (agent: sonnet, high; after Task 1)

**Files:** Modify: `video/src/theme.ts`, `video/src/components/*.tsx` only where a rule is broken.

- [ ] **Step 1:** Render `Kit` frames 0 and 75 at scale 1. Compare each component with DESIGN.md (tokens, radii, type roles, glass rule, lime rule, one purple, shadows, Dark Words Rule) and the reference images.
- [ ] **Step 2:** Fix every violation in place; keep exported names and props unchanged.
- [ ] **Step 3:** Re-render, `npx tsc --noEmit`, and report a table: rule, component, before, after.

---

### Tasks 4 to 11: Scenes (one agent each, in parallel after Task 3)

Each scene task has the same shape. Storyboard, copy and handoffs are in the spec (sections 4, 5, 6) and are binding.

**Files (per scene `<S>`):** Modify `video/src/scenes/<S>.tsx`; Create optional helpers in `video/src/scenes/<s>/`. Never edit any other file.

**Interfaces:** Consumes the Task 1 exports. Produces `export const <S>: React.FC` with no required props (registered by Task 1).

- [ ] **Step 1:** Read the spec, DESIGN.md sections 2 to 5, the kit source (`src/components`, `src/motion`, `src/theme.ts`, `src/data.ts`), and the Remotion skill references.
- [ ] **Step 2:** Build the scene to the storyboard, frame ranges relative to the scene start, beats on multiples of 15.
- [ ] **Step 3:** Honour the scene's handoff contract exactly (shared component, position, scale).
- [ ] **Step 4: Verify**

```bash
cd video
npx tsc --noEmit 2>&1 | grep "src/scenes/<S>" ; true      # Expected: no lines (other scenes may be mid-edit)
npx remotion render <S> out/<s> --frames=<list> --image-format=jpeg --scale=0.5 --concurrency=2
```

View every rendered frame. Expected: the storyboard state at each listed frame, copy exactly as the deck, key text inside the safe area, no element clipped by accident.

| Task | Scene | Model / effort | Frames to render | Extra test |
|---|---|---|---|---|
| 4 | Hook | opus / xhigh | 0, 15, 45, 75, 100, 130, 170, 210, 239 | Render frame 60 twice to two folders; `certutil -hashfile` (or `sha1sum`) on both: identical |
| 5 | Problem | opus / high | 0, 30, 75, 119, 150, 200, 240, 300, 345, 359 | Frame 0 shows the MiraChip at (960,540) scale 1.4 badge 3 |
| 6 | Solution | fable / high | 0, 30, 90, 140, 180, 181, 240, 300, 330, 400, 419, 450, 479 | Frames 180 to 419: footage visible in every rendered frame, including 181 and 419 |
| 7 | FanJoin | sonnet / high | 0, 20, 60, 110, 150, 200, 230, 260, 290, 299 | Frame 0 equals the H3 contract |
| 8 | Triage | opus / high | 0, 9, 40, 60, 90, 120, 160, 190, 225, 239 | Frame 60: 🎉 renders as emoji |
| 9 | Today | sonnet / high | 0, 20, 50, 80, 120, 160, 200, 230, 239 | Frame 0 equals Triage frame 239 (H5) |
| 10 | Build | sonnet / high | 0, 11, 60, 100, 150, 220, 275, 320, 380, 419 | Click counter ends at 1,284 |
| 11 | Outro | sonnet / medium | 0, 30, 60, 100, 140, 200, 239 | Exactly one purple button |

---

### Task 12: Assembly, audio mix, continuity (agent: opus, high; after Tasks 2 and 4 to 11)

**Files:** Modify: `video/src/LaunchVideo.tsx`; Create: `video/src/audio/Soundtrack.tsx`.

- [ ] **Step 1:** Keep the `Series` of scenes (each its own `Series.Sequence` node with `premountFor={fps}`); add `<Audio>` music (volume ramps in over 10 frames, out over the last 30) and SFX cues as separate named `<Audio>` nodes with `from` on the frames where taps, presses, toggles, whips and success moments happen (read the scene files to find them).
- [ ] **Step 2:** Continuity test for every cut:

```bash
cd video
npx remotion render LaunchVideo out/cuts --frames=239,240,599,600,1079,1080,1379,1380,1619,1620,1859,1860,2279,2280 --image-format=png --scale=0.5 --concurrency=2
ffmpeg -hide_banner -i out/cuts/element-239.png -i out/cuts/element-240.png -lavfi ssim -f null - 2>&1 | grep SSIM
```

Expected: SSIM All ≥ 0.97 for 239/240, 599/600, 1079/1080, 1619/1620. Whip (1379/1380), zoom-through (1859/1860) and clear stage (2279/2280) are checked by eye. Fix seams in the scene files when a pair fails (coordinate the smallest change).
- [ ] **Step 3:** Determinism: render frame 1500 twice; hashes equal. `grep -rnE "Math\.random|Date\.now|new Date\(|transition:|animation:" src` → no matches.
- [ ] **Step 4:** `npx tsc --noEmit`, `npx eslint src --ext .ts,.tsx`, `node scripts/check.ts` → clean.

---

### Task 13: QA contact sheets (agent: haiku, low; after Task 12, again after Task 15)

- [ ] **Step 1:**

```bash
cd video
npx remotion render LaunchVideo out/qa --frames=0-2519 --every-nth-frame=15 --image-format=jpeg --scale=0.25 --concurrency=4
```

If `--every-nth-frame` is refused for image sequences, pass an explicit comma list of every 15th frame instead.
- [ ] **Step 2:** Tile with ffmpeg, one sheet per scene: `ffmpeg -pattern_type glob -i "out/qa/*.jpeg" -vf "tile=6x4" out/qa/sheet-%02d.jpg` (or the per-scene file lists). Report the sheet paths and which frames each holds.

---

### Task 14: Reviews (four agents in parallel, after Task 13)

Each returns findings: `{ file, frame, severity: 'blocker'|'major'|'minor', rule, evidence, fix }`.

| Review | Model / effort | Lens |
|---|---|---|
| Brand | sonnet / high | DESIGN.md rule by rule against sheets, stills and code |
| Motion and direction | fable / high | pacing, motion density, readability holds, safe areas, continuity, "heavy but calm" |
| Technical | sonnet / medium | determinism, clamps, premount, staticFile, fonts, render cost, Remotion rules |
| Copy | haiku / low | every on-screen string vs the copy deck; em dashes; data consistency |

---

### Task 15: Fixes (agents per file group: sonnet / medium, opus / medium for motion fixes)

- [ ] **Step 1:** Group blocker and major findings by file; one fixer per group.
- [ ] **Step 2:** Each fixer re-renders the frames named in its findings and confirms the fix.
- [ ] **Step 3:** Re-run Task 12 Steps 2 to 4 and Task 13.

---

### Task 16: Final verification (orchestrator)

- [ ] `node scripts/check.ts`, `npx tsc --noEmit`, `npx eslint src --ext .ts,.tsx` clean.
- [ ] View the final contact sheets; spot-check stills at the eight scene midpoints.
- [ ] Studio at http://localhost:3100/LaunchVideo plays with no runtime errors; each scene composition opens on its own.
- [ ] Report to the user: what was built, what was verified, what is a temp asset (music), how to render (`npx remotion render LaunchVideo out/fellow-owners-launch.mp4`).
