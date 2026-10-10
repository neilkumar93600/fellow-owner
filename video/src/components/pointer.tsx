import React from 'react';
import {C, EASE} from '../theme';

/** Arrow pointer, 32 px, ink with a 2 px white stroke; the tip sits at (x, y). `press` scales it to 0.88. */
export const Cursor: React.FC<{x: number; y: number; press?: number}> = ({x, y, press = 0}) => (
  <svg width={32} height={32} viewBox="0 0 32 32" style={{position: 'absolute', left: x - 6, top: y - 3, overflow: 'visible', transformOrigin: '6px 3px', scale: `${1 - 0.12 * press}`}}>
    <path d="M6 3 L6 26 L12 20.5 L16.2 29 L20 27.2 L15.9 18.9 L24 18.9 Z" fill={C.ink} stroke={C.cardStrong} strokeWidth={2} strokeLinejoin="round" />
  </svg>
);

/** Touch feedback: an ink 12% dot plus a 2 px ink ring (25%) growing 0 to 36 px radius and fading. */
export const TapRipple: React.FC<{x: number; y: number; progress: number}> = ({x, y, progress}) => {
  if (progress <= 0 || progress >= 1) return null;
  const r = 36 * EASE.expo(progress);
  const fade = 1 - progress;
  return (
    <svg width={96} height={96} viewBox="-48 -48 96 96" style={{position: 'absolute', left: x - 48, top: y - 48, overflow: 'visible', pointerEvents: 'none'}}>
      <circle r={14} fill="rgba(45,45,48,0.12)" opacity={fade} />
      <circle r={r} fill="none" stroke="rgba(45,45,48,0.25)" strokeWidth={2} opacity={fade} />
    </svg>
  );
};
