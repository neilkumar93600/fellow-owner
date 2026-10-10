import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {ChapterTag, PHONE_URLBAR, PhoneFrame, ShellStage, TapRipple, UrlPill} from '../components';
import {FONT} from '../fonts';
import {Camera, clamp, drift, LineReveal, mix, ramp} from '../motion';
import {C, EASE, TYPE} from '../theme';
import type {Cue} from '../timeline';
import {START} from '../timeline';
import {BIO_SCROLL, bioRowTop, joinTargets, PAGE, PAGE_CENTRE, PHONE_AT, TEXTAREA_CENTRE} from './fanjoin/layout';
import {BioPage, JoinPage, SuccessPage} from './fanjoin/pages';

export const CUES: Cue[] = [
  {frame: 4, sfx: 'whoosh', volume: 0.3},
  {frame: 95, sfx: 'click', volume: 0.35},
  {frame: 105, sfx: 'page', volume: 0.3},
  {frame: 121, sfx: 'click', volume: 0.2},
  {frame: 190, sfx: 'switch', volume: 0.2},
  {frame: 210, sfx: 'click', volume: 0.3},
  {frame: 220, sfx: 'click', volume: 0.3},
  {frame: 240, sfx: 'click', volume: 0.35},
  {frame: 255, sfx: 'ding', volume: 0.35},
  {frame: 286, sfx: 'whoosh', volume: 0.4},
];

const linear = (t: number) => t;
const PAGE_W = PAGE.w;
const URL_TARGET = {x: PHONE_AT.x + PHONE_URLBAR.x + PHONE_URLBAR.width / 2, y: PHONE_AT.y + PHONE_URLBAR.y + PHONE_URLBAR.height / 2};
/** The textarea centre in frame px: the camera zooms around it. */
const ZOOM_AT = {x: PHONE_AT.x + PAGE.x + TEXTAREA_CENTRE.x, y: PHONE_AT.y + PAGE.y + TEXTAREA_CENTRE.y};
const TAP_LEN = 20;

const SUPPORT: React.CSSProperties = {position: 'absolute', left: 140, top: 450, ...TYPE.support, color: C.ink, fontFamily: FONT};

/** Left column: chapter tag, title and the three support lines that swap in their own masks. */
const LeftColumn: React.FC = () => {
  const frame = useCurrentFrame();
  const tag = ramp(frame, 8, 14);
  const push = interpolate(frame, [276, 286], [0, -1200], {...clamp, easing: EASE.in});
  const sway = drift('fj-left', frame, 0.01, 3);
  return (
    <AbsoluteFill style={{translate: `${push}px ${sway}px`}}>
      <div style={{position: 'absolute', left: 140, top: 120, translate: `${-30 * (1 - tag)}px 0`, clipPath: `inset(0 ${(1 - tag) * 100}% 0 0 round 28px)`}}>
        <ChapterTag n="01" label="Share your link" surface="shell" />
      </div>
      <LineReveal
        lines={['Fans join in', 'under a minute.']}
        start={14}
        style={{position: 'absolute', left: 140, top: 220, ...TYPE.caption, color: C.ink, fontFamily: FONT}}
      />
      <LineReveal lines={['They tap your bio link.']} start={30} exitAt={106} style={SUPPORT} />
      <LineReveal lines={['One line about themselves.']} start={112} exitAt={194} style={SUPPORT} />
      <LineReveal lines={['The AI suggests where they fit.']} start={200} style={SUPPORT} />
    </AbsoluteFill>
  );
};

export const FanJoin: React.FC = () => {
  const frame = useCurrentFrame();

  // Phone entrance, camera zoom to the textarea, calm drift (zero while the pill lands and while the flood starts).
  const enter = ramp(frame, 4, 24);
  const zoom = ramp(frame, 122, 13, EASE.inOut) - ramp(frame, 172, 13, EASE.inOut);
  const calm = ramp(frame, 30, 20, linear) * (1 - ramp(frame, 266, 20, linear));
  const dr = (key: string, amp: number) => drift(`fj-${key}`, frame, 0.012, amp) * calm;

  // Pages: bio, join, success side by side.
  const slideJoin = ramp(frame, 105, 13, EASE.inOut);
  const slideDone = ramp(frame, 252, 13, EASE.inOut);
  const scroll = BIO_SCROLL * ramp(frame, 60, 30, EASE.inOut);

  // Taps (phone px: device origin at the phone's top-left).
  const T = joinTargets();
  const bioJoin = {x: PAGE.x + 323, y: PAGE.y + bioRowTop(0) + 42 - BIO_SCROLL};
  const dev = (p: {x: number; y: number}) => ({x: PAGE.x + p.x, y: PAGE.y + p.y});
  const taps = [
    {at: 95, ...bioJoin},
    {at: 121, ...dev(T.textarea)},
    {at: 210, ...dev(T.builders)},
    {at: 220, ...dev(T.fitness)},
    {at: 240, ...dev(T.join)},
  ];
  const joinPress = interpolate(frame, [95, 98, 101], [0, 1, 0], clamp);
  const buttonPress = interpolate(frame, [240, 243, 246], [0, 1, 0], clamp);
  const buttonLoading = ramp(frame, 246, 6, linear);

  // H3 pill: glass fades 0..16, lands in the address bar by 18, then the text hands over to the phone's own url 18..29 in place.
  const flight = ramp(frame, 0, 18, EASE.inOut);
  const urlHandOver = ramp(frame, 18, 11, linear);

  // Flood out: the pewter page grows past the corners while the phone shrinks into its centre.
  const flood = ramp(frame, 288, 9, EASE.inOut);
  const shrink = ramp(frame, 288, 8, EASE.in);
  const edge = (a: number, b: number) => mix(a, b, flood);

  return (
    <ShellStage frameOffset={START.FanJoin}>
      <LeftColumn />

      {frame >= 288 ? (
        <div
          style={{
            position: 'absolute',
            left: edge(PHONE_AT.x + PAGE.x, -60),
            top: edge(PHONE_AT.y + PAGE.y, -60),
            width: edge(PAGE_W, 2040),
            height: edge(PAGE.h, 1200),
            borderRadius: `0 0 ${46 * (1 - flood)}px ${46 * (1 - flood)}px`,
            backgroundColor: C.shell,
          }}
        />
      ) : null}

      {shrink < 1 ? (
        <Camera
          origin={`${ZOOM_AT.x}px ${ZOOM_AT.y}px`}
          scale={(1.12 - 0.12 * enter) * (1 + 0.5 * zoom) * (1 + dr('s', 0.01))}
          x={dr('x', 6)}
          y={90 * zoom + dr('y', 6)}
          rotateY={12 * (1 - enter) + dr('ry', 1.5)}
          rotateX={dr('rx', 1)}
        >
          <div
            style={{
              position: 'absolute',
              left: PHONE_AT.x,
              top: PHONE_AT.y,
              opacity: enter,
              scale: `${1 - shrink}`,
              transformOrigin: `${PAGE_CENTRE.x}px ${PAGE_CENTRE.y}px`,
            }}
          >
            <PhoneFrame>
              <div style={{position: 'absolute', inset: 0, translate: `${-PAGE_W * (slideJoin + slideDone)}px 0`}}>
                <div style={{position: 'absolute', left: 0, top: 0, width: PAGE_W, height: PAGE.h, translate: `0 ${-scroll}px`}}>
                  <BioPage joinPress={joinPress} />
                </div>
                <div style={{position: 'absolute', left: PAGE_W, top: 0, width: PAGE_W, height: PAGE.h}}>
                  <JoinPage buttonPress={buttonPress} buttonLoading={buttonLoading} />
                </div>
                <div style={{position: 'absolute', left: 2 * PAGE_W, top: 0, width: PAGE_W, height: PAGE.h}}>
                  <SuccessPage />
                </div>
              </div>
            </PhoneFrame>
            {frame < 30 ? (
              <div
                style={{
                  position: 'absolute',
                  left: PHONE_URLBAR.x - 2,
                  top: PHONE_URLBAR.y - 2,
                  width: PHONE_URLBAR.width + 4,
                  height: PHONE_URLBAR.height + 4,
                  backgroundColor: C.cardStrong,
                  opacity: 1 - urlHandOver,
                }}
              />
            ) : null}
            {taps.map((t) => (
              <TapRipple key={t.at} x={t.x} y={t.y} progress={(frame - t.at) / TAP_LEN} />
            ))}
          </div>
        </Camera>
      ) : null}

      {frame < 30 ? (
        <div
          style={{
            position: 'absolute',
            left: 600,
            top: 496,
            translate: `${(URL_TARGET.x - 960) * flight}px ${(URL_TARGET.y - 540) * flight}px`,
            scale: `${mix(1, PHONE_URLBAR.width / 720, flight)}`,
            opacity: 1 - urlHandOver,
          }}
        >
          <UrlPill text="fellowowners.app/mira" style={{backgroundColor: `rgba(255,255,255,${0.45 * (1 - ramp(frame, 0, 16, linear))})`}} />
        </div>
      ) : null}
    </ShellStage>
  );
};
