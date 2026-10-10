import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Cursor, DashboardShell, InboxScreen, INBOX_FINAL, PageBackdrop, ShellStage, WhitePill} from '../components';
import {FONT} from '../fonts';
import {Camera, clamp, drift, LineReveal, mix, ramp} from '../motion';
import {C, EASE, HAZE, TYPE} from '../theme';
import type {Cue} from '../timeline';
import {START} from '../timeline';
import {BEATS, BriefingRow, ROW, rowCenterY, TodayScreen} from './today/screen';

export const CUES: Cue[] = [
  {frame: 8, sfx: 'click', volume: 0.3},
  {frame: 10, sfx: 'switch', volume: 0.2},
  {frame: 24, sfx: 'whoosh', volume: 0.2},
  {frame: 105, sfx: 'switch', volume: 0.15},
  {frame: 120, sfx: 'switch', volume: 0.15},
  {frame: 135, sfx: 'switch', volume: 0.15},
  {frame: 176, sfx: 'shutter', volume: 0.25},
  {frame: 222, sfx: 'whoosh', volume: 0.35},
];

const linear = (t: number) => t;
const MORPH = 222; // the veil and blur clear, highlight 1 lifts out, the dashboard becomes the shell

// ---- Camera: dashboard centre on screen (cx, cy), scale, tilt. Same convention as Triage so frame 0 is its H5 frame. ----

type Pose = {cx: number; cy: number; s: number; rx: number};

const lerpPose = (a: Pose, b: Pose, t: number): Pose => ({cx: mix(a.cx, b.cx, t), cy: mix(a.cy, b.cy, t), s: mix(a.s, b.s, t), rx: mix(a.rx, b.rx, t)});

/** Pose that puts dashboard point (px, py) at screen point (x, y) at scale s. */
const anchored = (px: number, py: number, x: number, y: number, s: number, rx: number): Pose => ({cx: x - s * (px - 720), cy: y - s * (py - 405), s, rx});

const S0 = 1680 / 1440; // H5
/** Full view with a slow 3% push all the way to the morph. */
const base = (f: number): Pose => ({cx: 960, cy: 540, s: S0 * (1 + 0.03 * ramp(f, 0, MORPH, linear)), rx: 0});

const BRIEF_CARD_X = 1043; // dashboard x of the briefing card centre
/** The briefing at 1.9x; the anchor glides from highlight 1 to highlight 3 across the beats 105 to 135. */
const briefPose = (f: number): Pose => anchored(BRIEF_CARD_X, rowCenterY(0) + 96 * ramp(f, BEATS[0], BEATS[2] - BEATS[0], EASE.inOut), 960, 470, 1.9, 4);
const STATS = anchored(470, 300, 960, 540, 1.7, 2);

function cameraAt(f: number): Pose {
  let p = lerpPose(base(f), briefPose(f), ramp(f, 60, 35, EASE.inOut));
  p = lerpPose(p, STATS, ramp(f, 150, 20, EASE.inOut));
  return lerpPose(p, base(f), ramp(f, 166, 14, EASE.inOut));
}

// ---- Cursor (dashboard coordinates, so it scales with the camera) ----

const ENTRY = {x: 1560, y: 880}; // off the lower right of the frame
const TODAY_ITEM = {x: 100, y: 162};
const BRIEF_ENTRY = {x: 1640, y: 330};
const ROW_X = 1260;

const click = (f: number, at: number) => interpolate(f, [at - 3, at, at + 4], [0, 1, 0], clamp);

const Pointer: React.FC<{f: number}> = ({f}) => {
  let x: number;
  let y: number;
  let press = 0;
  let shrink = 0;
  if (f < 19) {
    const t = ramp(f, 0, 8, EASE.inOut);
    x = mix(ENTRY.x, TODAY_ITEM.x, t);
    y = mix(ENTRY.y, TODAY_ITEM.y, t);
    press = 0.98 * click(f, 8);
    shrink = ramp(f, 10, 8, EASE.in);
  } else if (f >= 88 && f < 155) {
    const e = ramp(f, 88, 17, EASE.inOut);
    x = mix(BRIEF_ENTRY.x, ROW_X, e);
    y = mix(BRIEF_ENTRY.y, rowCenterY(0), e) + 48 * ramp(f, BEATS[1] - 9, 9, EASE.inOut) + 48 * ramp(f, BEATS[2] - 9, 9, EASE.inOut);
    shrink = ramp(f, 145, 9, EASE.in);
  } else {
    return null;
  }
  return (
    <div style={{position: 'absolute', inset: 0, transformOrigin: `${x}px ${y}px`, scale: `${1 - shrink}`}}>
      <Cursor x={x} y={y} press={press} />
    </div>
  );
};

// ---- Caption pill and statement ----

const CaptionPill: React.FC<{f: number}> = ({f}) => {
  const open = ramp(f, 70, 16, EASE.expo);
  const out = ramp(f, 168, 7, EASE.in);
  return (
    <div style={{position: 'absolute', left: 140, bottom: 100, transformOrigin: '0 50%', scale: `${1 - out}`, clipPath: `inset(0 ${(1 - open) * 100}% 0 0 round 40px)`}}>
      <WhitePill height={80} style={{padding: '0 40px', fontSize: 40, lineHeight: '48px', fontWeight: 500, letterSpacing: '-0.02em'}}>
        Your morning briefing.
      </WhitePill>
    </div>
  );
};

// ---- Morph out (H6): highlight 1 becomes the empty Paper White card; the dashboard becomes the ShellStage frame ----

const H6_CARD = {left: 510, top: 300, width: 900, height: 520, radius: 24};
const STAGE = {left: 40, top: 40, width: 1840, height: 1000, radius: 40};

const Morph: React.FC<{f: number; pose: Pose}> = ({f, pose}) => {
  const lift = ramp(f, MORPH, 17, EASE.inOut);
  const text = ramp(f, MORPH, 10, EASE.in);
  const s = pose.s;
  const from = {left: pose.cx + s * (ROW.x - 720), top: pose.cy + s * (ROW.y - 405), width: ROW.w * s, height: ROW.h * s, radius: 16 * s};
  const m = (k: keyof typeof from) => mix(from[k], H6_CARD[k], lift);
  return (
    <div style={{position: 'absolute', left: m('left'), top: m('top'), width: m('width'), height: m('height'), borderRadius: m('radius'), backgroundColor: C.card, overflow: 'hidden'}}>
      {text < 1 ? (
        <div style={{width: ROW.w, height: ROW.h, transformOrigin: '0 0', scale: `${s}`, clipPath: `inset(0 ${text * 100}% 0 0)`}}>
          <BriefingRow index={0} transparent />
        </div>
      ) : null}
    </div>
  );
};

export const Today: React.FC = () => {
  const f = useCurrentFrame();
  const wobble = ramp(f, 12, 30, linear) * (1 - ramp(f, 190, 32, linear)); // tilt drift fades out by the morph so the lift-out maps exactly
  const cam = cameraAt(f);
  const rx = cam.rx + drift('today-rx', f, 0.015, 0.5) * wobble;
  const ry = drift('today-ry', f, 0.015, 0.7) * wobble;

  const veil = ramp(f, 172, 10, EASE.quart) - ramp(f, MORPH, 6, linear);
  const blur = Math.round(10 * veil);
  const morphing = f >= MORPH;
  const mask = ramp(f, MORPH, 10, EASE.in); // dashboard contents mask away upward
  const rest = base(MORPH);
  const shell = ramp(f, MORPH, 12, EASE.inOut);
  const rect = {
    left: mix(960 - 720 * rest.s, STAGE.left, shell),
    top: mix(540 - 405 * rest.s, STAGE.top, shell),
    width: mix(1440 * rest.s, STAGE.width, shell),
    height: mix(810 * rest.s, STAGE.height, shell),
    radius: mix(40 * rest.s, STAGE.radius, shell),
  };

  return (
    <AbsoluteFill>
      <PageBackdrop frameOffset={START.Today} />
      <AbsoluteFill style={{filter: blur > 0 ? `blur(${blur}px)` : undefined}}>
        {morphing ? <div style={{position: 'absolute', left: rect.left, top: rect.top, width: rect.width, height: rect.height, borderRadius: rect.radius, background: HAZE.shell}} /> : null}
        <Camera x={cam.cx - 960} y={cam.cy - 540} scale={cam.s} rotateX={rx} rotateY={ry} origin="960px 540px">
          <div style={{position: 'absolute', left: 240, top: 135, width: 1440, height: 810}}>
            {mask < 1 ? (
              <DashboardShell
                active="today"
                activeFrom="inbox"
                activeT={ramp(f, 8, 14, EASE.quart)}
                style={morphing ? {background: 'none', clipPath: `inset(0 0 ${mask * 100}% 0)`} : undefined}
              >
                {f < 18 ? (
                  <div style={f < 8 ? undefined : {position: 'absolute', inset: 0, clipPath: `inset(${ramp(f, 8, 10, EASE.quart) * 100}% 0 0 0)`}}>
                    <InboxScreen rows={INBOX_FINAL} filteredCount={4} />
                  </div>
                ) : null}
                {f >= 12 ? <TodayScreen f={f} /> : null}
              </DashboardShell>
            ) : null}
            <Pointer f={f} />
          </div>
        </Camera>
        {f >= 234 ? (
          <div style={{position: 'absolute', inset: 0, opacity: ramp(f, 234, 5, linear) < 1 ? ramp(f, 234, 5, linear) : undefined}}>
            <ShellStage frameOffset={START.Today} />
          </div>
        ) : null}
        {morphing ? <Morph f={f} pose={rest} /> : null}
      </AbsoluteFill>
      {veil > 0 ? <AbsoluteFill style={{backgroundColor: `rgba(242,242,243,${0.72 * veil})`}} /> : null}
      {f >= 69 && f < 176 ? <CaptionPill f={f} /> : null}
      {f >= 170 && f < 232 ? (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
          <LineReveal lines={['Minutes, not hours.']} start={176} duration={16} exitAt={221} exitDuration={6} style={{...TYPE.statement, fontFamily: FONT, color: C.ink, textAlign: 'center'}} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
