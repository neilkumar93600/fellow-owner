import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {LogoLockup, UrlPill} from '../components';
import {creator, HOST} from '../data';
import {FONT} from '../fonts';
import {clamp, LineReveal, mix, ramp} from '../motion';
import {C, EASE, TYPE} from '../theme';
import type {Cue} from '../timeline';
import {LoopWindow} from './solution/loop';
import {StageLine, StageRail} from './solution/rail';
import {BloomStage} from './solution/stage';

export const CUES: Cue[] = [
  {frame: 0, sfx: 'shutter', volume: 0.3},
  {frame: 30, sfx: 'whoosh', volume: 0.25},
  {frame: 62, sfx: 'whoosh', volume: 0.3},
  {frame: 150, sfx: 'whoosh', volume: 0.35},
  {frame: 207, sfx: 'switch', volume: 0.2},
  {frame: 259, sfx: 'switch', volume: 0.2},
  {frame: 311, sfx: 'switch', volume: 0.2},
  {frame: 363, sfx: 'switch', volume: 0.2},
  {frame: 396, sfx: 'ding', volume: 0.3},
  {frame: 436, sfx: 'click', volume: 0.2},
];

// Lockup of size 72: 96 px circles, so the circle centre sits 48 px in from the left edge. It starts as the 20 px
// H2 dot at (960, 540) and ends at the shell's logo spot with its circle centre at (196, 150), size 30.
const LOCKUP_SIZE = 72;
const CIRCLE = 96;
const DOT = 20;
const CORNER = {x: 196, y: 150, size: 30};
const URL = `${HOST}/${creator.handle}`;

const Lockup: React.FC = () => {
  const frame = useCurrentFrame();
  const grow = ramp(frame, 0, 20);
  const split = ramp(frame, 10, 20);
  const glide = ramp(frame, 15, 29, EASE.inOut);
  const reveal = ramp(frame, 20, 24);
  const corner = ramp(frame, 45, 29, EASE.inOut);
  const circleX = 960 + CIRCLE / 2;
  // Glide: from "circle centred" (-48 px) to "whole lockup centred" (-50%), then to the corner; scale is about the circle.
  const pct = -50 * glide * (1 - corner);
  const px = -(CIRCLE / 2) * (1 - glide) + (CORNER.x - circleX) * corner;
  const y = (CORNER.y - 540) * corner;
  const scale = mix(DOT / CIRCLE, 1, grow) * mix(1, CORNER.size / LOCKUP_SIZE, corner);
  return (
    <div style={{position: 'absolute', left: 960, top: 540, translate: `calc(${pct}% + ${px}px) calc(-50% + ${y}px)`, scale: `${scale}`, transformOrigin: `${CIRCLE / 2}px 50%`}}>
      <LogoLockup size={LOCKUP_SIZE} split={split} reveal={reveal} />
    </div>
  );
};

const Tagline: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [62, 150], [1, 1.02], clamp);
  const recede = ramp(frame, 150, 25, EASE.in);
  const blur = Math.round(12 * recede);
  return (
    <AbsoluteFill style={{scale: `${drift * mix(1, 0.92, recede)}`, opacity: 1 - recede, filter: blur > 0 ? `blur(${blur}px)` : undefined, fontFamily: FONT, color: C.ink, textAlign: 'center'}}>
      <LineReveal lines={['Turn followers', 'into fellow owners.']} start={62} stagger={6} style={{position: 'absolute', left: 0, right: 0, top: 360, ...TYPE.tagline}} />
      <LineReveal lines={['One link in your bio.']} start={105} style={{position: 'absolute', left: 0, right: 0, top: 690, ...TYPE.support}} />
    </AbsoluteFill>
  );
};

const LoopGroup: React.FC = () => {
  const frame = useCurrentFrame();
  // Exit 418 to 435 (ahead of the brief's 425) so the window is nearly gone before the closing line rises at 428; the
  // opacity runs ahead of the scale/blur (ease-in over 17 frames would still be at 0.65 at 430) so no text sits behind text.
  const out = ramp(frame, 418, 17, EASE.in);
  const blur = Math.round(10 * out);
  return (
    <AbsoluteFill style={{scale: `${mix(1, 0.9, out)}`, opacity: 1 - ramp(frame, 418, 12, EASE.quart), filter: blur > 0 ? `blur(${blur}px)` : undefined}}>
      <LoopWindow />
      <StageLine />
      <StageRail />
    </AbsoluteFill>
  );
};

const Link: React.FC = () => {
  const frame = useCurrentFrame();
  const typed = URL.slice(0, Math.min(URL.length, Math.floor(((frame - 436) / 24) * URL.length)));
  return (
    <div style={{position: 'absolute', left: 600, top: 496, scale: `${ramp(frame, 436, 14)}`}}>
      <UrlPill text={typed} caret={frame < 470} />
    </div>
  );
};

export const Solution: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <BloomStage>
      {frame >= 62 && frame < 176 ? <Tagline /> : null}
      {frame < 180 ? <Lockup /> : null}
      {frame >= 150 && frame < 436 ? <LoopGroup /> : null}
      {frame >= 428 && frame < 475 ? (
        <LineReveal
          lines={['It starts with one link.']}
          start={428}
          exitAt={466}
          exitDuration={8}
          style={{position: 'absolute', left: 0, right: 0, top: 350, textAlign: 'center', fontFamily: FONT, color: C.ink, fontSize: 96, lineHeight: '100px', fontWeight: 500, letterSpacing: '-0.02em'}}
        />
      ) : null}
      {frame >= 436 ? <Link /> : null}
    </BloomStage>
  );
};
