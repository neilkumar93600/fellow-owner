import React from 'react';
import {AbsoluteFill, interpolate, interpolateColors, useCurrentFrame} from 'remotion';
import {ChapterTag, Cursor, DASHBOARD, DashboardShell, PageBackdrop} from '../components';
import {messages, ROW_ORDER, SORTED_INBOX, SPAM_IDS} from '../data';
import {FONT} from '../fonts';
import {Camera, clamp, drift, LineReveal, mix, ramp} from '../motion';
import {C, EASE, SHADOW} from '../theme';
import type {Cue} from '../timeline';
import {START} from '../timeline';
import type {TriageRow} from './triage/inbox';
import {TriageScreen} from './triage/inbox';
import {ArjunPanel} from './triage/panel';

export const CUES: Cue[] = [
  {frame: 0, sfx: 'whoosh', volume: 0.35},
  {frame: 20, sfx: 'whoosh', volume: 0.2},
  {frame: 100, sfx: 'switch', volume: 0.3},
  {frame: 128, sfx: 'click', volume: 0.3},
  {frame: 132, sfx: 'whoosh', volume: 0.3},
  {frame: 174, sfx: 'click', volume: 0.3},
  {frame: 176, sfx: 'page', volume: 0.3},
  {frame: 212, sfx: 'whoosh', volume: 0.2},
];

const linear = (t: number) => t;

// ---- Camera: the 1440 x 810 dashboard's centre on screen (cx, cy), its scale and tilt. ----

type Pose = {cx: number; cy: number; s: number; rx: number; ry: number};

const lerpPose = (a: Pose, b: Pose, t: number): Pose => ({
  cx: mix(a.cx, b.cx, t),
  cy: mix(a.cy, b.cy, t),
  s: mix(a.s, b.s, t),
  rx: mix(a.rx, b.rx, t),
  ry: mix(a.ry, b.ry, t),
});

/** Pose that puts dashboard point (px, py) at screen point (x, y) at scale s. */
const anchored = (px: number, py: number, x: number, y: number, s: number, rx: number, ry: number): Pose => ({
  cx: x - s * (px - 720),
  cy: y - s * (py - 405),
  s,
  rx,
  ry,
});

const DROPDOWN = {x: 1330, y: 254}; // "Sort: Fit" in dashboard coordinates
const ARJUN_ROW = {x: 640, y: 402}; // sorted slot 0
const CURSOR_ENTRY = {x: 1620, y: 980}; // off the right edge of the frame

const FULL_FRAME: Pose = {cx: 960, cy: 540, s: 1920 / 1440, rx: 0, ry: 0}; // H4: the pewter fill
const START_POSE: Pose = {cx: 1250, cy: 560, s: 0.8 * 0.7, rx: 18, ry: -22};
const SETTLED: Pose = {cx: 1250, cy: 560, s: 0.8, rx: 4, ry: -8};
const HOLD: Pose = {...SETTLED, s: 0.815}; // slow push while the rows land
// Lean toward the toolbar: the right side turns closer (rotateY -12) so the dashboard's left edge stays clear of the text.
const TOOLBAR: Pose = {cx: 1290, cy: 575, s: 0.84, rx: 5, ry: -12};
const PANEL: Pose = anchored(1200, 175, 1300, 500, 1.9, 2, -3); // the panel's text block, reason line at 13 x 1.9 = 25 px
const FINAL: Pose = {cx: 960, cy: 540, s: 1680 / 1440, rx: 0, ry: 0}; // H5

function cameraAt(f: number): Pose {
  let p = lerpPose(START_POSE, SETTLED, ramp(f, 0, 60, EASE.expo));
  p = lerpPose(p, HOLD, ramp(f, 60, 58, linear));
  p = lerpPose(p, TOOLBAR, ramp(f, 118, 14, EASE.inOut));
  p = lerpPose(p, PANEL, ramp(f, 175, 25, EASE.inOut));
  return lerpPose(p, FINAL, ramp(f, 212, 27, EASE.inOut));
}

// ---- Rows: ROW_ORDER with spam m4 at slot 2 and m9 at slot 6. ----

const ARRIVALS = [...ROW_ORDER.slice(0, 2), 'm4', ...ROW_ORDER.slice(2, 5), 'm9', ...ROW_ORDER.slice(5)];
const SORTED_IDS = SORTED_INBOX.map((m) => m.id);
const byId = (id: string) => messages.find((m) => m.id === id)!;

function rowsAt(f: number): TriageRow[] {
  const close = ramp(f, 112, 14, EASE.quart);
  return ARRIVALS.map((id, a) => {
    const message = byId(id);
    const arrive = 20 + 4 * a;
    const entry = {
      opacity: interpolate(f, [arrive, arrive + 6], [0, 1], clamp),
      open: ramp(f, arrive + 3, 13, EASE.expo),
      fit: ramp(f, arrive + 16, 12, EASE.quart),
    };
    const enterX = mix(-40, 0, ramp(f, arrive, 14, EASE.expo));
    if (SPAM_IDS.includes(id)) {
      // New → Filtered at 100, then pushed out of the card's right edge.
      return {
        message: {...message, status: 'new'},
        slot: a,
        ...entry,
        x: enterX + 1140 * ramp(f, 105, 12, EASE.in),
        lift: 0,
        filtered: ramp(f, 100, 8, EASE.quart),
        selected: false,
      };
    }
    const current = ROW_ORDER.indexOf(id);
    const sorted = SORTED_IDS.indexOf(id);
    const sort = ramp(f, 132 + 2 * current, 15, EASE.inOut);
    return {
      message,
      slot: mix(mix(a, current, close), sorted, sort),
      ...entry,
      x: enterX,
      lift: current !== sorted && sort > 0 && sort < 1 ? Math.sin(Math.PI * sort) : 0,
      selected: id === 'm1' && f >= 174 && f < 216,
    };
  });
}

// ---- Left column ----

const STATEMENT: React.CSSProperties = {fontFamily: FONT, fontSize: 72, lineHeight: 1.05, fontWeight: 500, letterSpacing: '-0.03em'};
const STATEMENTS: {lines: string[]; at: number; dimAt?: number; top: number; exitAt: number}[] = [
  {lines: ['Every pitch,', 'summarized.'], at: 15, dimAt: 100, top: 230, exitAt: 175},
  {lines: ['Spam,', 'filtered out.'], at: 100, dimAt: 135, top: 417, exitAt: 177},
  {lines: ['Sorted by fit,', 'with the reason.'], at: 135, top: 604, exitAt: 179},
];

/** Pushes a left-column block out past the left edge (ease-in, 9 frames). */
const pushOut = (f: number, at: number) => -900 * ramp(f, at, 9, EASE.in);

const LeftColumn: React.FC<{f: number}> = ({f}) => (
  <AbsoluteFill>
    <div style={{position: 'absolute', left: 140, top: 130, overflow: 'hidden', translate: `${pushOut(f, 175)}px 0`}}>
      <div style={{translate: `0 ${110 * (1 - ramp(f, 6, 14, EASE.expo))}%`}}>
        <ChapterTag n="02" label="Your AI briefs you" surface="page" />
      </div>
    </div>
    {STATEMENTS.map((s) => (
      <LineReveal
        key={s.at}
        lines={s.lines}
        start={s.at}
        duration={16}
        style={{
          ...STATEMENT,
          position: 'absolute',
          left: 140,
          top: s.top,
          color: s.dimAt === undefined ? C.ink : interpolateColors(f, [s.dimAt, s.dimAt + 10], [C.ink, C.inkSoft]),
          translate: `${pushOut(f, s.exitAt)}px 0`,
        }}
      />
    ))}
  </AbsoluteFill>
);

// ---- Pointer (dashboard coordinates, so it scales with the camera) ----

const click = (f: number, at: number) => interpolate(f, [at - 3, at, at + 4], [0, 1, 0], clamp);

const Pointer: React.FC<{f: number}> = ({f}) => {
  if (f < 112 || f >= 190) return null;
  const toDropdown = ramp(f, 114, 13, EASE.inOut);
  const toArjun = ramp(f, 158, 14, EASE.inOut);
  const x = mix(mix(CURSOR_ENTRY.x, DROPDOWN.x, toDropdown), ARJUN_ROW.x, toArjun);
  const y = mix(mix(CURSOR_ENTRY.y, DROPDOWN.y, toDropdown), ARJUN_ROW.y, toArjun);
  return (
    <div style={{position: 'absolute', inset: 0, transformOrigin: `${x}px ${y}px`, scale: `${1 - ramp(f, 180, 10, EASE.in)}`}}>
      <Cursor x={x} y={y} press={click(f, 128) + click(f, 174)} />
    </div>
  );
};

export const Triage: React.FC = () => {
  const f = useCurrentFrame();
  const flood = ramp(f, 0, 14, EASE.inOut); // full-frame pewter → shell
  const settle = ramp(f, 205, 25, linear); // drift and depth shadow go to zero for the flat H5 frame
  const cam = cameraAt(f);
  const wobble = flood * (1 - settle);
  const pose = lerpPose(FULL_FRAME, {...cam, rx: cam.rx + drift('triage-rx', f, 0.015, 0.4) * wobble, ry: cam.ry + drift('triage-ry', f, 0.015, 0.4) * wobble}, flood);
  const radius = 40 * flood;
  const shadow = flood * (1 - settle);
  const panelX = 480 * (1 - ramp(f, 176, 14, EASE.expo)) + 480 * ramp(f, 210, 12, EASE.in);
  const filteredCount = Math.round(interpolate(f, [106, 124], [0, 4], clamp));

  return (
    <AbsoluteFill>
      <PageBackdrop frameOffset={START.Triage} />
      <Camera x={pose.cx - 960} y={pose.cy - 540} scale={pose.s} rotateX={pose.rx} rotateY={pose.ry} origin="960px 540px">
        <div style={{position: 'absolute', left: 240, top: 135, width: 1440, height: 810}}>
          {/* Layers mount only while visible: an idle extra layer changes how Chrome composites the shell, and H5 must match the plain kit render. */}
          {shadow > 0 ? <div style={{position: 'absolute', inset: 0, borderRadius: radius, boxShadow: SHADOW.device, opacity: shadow}} /> : null}
          <DashboardShell active="inbox" style={{borderRadius: radius}}>
            <TriageScreen rows={rowsAt(f)} filteredCount={filteredCount} />
            {panelX < 480 ? <ArjunPanel x={panelX} /> : null}
            {flood < 1 ? <div style={{position: 'absolute', left: -DASHBOARD.content.x, top: -DASHBOARD.content.y, width: 1440, height: 810, backgroundColor: C.shell, opacity: 1 - flood}} /> : null}
          </DashboardShell>
          <Pointer f={f} />
        </div>
      </Camera>
      <LeftColumn f={f} />
    </AbsoluteFill>
  );
};
