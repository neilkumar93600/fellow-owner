import React, {useLayoutEffect, useRef} from 'react';
import {random} from 'remotion';
import {PALETTES} from '../data';

// Clay sphere field on one <canvas>: perspective projection, far-to-near sort, pre-rendered matte sprites
// (lighting from web/components/landing/hero-field.tsx makeSprite) cached per colour x blur level x shadow.

export type Sphere3D = {x: number; y: number; z: number; r: number; color: string; alpha?: number};
export type Follower = {color: string; cluster: number; ux: number; uy: number; uz: number; size: number; seed: number};

type Rgb = readonly [number, number, number];
const TAU = Math.PI * 2;
const INK: Rgb = [45, 45, 48];
const WHITE: Rgb = [255, 255, 255];
const SR = 64; // sphere radius inside the sprite
const SC = 86; // sphere centre inside the base sprite (room for the contact shadow down-right)
const PAD = 32; // room for the largest blur
const SIZE = 192 + PAD * 2;
const BLUR_LEVELS = [0, 2, 5, 10];

const hexToRgb = (hex: string): Rgb => {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mixRgb = (a: Rgb, b: Rgb, t: number) => {
  const c = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${c(0)},${c(1)},${c(2)})`;
};
const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/** Matte clay: soft key light upper left, no specular spot, deeper terminator lower right, faint bounce, fine grain. */
function paintSphere(g: CanvasRenderingContext2D, hex: string, shadow: boolean) {
  const base = hexToRgb(hex);
  if (shadow) {
    const shx = SC + SR * 0.06;
    const shy = SC + SR * 0.4;
    const sh = g.createRadialGradient(shx, shy, SR * 0.3, shx, shy, SR * 1.18);
    sh.addColorStop(0, 'rgba(52, 54, 70, 0.16)');
    sh.addColorStop(1, 'rgba(52, 54, 70, 0)');
    g.fillStyle = sh;
    g.beginPath();
    g.arc(shx, shy, SR * 1.18, 0, TAU);
    g.fill();
  }
  const body = g.createRadialGradient(SC - SR * 0.42, SC - SR * 0.5, 0, SC - SR * 0.1, SC - SR * 0.14, SR * 1.2);
  body.addColorStop(0, mixRgb(base, WHITE, 0.24));
  body.addColorStop(0.3, mixRgb(base, WHITE, 0.1));
  body.addColorStop(0.62, mixRgb(base, INK, 0.02));
  body.addColorStop(0.84, mixRgb(base, INK, 0.16));
  body.addColorStop(1, mixRgb(base, INK, 0.3));
  g.fillStyle = body;
  g.beginPath();
  g.arc(SC, SC, SR, 0, TAU);
  g.fill();

  g.save();
  g.beginPath();
  g.arc(SC, SC, SR, 0, TAU);
  g.clip();
  const bx = SC + SR * 0.55;
  const by = SC + SR * 0.75;
  const bounce = g.createRadialGradient(bx, by, 0, bx, by, SR * 0.65);
  bounce.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
  bounce.addColorStop(1, 'rgba(255, 255, 255, 0)');
  g.fillStyle = bounce;
  g.fillRect(0, 0, 192, 192);
  g.restore();

  const image = g.getImageData(SC - SR, SC - SR, SR * 2, SR * 2);
  const data = image.data;
  // mulberry32 seeded by the colour: deterministic and cheap per pixel.
  let a = Number.parseInt(hex.slice(1), 16) >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let y = 0; y < SR * 2; y++) {
    for (let x = 0; x < SR * 2; x++) {
      const dx = x + 0.5 - SR;
      const dy = y + 0.5 - SR;
      if (dx * dx + dy * dy > (SR - 1) * (SR - 1)) continue;
      const i = (y * SR * 2 + x) * 4;
      const n = (rand() - 0.5) * 9;
      data[i] = clamp(data[i] + n, 0, 255);
      data[i + 1] = clamp(data[i + 1] + n, 0, 255);
      data[i + 2] = clamp(data[i + 2] + n, 0, 255);
    }
  }
  g.putImageData(image, SC - SR, SC - SR);
}

const sprites = new Map<string, HTMLCanvasElement>();

function sprite(hex: string, blur: number, shadow: boolean): HTMLCanvasElement {
  const key = `${hex}|${blur}|${shadow ? 1 : 0}`;
  const cached = sprites.get(key);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const g = canvas.getContext('2d');
  if (g) {
    if (blur === 0) {
      g.translate(PAD, PAD);
      paintSphere(g, hex, shadow);
    } else {
      g.filter = `blur(${blur}px)`;
      g.drawImage(sprite(hex, 0, shadow), 0, 0);
    }
  }
  sprites.set(key, canvas);
  return canvas;
}

export const SphereCanvas: React.FC<{
  spheres: Sphere3D[];
  width?: number;
  height?: number;
  focal?: number;
  focusZ?: number;
  dof?: number;
  cx?: number;
  cy?: number;
  shadow?: boolean;
  style?: React.CSSProperties;
}> = ({spheres, width = 1920, height = 1080, focal = 1200, focusZ = 0, dof = 0, cx = width / 2, cy = height / 2, shadow = false, style}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    g.clearRect(0, 0, width, height);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high'; // sprites are scaled down to the sphere radius; keep the minification smooth
    const order = spheres.filter((s) => s.z < focal - 50).sort((a, b) => a.z - b.z);
    for (const s of order) {
      const p = focal / (focal - s.z);
      const rr = s.r * p;
      if (rr < 0.3) continue;
      // Blur is the sharp sprite plus its cached blurred neighbour faded in on top, so a sphere moving through depth
      // never steps between blur levels.
      const raw = Math.min(BLUR_LEVELS[BLUR_LEVELS.length - 1], Math.abs(s.z - focusZ) * dof);
      const hi = Math.max(1, BLUR_LEVELS.findIndex((l) => l >= raw));
      const lo = hi - 1;
      const t = raw <= 0 ? 0 : (raw - BLUR_LEVELS[lo]) / (BLUR_LEVELS[hi] - BLUR_LEVELS[lo]);
      const k = rr / SR;
      const x = cx + s.x * p - (SC + PAD) * k;
      const y = cy + s.y * p - (SC + PAD) * k;
      const alpha = s.alpha ?? 1;
      g.globalAlpha = alpha;
      g.drawImage(sprite(s.color, BLUR_LEVELS[lo], shadow), x, y, SIZE * k, SIZE * k);
      if (t > 0) {
        g.globalAlpha = alpha * t;
        g.drawImage(sprite(s.color, BLUR_LEVELS[hi], shadow), x, y, SIZE * k, SIZE * k);
      }
    }
    g.globalAlpha = 1;
  });
  return <canvas ref={ref} width={width} height={height} style={{position: 'absolute', left: 0, top: 0, width, height, ...style}} />;
};

const WEIGHTS = [1.15, 0.95, 1, 0.9, 1.1, 0.85];
const WEIGHT_SUM = WEIGHTS.reduce((a, b) => a + b, 0);

/** Followers grouped by community weight, mostly in their community palette, gaussian-ish unit offsets. */
export function makeFollowers(count: number, seed: string): Follower[] {
  const out: Follower[] = [];
  for (let i = 0; i < count; i++) {
    const r = (k: string) => random(`${seed}-${i}-${k}`);
    let pick = r('cluster') * WEIGHT_SUM;
    let cluster = 0;
    while (cluster < WEIGHTS.length - 1 && pick > WEIGHTS[cluster]) {
      pick -= WEIGHTS[cluster];
      cluster++;
    }
    const roll = r('roll');
    const palette = roll > 0.92 ? 5 : roll > 0.88 ? Math.floor(r('cross') * PALETTES.length) : cluster;
    const gauss = (k: string) => clamp(Math.sqrt(-2 * Math.log(1 - r(`${k}a`))) * Math.cos(TAU * r(`${k}b`)) * 0.33, -0.9, 0.9);
    out.push({
      color: PALETTES[palette][Math.floor(r('shade') * 4)],
      cluster,
      ux: gauss('x'),
      uy: gauss('y'),
      uz: gauss('z'),
      size: 0.55 + r('size') * 0.9,
      seed: r('seed'),
    });
  }
  return out;
}
