import {Check} from 'lucide-react';
import React from 'react';
import {Interactive, useCurrentFrame} from 'remotion';
import {BrowserFrame, ChapterTag, Cursor, ShellStage, SphereCanvas} from '../components';
import {PALETTES} from '../data';
import {FONT} from '../fonts';
import {Camera, drift, LineReveal, mix, ramp, WhipBlur} from '../motion';
import {C, EASE, SHADOW, TYPE} from '../theme';
import type {Cue} from '../timeline';
import {START} from '../timeline';
import {Composer} from './build/composer';
import {BROWSER, CENTER, PROMOTE, PUBLISH, SPHERE_R} from './build/layout';
import {pressAt} from './build/parts';
import {cardCenter, LinkCard, ShowcasePage} from './build/showcase';
import {IdeaCard, TeamCard} from './build/team';

export const CUES: Cue[] = [
  {frame: 2, sfx: 'whoosh', volume: 0.3},
  {frame: 45, sfx: 'switch', volume: 0.25},
  {frame: 72, sfx: 'ding', volume: 0.25},
  {frame: 110, sfx: 'click', volume: 0.35},
  {frame: 118, sfx: 'page', volume: 0.3},
  {frame: 270, sfx: 'click', volume: 0.35},
  {frame: 286, sfx: 'ding', volume: 0.35},
  {frame: 302, sfx: 'whoosh', volume: 0.35},
  {frame: 380, sfx: 'switch', volume: 0.2},
  {frame: 396, sfx: 'whoosh', volume: 0.35},
];

const linear = (t: number) => t;
const FULL: React.CSSProperties = {position: 'absolute', inset: 0};

// ---- Text block: tag and statements ----

const STATEMENT: React.CSSProperties = {...TYPE.caption, fontFamily: FONT, color: C.ink, position: 'absolute', left: 140, top: 190};
/** Each sentence lifts out of its mask (12 frames) and the next rises into it; every one stays fully readable for 45 frames or more. */
const STATEMENTS: {lines: string[]; at: number; exitAt?: number}[] = [
  {lines: ['Teams form around the best ideas.'], at: 14, exitAt: 114},
  {lines: ['Drafts in your voice.'], at: 126, exitAt: 232},
  {lines: ['One click to publish.'], at: 244, exitAt: 306},
  {lines: ['A showcase page, and a link', 'that counts every click.'], at: 318},
];

const TextBlock: React.FC<{f: number}> = ({f}) => {
  const p = ramp(f, 396, 10, EASE.in);
  if (p >= 1) return null;
  const to = cardCenter(f);
  return (
    <Interactive.Div name="Text block" style={{...FULL, transformOrigin: `${to.x}px ${to.y}px`, scale: 1 - p}}>
      <div style={{position: 'absolute', left: 140, top: 110, overflow: 'hidden'}}>
        <div style={{translate: `0 ${110 * (1 - ramp(f, 6, 14, EASE.expo))}%`}}>
          <ChapterTag n="03" label="Back what they build" surface="shell" />
        </div>
      </div>
      {STATEMENTS.map((s) => (
        <LineReveal key={s.at} lines={s.lines} start={s.at} duration={16} exitAt={s.exitAt} exitDuration={12} style={STATEMENT} />
      ))}
    </Interactive.Div>
  );
};

// ---- Part A: idea card and team ----

const PartA: React.FC<{f: number}> = ({f}) => {
  const out = ramp(f, 116, 12, EASE.in);
  const zoom = 1 + 0.015 * ramp(f, 0, 116, linear) + 0.06 * ramp(f, 86, 24, EASE.inOut);
  const reach = ramp(f, 92, 16, EASE.inOut);
  const cx = mix(1700, PROMOTE.x, reach);
  const cy = mix(1000, PROMOTE.y, reach) - 50 * Math.sin(Math.PI * reach);
  return (
    <Interactive.Div name="Part A" style={{...FULL, transformOrigin: `${PROMOTE.x}px ${PROMOTE.y}px`, scale: zoom, translate: `${-1920 * out}px 0`}}>
      <WhipBlur amount={Math.round(18 * out)}>
        <IdeaCard />
        <TeamCard />
      </WhipBlur>
      {f >= 88 ? (
        <div style={{...FULL, transformOrigin: `${cx}px ${cy}px`, scale: ramp(f, 88, 8, EASE.expo)}}>
          <Cursor x={cx} y={cy} press={pressAt(f, 110)} />
        </div>
      ) : null}
    </Interactive.Div>
  );
};

// ---- Part B: the composer, then the toast ----

const PartB: React.FC<{f: number}> = ({f}) => {
  const out = ramp(f, 300, 14, EASE.in);
  const zoom = 1 + 0.01 * ramp(f, 136, 112, linear) + 0.025 * ramp(f, 248, 18, EASE.inOut);
  const reach = ramp(f, 255, 13, EASE.inOut);
  const cx = mix(1960, PUBLISH.x, reach);
  const cy = mix(1100, PUBLISH.y, reach) + 40 * Math.sin(Math.PI * reach);
  return (
    <Interactive.Div
      name="Part B"
      style={{...FULL, transformOrigin: `${CENTER.x}px 650px`, translate: `0 ${40 * out}px`, scale: 1 - 0.06 * out, clipPath: `inset(${250 + 750 * out}px 0 0 0)`}}
    >
      <Interactive.Div name="Composer camera" style={{...FULL, transformOrigin: `${PUBLISH.x}px 640px`, scale: zoom}}>
        <WhipBlur amount={Math.round(24 * (1 - ramp(f, 120, 18, EASE.expo)))}>
          <Composer x={1800 * (1 - ramp(f, 120, 18, EASE.expo))} />
        </WhipBlur>
        <Cursor x={cx} y={cy} press={pressAt(f, 270)} />
      </Interactive.Div>
    </Interactive.Div>
  );
};

/** Pure White toast; it rises out of a mask at the bottom right and drops back out at 346, so it stays readable past the composer's exit. */
const Toast: React.FC<{f: number}> = ({f}) => {
  const inn = ramp(f, 286, 16, EASE.expo);
  const out = ramp(f, 346, 12, EASE.in);
  if (f < 286 || out >= 1) return null;
  const moving = inn < 1 || out > 0;
  return (
    <div style={{position: 'absolute', right: 150, top: 906, height: 72, clipPath: moving ? 'inset(-100px -100px 0 -100px)' : undefined}}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          height: 72,
          padding: '0 28px 0 22px',
          boxSizing: 'border-box',
          borderRadius: 16,
          backgroundColor: C.cardStrong,
          border: `1px solid ${C.line}`,
          boxShadow: SHADOW.overlay,
          fontFamily: FONT,
          fontSize: 22,
          lineHeight: '30px',
          color: C.ink,
          whiteSpace: 'nowrap',
          translate: `0 ${(1 - inn) * 110 + out * 110}px`,
        }}
      >
        <Check size={26} strokeWidth={2} color={C.successInk} />
        Published. Your showcase page is live.
      </div>
    </div>
  );
};

// ---- Part C: showcase page and tracked link ----

const PartC: React.FC<{f: number}> = ({f}) => {
  const e = ramp(f, 302, 28, EASE.quint);
  const p = ramp(f, 396, 10, EASE.in);
  if (p >= 1) return null;
  const to = cardCenter(f);
  return (
    <Interactive.Div name="Part C" style={{...FULL, transformOrigin: `${to.x}px ${to.y}px`, scale: 1 - p}}>
      <WhipBlur amount={Math.round(18 * (1 - e) ** 2)}>
        <Camera
          origin={`${BROWSER.left + BROWSER.width / 2}px ${BROWSER.top + BROWSER.height / 2}px`}
          x={1900 * (1 - e)}
          y={drift('browser-y', f, 0.02, 5)}
          rotateY={8 + 17 * (1 - e) - 2 * ramp(f, 330, 66, linear)}
        >
          <div style={{position: 'absolute', left: BROWSER.left, top: BROWSER.top}}>
            <BrowserFrame url="fellowowners.app/mira/gym-log" width={BROWSER.width} height={BROWSER.height}>
              <ShowcasePage />
            </BrowserFrame>
          </div>
        </Camera>
      </WhipBlur>
    </Interactive.Div>
  );
};

export const Build: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <ShellStage frameOffset={START.Build}>
      <TextBlock f={f} />
      {f < 136 ? <PartA f={f} /> : null}
      {f >= 112 && f < 318 ? <PartB f={f} /> : null}
      {f >= 298 ? <PartC f={f} /> : null}
      <Toast f={f} />
      {f >= 302 && f < 416 ? (
        <Interactive.Div name="Tracked link" style={FULL}>
          <LinkCard />
        </Interactive.Div>
      ) : null}
      {f >= 408 ? (
        <SphereCanvas spheres={[{x: 0, y: 0, z: 0, r: SPHERE_R, color: PALETTES[1][0], alpha: ramp(f, 410, 4, linear)}]} />
      ) : null}
    </ShellStage>
  );
};
