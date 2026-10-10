import {interpolate, random} from 'remotion';
import type {Sphere3D} from '../../components';
import {makeFollowers} from '../../components';
import {PALETTES} from '../../data';
import {clamp, drift, mix, ramp} from '../../motion';
import {EASE} from '../../theme';

// The Hook's follower field: one sphere splits into a ring of 10, bursts into 320 that fly out in depth, orbit,
// then get pulled into the number. World units sit on the canvas' projection (focal 1200, centre = burst origin).

export const ORIGIN = {x: 960, y: 330};

const FOCAL = 1200;
const COUNT = 320;
const RING = 10;
const NEAR_Z = 400; // spheres that settle at z >= NEAR_Z draw on the canvas in front of the type
const PAST_Z = 1250; // beyond the camera: the canvas culls them, so they fly past and are gone
const DOLLY_IN = 1.15; // field scale until the burst, dollying back to 1 over 30 to 75
const R0 = 22;
const PULL_Y = 560 - ORIGIN.y; // the number's centre, at z 0
const PIVOT_Z = -300; // the slow orbit turns the field around this depth, so near and far move against each other
const TAU = Math.PI * 2;

const rnd = (i: number, k: string) => random(`hook-${i}-${k}`);

/** Inside the ellipse around the number and copy: far spheres avoid it (two retries) so the type stays clear. */
const behindType = (x: number, y: number) => ((x - 960) / 620) ** 2 + ((y - 615) / 250) ** 2 < 1;

const followers = makeFollowers(COUNT, 'hook');

const HOMES = followers.map((f, i) => {
  // The first ten (the ring) stay far, behind the type, so the split never changes layer.
  const depth = i < RING ? 0 : rnd(i, 'depth');
  const kind = depth < 0.7 ? 'far' : depth < 0.88 ? 'mid' : depth < 0.97 ? 'near' : 'past';
  const a = rnd(i, 'a') * TAU;
  let x: number;
  let y: number;
  let z: number;
  if (kind === 'past') {
    // straight at the camera and out of frame: by z 1100 the projection (x 12) is already beyond the edges
    z = PAST_Z;
    const d = mix(120, 200, rnd(i, 'd'));
    x = Math.cos(a) * d;
    y = Math.sin(a) * d;
  } else {
    z = kind === 'far' ? mix(-1200, 0, rnd(i, 'z')) : kind === 'mid' ? mix(0, NEAR_Z - 1, rnd(i, 'z')) : mix(NEAR_Z, 800, rnd(i, 'z'));
    let sx: number;
    let sy: number;
    if (kind === 'near') {
      // big and soft around the frame edges
      const k = mix(0.95, 1.3, rnd(i, 'k'));
      sx = 960 + Math.cos(a) * 980 * k;
      sy = 540 + Math.sin(a) * 560 * k;
    } else {
      let t = 0;
      do {
        sx = mix(-80, 2000, rnd(i, `sx${t}`));
        sy = mix(-60, 1140, rnd(i, `sy${t}`));
      } while (behindType(sx, sy) && ++t < 3);
    }
    const p = FOCAL / (FOCAL - z);
    x = (sx - ORIGIN.x) / p;
    y = (sy - ORIGIN.y) / p;
  }
  const jitter = rnd(i, 'ja') * TAU;
  const front = kind === 'near' || kind === 'past';
  // Near spheres whoosh out early and fast and are pulled in first, so the type is clear on the 75 landing and
  // under the second line; far ones fill in over 30 to 62 and are pulled in until 150.
  const spawn = i < RING ? 30 : front ? 30 + 10 * rnd(i, 'spawn') : 30 + 30 * ((i - RING) / (COUNT - RING)) + 2 * rnd(i, 'spawn');
  const pullAt = front ? 105 + 4 * rnd(i, 'pull') : 108 + 14 * rnd(i, 'pull');
  return {
    x,
    y,
    z,
    r: R0 * f.size,
    color: i === 0 ? PALETTES[1][0] : f.color,
    front,
    past: kind === 'past',
    spawn,
    flight: front ? 18 + 8 * rnd(i, 'flight') : 26 + 16 * rnd(i, 'flight'),
    startX: Math.cos(jitter) * 24 * Math.sqrt(rnd(i, 'jr')),
    startY: Math.sin(jitter) * 24 * Math.sqrt(rnd(i, 'jr')),
    pullAt,
    pullDur: front ? 20 + 4 * rnd(i, 'pullDur') : 150 - pullAt - 2 * rnd(i, 'pullDur'), // every sphere is gone by 150
  };
});

/** Ring slot k while the first sphere splits (15 to 29), in world units. */
function ringAt(k: number, frame: number) {
  const split = ramp(frame, 15, 14, EASE.expo);
  const a = -Math.PI / 2 + (k * TAU) / RING + 0.02 * Math.max(0, frame - 15);
  const rad = (90 / DOLLY_IN) * split;
  return {x: Math.cos(a) * rad, y: Math.sin(a) * rad, split};
}

function sphereAt(i: number, frame: number): Omit<Sphere3D, 'color'> | null {
  const h = HOMES[i];
  if (i < RING && frame < 30) {
    if (i > 0 && frame < 15) return null;
    const ring = ringAt(i, frame);
    // sphere 0 scales in at r 34, then shrinks to 24 as the other nine slide out from behind it
    const r = i === 0 ? mix(34, 24, ring.split) * ramp(frame, 0, 12, EASE.expo) : 24;
    return {x: ring.x, y: ring.y, z: 0, r: r / DOLLY_IN};
  }
  if (frame < h.spawn) return null;

  const e = ramp(frame, h.spawn, h.flight, EASE.expo);
  const start = i < RING ? ringAt(i, 30) : {x: h.startX, y: h.startY};
  let x = mix(start.x, h.x, e) + drift(`hook-${i}-wx`, frame, 0.012, 22) * e;
  const y = mix(start.y, h.y, e) + drift(`hook-${i}-wy`, frame, 0.012, 22) * e;
  let z = mix(0, h.z, e) + drift(`hook-${i}-wz`, frame, 0.01, 60) * e;
  let r = i < RING ? mix(24 / DOLLY_IN, h.r, e) : h.r * ramp(frame, h.spawn, 8, EASE.expo);

  // slow orbit around the vertical axis through PIVOT_Z
  const yaw = 0.0004 * Math.max(0, frame - 30);
  const dz = z - PIVOT_Z;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  [x, z] = [x * cos - dz * sin, PIVOT_Z + x * sin + dz * cos];

  // pulled into the number, shrinking to nothing (the ones that flew past the camera are already gone)
  const q = h.past ? 0 : ramp(frame, h.pullAt, h.pullDur, EASE.in);
  r *= 1 - q;
  if (r <= 0) return null;
  return {x: mix(x, 0, q), y: mix(y, PULL_Y, q), z: mix(z, 0, q), r};
}

/** Spheres for this frame, split by layer. Sphere 0 goes last so it draws over its ring siblings (stable z sort). */
export function fieldAt(frame: number): {far: Sphere3D[]; near: Sphere3D[]} {
  const dolly = interpolate(frame, [30, 75], [DOLLY_IN, 1], {...clamp, easing: EASE.inOut});
  const far: Sphere3D[] = [];
  const near: Sphere3D[] = [];
  for (let i = COUNT - 1; i >= 0; i--) {
    const s = sphereAt(i, frame);
    if (!s) continue;
    (HOMES[i].front ? near : far).push({x: s.x * dolly, y: s.y * dolly, z: s.z, r: s.r * dolly, color: HOMES[i].color});
  }
  return {far, near};
}
