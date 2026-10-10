import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {drift, Grain} from '../motion';
import {C, HAZE, R} from '../theme';

/** Canonical shell haze layers (DESIGN.json .ds-shell): size, centre, rgb, peak alpha. */
const SHELL_LAYERS = [
  {w: 38, h: 53, x: 53, y: 79, rgb: '174,184,230', a: 0.72},
  {w: 40, h: 41, x: 71, y: 102, rgb: '159,208,215', a: 0.88},
  {w: 70, h: 60, x: 97, y: 80, rgb: '215,204,182', a: 0.9},
];

/** The shell haze with its centres breathing up to ±2% and alpha ±3% (amount 0 = the canonical gradient). */
function breathingShell(frame: number, amount: number): string {
  if (amount <= 0) return HAZE.shell;
  const layers = SHELL_LAYERS.map((l, i) => {
    const x = l.x + drift(`haze-x${i}`, frame, 0.008, 2) * amount;
    const y = l.y + drift(`haze-y${i}`, frame, 0.008, 2) * amount;
    const a = Math.min(1, l.a * (1 + drift(`haze-a${i}`, frame, 0.006, 0.03) * amount));
    return `radial-gradient(${l.w}% ${l.h}% at ${x.toFixed(2)}% ${y.toFixed(2)}%, rgba(${l.rgb},${a.toFixed(3)}), rgba(${l.rgb},0) 100%)`;
  });
  return `${layers.join(', ')}, ${C.shell}`;
}

export const Haze: React.FC<{variant: 'shell' | 'page'; style?: React.CSSProperties}> = ({variant, style}) => (
  <AbsoluteFill style={{background: HAZE[variant], ...style}} />
);

/**
 * Soft Daylight Grey page with the landing hero's faint haze, lower right. `frameOffset` is added to the frame for the
 * grain seed: a scene passes its `START` so two scenes meeting at a cut render identical backdrops.
 */
export const PageBackdrop: React.FC<{haze?: number; frameOffset?: number}> = ({haze = 1, frameOffset = 0}) => (
  <AbsoluteFill style={{backgroundColor: C.page}}>
    <Haze variant="page" style={{opacity: haze}} />
    <Grain frameOffset={frameOffset} />
  </AbsoluteFill>
);

/**
 * The page with the Pewter Shell inset 40 px (x 40..1880, y 40..1040), radius 40, breathing haze. The haze and the grain
 * run on `frame + frameOffset`: a scene passes its `START` so two scenes meeting at a cut (H3, H7) read the same global
 * frame and render the identical backdrop. Grain sits behind the children so product colours stay exact.
 */
export const ShellStage: React.FC<{children?: React.ReactNode; hazeDrift?: number; frameOffset?: number}> = ({children, hazeDrift = 1, frameOffset = 0}) => {
  const frame = useCurrentFrame() + frameOffset;
  return (
    <AbsoluteFill style={{backgroundColor: C.page}}>
      <div style={{position: 'absolute', left: 40, top: 40, width: 1840, height: 1000, borderRadius: R.shell, background: breathingShell(frame, hazeDrift)}} />
      <Grain frameOffset={frameOffset} />
      <AbsoluteFill>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
