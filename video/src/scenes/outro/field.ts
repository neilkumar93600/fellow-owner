import {interpolate, random} from 'remotion';
import type {Sphere3D} from '../../components';
import {makeFollowers} from '../../components';
import {PALETTES} from '../../data';
import {clamp, mix, ramp} from '../../motion';
import {EASE} from '../../theme';

export const ORIGIN = {x: 960, y: 540};
/** One cluster per community, in demo order. */
export const CENTERS = [
  {x: 1660, y: 540},
  {x: 1350, y: 880},
  {x: 570, y: 880},
  {x: 260, y: 540},
  {x: 570, y: 200},
  {x: 1350, y: 200},
] as const;

const FOLLOWERS = makeFollowers(240, 'outro');
const SPREAD_XY = 180; // unit 0.33 sigma -> about 60 px, keeps the centre block clear
const SPREAD_Z = 240; // about 80
const RADIUS = 16;
const HERO_RADIUS = 34;
const BURST = 12;

/** Frame f of the outro: the hero sphere bursts into 240 followers that spray out, then gather into six turning clusters. */
export function spheresAt(frame: number): Sphere3D[] {
  return FOLLOWERS.map((f, i) => {
    const r = (k: string) => random(`outro-${i}-${k}`);
    const hero = i === 0;
    const center = CENTERS[f.cluster];
    const angle = 0.011 * frame + f.cluster * 1.3;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rx = f.ux * SPREAD_XY;
    const rz = f.uz * SPREAD_Z;
    const tx = center.x - ORIGIN.x + rx * cos - rz * sin;
    const ty = center.y - ORIGIN.y + f.uy * SPREAD_XY;
    const tz = rx * sin + rz * cos;

    const dir = r('dir') * Math.PI * 2;
    const dist = 260 + r('dist') * 520;
    const sx = Math.cos(dir) * dist;
    const sy = Math.sin(dir) * dist * 0.7;
    const sz = (r('z') - 0.5) * 240;

    const spray = ramp(frame, 0, BURST, EASE.expo);
    const gather = ramp(frame, BURST + Math.round(r('delay') * 18), 36, EASE.expo);
    const px = mix(mix(0, sx, spray), tx, gather);
    const py = mix(mix(0, sy, spray), ty, gather);
    const pz = mix(mix(hero ? 0 : -50, sz, spray), tz, gather);
    const size = RADIUS * f.size;
    const radius = hero ? mix(HERO_RADIUS, size, ramp(frame, 0, BURST, EASE.expo)) : size * interpolate(frame, [0, 8], [0, 1], {...clamp, easing: EASE.expo});
    return {x: px, y: py, z: pz, r: radius, color: hero ? PALETTES[1][0] : f.color};
  });
}

/** The ring of lines between neighbouring clusters, shortened so they stop short of the spheres. */
export function ringLines(): string[] {
  return CENTERS.map((a, i) => {
    const b = CENTERS[(i + 1) % CENTERS.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const cut = 105 / len;
    const p = (t: number) => `${mix(a.x, b.x, t)} ${mix(a.y, b.y, t)}`;
    return `M ${p(cut)} L ${p(1 - cut)}`;
  });
}
