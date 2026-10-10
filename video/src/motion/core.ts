import {noise2D} from '@remotion/noise';
import {interpolate, random} from 'remotion';
import {EASE} from '../theme';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** 0..1 progress of a move that starts at `start` and lasts `duration` frames. */
export function ramp(frame: number, start: number, duration: number, easing: (t: number) => number = EASE.expo): number {
  return interpolate(frame, [start, start + Math.max(1, duration)], [0, 1], {...clamp, easing});
}

export function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Deterministic 0..1 from a key. */
export function seeded(key: string): number {
  return random(key);
}

/** Smooth deterministic wander in -amp..amp. */
export function drift(key: string, frame: number, speed = 0.01, amp = 1): number {
  return noise2D(key, frame * speed, 0) * amp;
}
