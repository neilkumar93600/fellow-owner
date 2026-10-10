import {evolvePath} from '@remotion/paths';
import React, {useId} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {EASE} from '../theme';
import {clamp} from './core';

export const DrawPath: React.FC<{
  d: string;
  start: number;
  duration: number;
  stroke: string;
  strokeWidth: number;
  viewBox: string;
  width: number;
  height: number;
  easing?: (t: number) => number;
  style?: React.CSSProperties;
}> = ({d, start, duration, stroke, strokeWidth, viewBox, width, height, easing = EASE.quart, style}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [start, start + Math.max(1, duration)], [0, 1], {...clamp, easing});
  const {strokeDasharray, strokeDashoffset} = evolvePath(progress, d);
  return (
    <svg viewBox={viewBox} width={width} height={height} style={{overflow: 'visible', ...style}}>
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={strokeDasharray}
        strokeDashoffset={strokeDashoffset}
        opacity={progress > 0 ? 1 : 0}
      />
    </svg>
  );
};

/** Full-frame 3D wrapper: perspective on the outer layer, the move on a preserve-3d inner layer. */
export const Camera: React.FC<{
  children: React.ReactNode;
  perspective?: number;
  scale?: number;
  x?: number;
  y?: number;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  origin?: string;
  style?: React.CSSProperties;
}> = ({children, perspective = 2400, scale = 1, x = 0, y = 0, rotateX = 0, rotateY = 0, rotateZ = 0, origin = '50% 50%', style}) => (
  <AbsoluteFill style={{perspective, perspectiveOrigin: origin, ...style}}>
    <AbsoluteFill
      style={{
        transformStyle: 'preserve-3d',
        transformOrigin: origin,
        transform: `translate3d(${x}px, ${y}px, 0) scale(${scale}) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`,
      }}
    >
      {children}
    </AbsoluteFill>
  </AbsoluteFill>
);

/** Horizontal-only blur for whip pans (SVG stdDeviation "N 0"). */
export const WhipBlur: React.FC<{amount: number; children: React.ReactNode; style?: React.CSSProperties}> = ({amount, children, style}) => {
  const id = useId().replace(/:/g, '');
  const n = Math.round(Math.max(0, amount));
  return (
    <AbsoluteFill style={{filter: n > 0 ? `url(#${id})` : undefined, ...style}}>
      {n > 0 ? (
        <svg width="0" height="0" style={{position: 'absolute'}}>
          <filter id={id} x="-20%" y="0%" width="140%" height="100%">
            <feGaussianBlur stdDeviation={`${n} 0`} />
          </filter>
        </svg>
      ) : null}
      {children}
    </AbsoluteFill>
  );
};

/** Animated film grain (anti-banding on the haze). The turbulence seed follows `frame + frameOffset`, so it is deterministic and continuous across a cut. */
export const Grain: React.FC<{opacity?: number; frameOffset?: number}> = ({opacity = 0.035, frameOffset = 0}) => {
  const frame = useCurrentFrame() + frameOffset;
  const id = useId().replace(/:/g, '');
  return (
    <AbsoluteFill style={{pointerEvents: 'none', opacity}}>
      <svg width="100%" height="100%">
        <filter id={id}>
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 97} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${id})`} />
      </svg>
    </AbsoluteFill>
  );
};
