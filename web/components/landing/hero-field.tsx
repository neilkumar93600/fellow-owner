'use client';

import { useEffect, useRef } from 'react';
import styles from './hero.module.css';
import { getIntroState, INTRO_PLAY_EVENT } from './hero-intro';

/*
 * Hero follower field: ~400 matte clay spheres (150 on phones) in a perspective volume, depth-sorted every
 * frame. They drift in from the edges, gather into six community clusters around the headline, breathe and
 * slowly turn, and lean toward a mouse pointer (max 12px). As the hero scrolls away the clusters draw in
 * toward the visible centre and the camera flies through them one by one, so the shell stays populated
 * until it leaves. Spheres are pre-rendered sprites, so a frame is one sort plus drawImage calls.
 * Decorative: the sub-line says the same thing in words.
 */

type Rgb = readonly [number, number, number];

const TAU = Math.PI * 2;
const INK: Rgb = [45, 45, 48];
const WHITE: Rgb = [255, 255, 255];

/**
 * Six community palettes, in demo-data order. Strong tint first, then lighter and deeper variants. The same
 * clay family as the loop scene's frames (teal #6FB8C4, lavender #C9A9E8, orange #E8955A, pink #E9A0A0,
 * sand #D8C79C, white #EDEDEA), kept a step lighter so the clusters stay pastel on the shell.
 */
const PALETTES: readonly (readonly string[])[] = [
  ['#76c3cf', '#98d3dc', '#b9e3e8', '#5bb0bd'], // Builders: aqua
  ['#c4a6ef', '#d4c0f4', '#b192e6', '#e2d5f8'], // Designers: lavender
  ['#eda266', '#f2b884', '#f6cba4', '#e48f51'], // Investors & Operators: light orange
  ['#f2b5a2', '#f7c8b8', '#eba390', '#fadccf'], // Music & Creators: peach
  ['#d9ea8c', '#cadf78', '#b8cf66', '#e6f1b1'], // Fitness Crew: lime
  ['#f0efeb', '#e6e4dd', '#f6f5f1', '#ddd5c2'], // Local Impact: soft white and sand
];
const WHITE_PALETTE = 5;

/** Relative share of followers per community. */
const WEIGHTS = [1.15, 0.95, 1, 0.9, 1.1, 0.85];

interface Anchor {
  /** Screen position as a fraction of the stage. */
  u: number;
  v: number;
  /** Distance from the camera, 1 = the screen plane. */
  depth: number;
  /** Cluster size as a fraction of the stage's short side. */
  spread: number;
  /** Turn direction. */
  spin: 1 | -1;
  /** Horizontal position to use instead of u while the scroll cue is shown (keeps the cue clear). */
  uCue?: number;
  /** Placed by hand in a side gutter: never pushed out of the text block. */
  free?: boolean;
}

/** Landscape: around the headline and in the lower third. */
const WIDE: Anchor[] = [
  { u: 0.105, v: 0.3, depth: 1, spread: 0.19, spin: 1 },
  { u: 0.885, v: 0.27, depth: 1.3, spread: 0.17, spin: -1 },
  { u: 0.935, v: 0.7, depth: 0.84, spread: 0.2, spin: 1 },
  { u: 0.7, v: 0.93, depth: 1.2, spread: 0.15, spin: -1 },
  { u: 0.085, v: 0.8, depth: 0.88, spread: 0.2, spin: -1 },
  { u: 0.3, v: 0.95, depth: 1.45, spread: 0.15, spin: 1 },
];

/** Near-square (tablet landscape, small laptops). */
const MID: Anchor[] = [
  { u: 0.09, v: 0.22, depth: 1.05, spread: 0.18, spin: 1 },
  { u: 0.9, v: 0.17, depth: 1.3, spread: 0.15, spin: -1 },
  { u: 0.94, v: 0.62, depth: 0.86, spread: 0.18, spin: 1 },
  { u: 0.68, v: 0.92, depth: 1.15, spread: 0.15, spin: -1 },
  { u: 0.07, v: 0.8, depth: 0.9, spread: 0.18, spin: -1 },
  { u: 0.32, v: 0.95, depth: 1.4, spread: 0.13, spin: 1 },
];

/** Portrait (phones, tablets): three small clusters above the headline, three in the lower third. */
const TALL: Anchor[] = [
  { u: 0.16, v: 0.17, depth: 1.05, spread: 0.19, spin: 1 },
  { u: 0.85, v: 0.16, depth: 1.25, spread: 0.18, spin: -1 },
  { u: 0.88, v: 0.86, depth: 0.82, spread: 0.21, spin: 1 },
  { u: 0.5, v: 0.93, uCue: 0.63, depth: 1.15, spread: 0.17, spin: -1 },
  { u: 0.13, v: 0.865, depth: 0.95, spread: 0.2, spin: -1 },
  { u: 0.5, v: 0.13, depth: 1.6, spread: 0.14, spin: 1 },
];

/**
 * Short phones (about 375 x 667): the copy fills most of the stage, so the clusters sit in the corners
 * beside the eyebrow, in the side gutters at the headline and sub-line, and in the band below the CTAs.
 * Nothing sits under the navbar.
 */
const SHORT: Anchor[] = [
  { u: 0.075, v: 0.2, depth: 1.25, spread: 0.11, spin: 1, free: true },
  { u: 0.935, v: 0.21, depth: 1.35, spread: 0.1, spin: -1, free: true },
  { u: 1.045, v: 0.56, depth: 0.92, spread: 0.15, spin: 1, free: true },
  { u: 0.74, v: 0.985, depth: 0.88, spread: 0.18, spin: -1 },
  { u: -0.04, v: 0.4, depth: 1, spread: 0.15, spin: -1, free: true },
  { u: 0.26, v: 0.975, depth: 1.05, spread: 0.16, spin: 1 },
];

interface Sphere {
  /** Community index. */
  cluster: number;
  /** Unit offsets inside the cluster (gaussian). */
  nx: number;
  ny: number;
  nz: number;
  /** Radius factor 0..1 (power distributed), or above 1 for the few large ones. */
  size: number;
  sprite: number;
  /** Intro timing, ms. */
  delay: number;
  dur: number;
  /** Where it drifts in from: angle jitter, distance (x the stage's long side), extra depth. */
  fromAngle: number;
  fromDist: number;
  fromDepth: number;
  /** Idle wobble. */
  wobA: number;
  wobF: number;
  wobP: number;
  /* Layout-derived (world units; 1 unit = 1 CSS px on the screen plane). */
  r: number;
  fx: number;
  fy: number;
  fz: number;
}

interface Cluster {
  x: number;
  y: number;
  z: number;
  sx: number;
  sy: number;
  depth: number;
  spread: number;
  spin: number;
  phase: number;
  leanX: number;
  leanY: number;
}

interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

/* ---------- helpers ---------- */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

function smoothstep(a: number, b: number, v: number) {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

function hexToRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: Rgb, b: Rgb, t: number): string {
  const c = (i: number) => Math.round(a[i] + (b[i] - a[i]) * t);
  return `rgb(${c(0)},${c(1)},${c(2)})`;
}

/* ---------- sprites ---------- */

const SPRITE = 192;
const SR = 64; // sphere radius inside the sprite
const SC = 86; // sphere centre inside the sprite (room for the soft shadow down-right)

/**
 * Matte clay sphere, lit like the loop scene's renders: one soft key light from the upper left with a broad,
 * low-contrast falloff (no specular spot), a deeper terminator toward the lower right, a faint bounce light,
 * a fine clay grain, and a soft contact shadow below.
 */
function makeSprite(hex: string, seed: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE;
  canvas.height = SPRITE;
  const g = canvas.getContext('2d');
  if (!g) return canvas;
  const base = hexToRgb(hex);

  const shx = SC + SR * 0.06;
  const shy = SC + SR * 0.4;
  const shadow = g.createRadialGradient(shx, shy, SR * 0.3, shx, shy, SR * 1.18);
  shadow.addColorStop(0, 'rgba(52, 54, 70, 0.16)');
  shadow.addColorStop(1, 'rgba(52, 54, 70, 0)');
  g.fillStyle = shadow;
  g.beginPath();
  g.arc(shx, shy, SR * 1.18, 0, TAU);
  g.fill();

  const body = g.createRadialGradient(
    SC - SR * 0.42,
    SC - SR * 0.5,
    0,
    SC - SR * 0.1,
    SC - SR * 0.14,
    SR * 1.2,
  );
  body.addColorStop(0, mix(base, WHITE, 0.3));
  body.addColorStop(0.3, mix(base, WHITE, 0.15));
  body.addColorStop(0.62, mix(base, WHITE, 0.01));
  body.addColorStop(0.84, mix(base, INK, 0.12));
  body.addColorStop(1, mix(base, INK, 0.24));
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
  g.fillRect(0, 0, SPRITE, SPRITE);
  g.restore();

  // Clay grain: a little luminance noise inside the sphere (it only shows on the near, large spheres).
  const image = g.getImageData(SC - SR, SC - SR, SR * 2, SR * 2);
  const data = image.data;
  const rand = mulberry32(seed);
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
  return canvas;
}

/* ---------- followers ---------- */

function countFor(width: number) {
  if (width < 640) return 150;
  if (width < 1024) return 260;
  return 400;
}

function buildSpheres(count: number): Sphere[] {
  const rand = mulberry32(0x5eed + count);
  const gauss = () => {
    const u = 1 - rand();
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
  };
  const total = WEIGHTS.reduce((sum, w) => sum + w, 0);
  const spheres: Sphere[] = [];

  for (let i = 0; i < count; i++) {
    let pick = rand() * total;
    let cluster = 0;
    while (cluster < WEIGHTS.length - 1 && pick > WEIGHTS[cluster]) {
      pick -= WEIGHTS[cluster];
      cluster++;
    }
    // Mostly the community's own colour; a few soft whites and a few cross-interest members.
    const roll = rand();
    let palette = cluster;
    if (roll > 0.92) palette = WHITE_PALETTE;
    else if (roll > 0.88) palette = Math.floor(rand() * PALETTES.length);
    const sprite = palette * 4 + Math.floor(rand() * 4);
    const big = rand() < 0.045;

    spheres.push({
      cluster,
      nx: clamp(gauss() * 0.33, -0.9, 0.9),
      ny: clamp(gauss() * 0.33, -0.9, 0.9),
      nz: clamp(gauss() * 0.33, -0.9, 0.9),
      size: big ? 1.15 + rand() * 0.55 : rand() ** 1.7,
      sprite,
      delay: rand() * 650 + cluster * 70,
      dur: 2300 + rand() * 900,
      fromAngle: (rand() - 0.5) * 1.3,
      fromDist: 0.34 + rand() * 0.42,
      fromDepth: rand() * 0.35,
      wobA: 1.5 + rand() * 3.5,
      wobF: TAU / (5 + rand() * 6),
      wobP: rand() * TAU,
      r: 0,
      fx: 0,
      fy: 0,
      fz: 0,
    });
  }
  return spheres;
}

/**
 * Moves a cluster centre out of the text block (plus padding) by the shortest move that stays on stage and
 * below the navbar band (minY).
 */
function pushOut(
  sx: number,
  sy: number,
  radius: number,
  box: Box,
  w: number,
  h: number,
  minY: number,
) {
  const pad = 20;
  const nearestX = clamp(sx, box.l, box.r);
  const nearestY = clamp(sy, box.t, box.b);
  if (Math.hypot(sx - nearestX, sy - nearestY) >= radius + pad) return [sx, sy] as const;
  const moves: [number, number][] = [
    [box.l - pad - radius - sx, 0],
    [box.r + pad + radius - sx, 0],
    [0, box.t - pad - radius - sy],
    [0, box.b + pad + radius - sy],
  ];
  let best: [number, number] | null = null;
  for (const [dx, dy] of moves) {
    const nx = sx + dx;
    const ny = sy + dy;
    if (nx < -0.04 * w || nx > 1.04 * w || ny < Math.max(0.04 * h, minY) || ny > 1.04 * h) continue;
    if (!best || Math.abs(dx) + Math.abs(dy) < Math.abs(best[0]) + Math.abs(best[1]))
      best = [dx, dy];
  }
  return best ? ([sx + best[0], sy + best[1]] as const) : ([sx, sy] as const);
}

export function HeroField() {
  const fieldRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    const canvas = canvasRef.current;
    const stage = field?.parentElement;
    const section = field?.closest('section');
    const ctx = canvas?.getContext('2d', { alpha: true });
    if (!field || !canvas || !stage || !section || !ctx) return;
    const content = section.querySelector<HTMLElement>('[data-hero-content]');
    const cue = section.querySelector<HTMLElement>('[data-hero-cue]');

    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    /** Same query as the short-phone rule in hero.module.css. */
    const shortQuery = window.matchMedia('(max-width: 639px) and (max-height: 760px)');
    let reduced = reducedQuery.matches;

    const sprites = PALETTES.flatMap((palette, k) =>
      palette.map((hex, j) => makeSprite(hex, 0x51ab + k * 4 + j)),
    );

    let width = 0;
    let height = 0;
    let focal = 1;
    let spheres: Sphere[] = [];
    let clusters: Cluster[] = [];
    let px = new Float32Array(0);
    let py = new Float32Array(0);
    let pr = new Float32Array(0);
    let pa = new Float32Array(0);
    let pz = new Float32Array(0);
    let order: number[] = [];

    let introStart = Number.POSITIVE_INFINITY;
    let settled = false; // skip the gather (reduced motion, or rebuilt after a resize)
    let pointerX = 0;
    let pointerY = 0;
    let pointerActive = false;
    let contentShift = 0;
    let lastProgress = -1;
    let lastTime = performance.now();
    /** Stage y (at scroll 0) of the navbar's bottom edge plus 16px; spheres above it fade on phones. */
    let navLine = 0;
    let navFade = false;
    let stageScale = 1;

    /** The text block's box in stage coordinates, without the scroll shift. */
    const measureBox = (): Box => {
      const stageRect = stage.getBoundingClientRect();
      const k = stageScale || 1;
      const box: Box = { l: Number.POSITIVE_INFINITY, t: Number.POSITIVE_INFINITY, r: -1, b: -1 };
      for (const el of section.querySelectorAll<HTMLElement>('[data-hero-measure]')) {
        const rect = el.getBoundingClientRect();
        box.l = Math.min(box.l, (rect.left - stageRect.left) / k);
        box.r = Math.max(box.r, (rect.right - stageRect.left) / k);
        box.t = Math.min(box.t, (rect.top - stageRect.top) / k - contentShift);
        box.b = Math.max(box.b, (rect.bottom - stageRect.top) / k - contentShift);
      }
      if (box.r < 0) return { l: width * 0.2, r: width * 0.8, t: height * 0.25, b: height * 0.75 };
      return box;
    };

    const layout = () => {
      const box = measureBox();
      const aspect = width / height;
      const navSpace =
        Number.parseFloat(getComputedStyle(section).getPropertyValue('--nav-space')) || 72;
      navLine = navSpace + 16 - stage.offsetTop;
      navFade = width < 1024;
      // Short phones: hero.module.css lifts the copy under the bar there, so the gutter layout takes over.
      const anchors =
        aspect >= 1.2 ? WIDE : aspect >= 0.85 ? MID : shortQuery.matches ? SHORT : TALL;
      const short = Math.min(width, height);
      const zoom = width < 640 ? 1.3 : 1;
      const cueShown = Boolean(cue && cue.offsetParent !== null);
      const unit = clamp(short / 900, 0.55, 1.25) * zoom;
      focal = Math.max(width, height) * 0.95;

      clusters = anchors.map((a, i) => {
        const spread = a.spread * short * zoom;
        const u = cueShown && a.uCue !== undefined ? a.uCue : a.u;
        const radius = (spread * 0.5) / a.depth;
        const [sx, sy] = a.free
          ? [u * width, a.v * height]
          : pushOut(u * width, a.v * height, radius, box, width, height, navLine + radius * 0.6);
        return {
          x: (sx - width / 2) * a.depth,
          y: (sy - height / 2) * a.depth,
          z: a.depth * focal,
          sx,
          sy,
          depth: a.depth,
          spread,
          spin: a.spin,
          phase: i * 1.73,
          leanX: 0,
          leanY: 0,
        };
      });

      const long = Math.max(width, height);
      for (const s of spheres) {
        const c = clusters[s.cluster];
        s.r = unit * (s.size > 1 ? 10 + s.size * 12 : 4.4 + s.size * 13);
        // Drift in from beyond the nearest edges, outward along the cluster's direction from the centre.
        const angle = Math.atan2(c.sy - height / 2, c.sx - width / 2) + s.fromAngle;
        const dist = s.fromDist * long;
        const fromDepth = c.depth * (1 + s.fromDepth);
        s.fx = (c.sx + Math.cos(angle) * dist - width / 2) * fromDepth;
        s.fy = (c.sy + Math.sin(angle) * dist - height / 2) * fromDepth;
        s.fz = fromDepth * focal;
      }
    };

    const resize = () => {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      if (!w || !h) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (countFor(w) !== spheres.length) {
        const fresh = spheres.length === 0;
        spheres = buildSpheres(countFor(w));
        const n = spheres.length;
        px = new Float32Array(n);
        py = new Float32Array(n);
        pr = new Float32Array(n);
        pa = new Float32Array(n);
        pz = new Float32Array(n);
        order = Array.from({ length: n }, (_, i) => i);
        if (!fresh) settled = true;
      }
      width = w;
      height = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      layout();
      lastProgress = -1;
      if (reduced || !running) draw(performance.now());
    };

    /** Hero scroll state: px scrolled past its top, and that as a fraction (1 once it has left). */
    let scrolled = 0;
    const progress = () => {
      if (reduced) {
        scrolled = 0;
        return 0;
      }
      const rect = section.getBoundingClientRect();
      scrolled = clamp(-rect.top, 0, rect.height);
      return scrolled / Math.max(1, rect.height);
    };

    const resetHandOff = () => {
      content?.style.removeProperty('opacity');
      content?.style.removeProperty('transform');
      stage.style.removeProperty('scale');
      cue?.style.removeProperty('opacity');
      cue?.removeAttribute('data-off');
      contentShift = 0;
      stageScale = 1;
    };

    const draw = (now: number) => {
      const t = now / 1000;
      const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      const p = progress();
      const still = reduced;

      // Hand-off: the copy holds until the fly-through is under way, then lifts and fades; the shell
      // recedes slightly (scale 1 to 0.94 about its lower edge) as it leaves.
      if (p !== lastProgress) {
        if (p <= 0) {
          resetHandOff();
        } else {
          contentShift = -p * 56;
          stageScale = 1 - 0.06 * smoothstep(0.08, 1, p);
          stage.style.scale = stageScale.toFixed(4);
          if (content) {
            content.style.opacity = String(1 - smoothstep(0.35, 0.7, p));
            content.style.transform = `translate3d(0, ${contentShift.toFixed(1)}px, 0)`;
          }
          if (cue) {
            cue.style.opacity = String(1 - smoothstep(0, 0.12, p));
            cue.toggleAttribute('data-off', p >= 0.12);
          }
        }
        lastProgress = p;
      }

      ctx.clearRect(0, 0, width, height);
      const fadeAll = 1 - smoothstep(0.86, 0.99, p);
      if (fadeAll <= 0.002) return;
      // Fly-through: the clusters draw in toward the centre of the visible part of the shell while the
      // camera travels past all of them (nearest first), so spheres keep crossing the view until the end.
      const camZ = focal * 1.32 * smoothstep(0.04, 1, p);
      const conv = 1 - 0.9 * smoothstep(0.02, 0.55, p);
      const yShift = scrolled * 0.5;
      const cx = width / 2;
      const cy = height / 2;
      const ease = 1 - Math.exp(-dt * 3.2);
      const short = Math.min(width, height);
      const bigFrom = short * 0.24;
      const bigTo = short * 0.34;
      const navY = navLine + scrolled;

      const cosA: number[] = [];
      const sinA: number[] = [];
      const breath: number[] = [];
      const bob: number[] = [];
      for (const c of clusters) {
        const angle = still ? c.phase : c.phase + (t * c.spin * TAU) / 70;
        cosA.push(Math.cos(angle));
        sinA.push(Math.sin(angle));
        breath.push(still ? 1 : 1 + 0.045 * Math.sin((t * TAU) / 6.5 + c.phase));
        bob.push(still ? 0 : Math.sin((t * TAU) / 9 + c.phase) * 4);
        // Lean toward the pointer: up to 12px on screen, eased, more for nearer clusters.
        let tx = 0;
        let ty = 0;
        if (pointerActive && !still) {
          const dx = pointerX * width - c.sx;
          const dy = pointerY * height - c.sy;
          const dist = Math.hypot(dx, dy) || 1;
          const amount = 12 * Math.min(1, dist / 360) * clamp(1.05 / c.depth, 0.6, 1);
          tx = (dx / dist) * amount;
          ty = (dy / dist) * amount;
        }
        c.leanX += (tx - c.leanX) * ease;
        c.leanY += (ty - c.leanY) * ease;
      }

      let visible = 0;
      for (let i = 0; i < spheres.length; i++) {
        const s = spheres[i];
        const k = s.cluster;
        const c = clusters[k];
        // Home: the cluster turns about its vertical axis, breathes, bobs and leans.
        const spread = c.spread * breath[k];
        const ox = s.nx * spread;
        const oy = s.ny * spread;
        const oz = s.nz * spread * 0.9;
        let hx = c.x * conv + ox * cosA[k] - oz * sinA[k] + c.leanX * c.depth;
        let hy = c.y * conv + oy + (bob[k] + c.leanY) * c.depth;
        const hz = c.z + ox * sinA[k] + oz * cosA[k];
        if (!still) {
          hx += s.wobA * Math.sin(t * s.wobF + s.wobP);
          hy += s.wobA * Math.cos(t * s.wobF * 0.83 + s.wobP);
        }

        let x = hx;
        let y = hy;
        let z = hz;
        let alpha = 1;
        if (!settled) {
          const local = clamp((now - introStart - s.delay) / s.dur, 0, 1);
          if (local <= 0) {
            pa[i] = 0;
            continue;
          }
          const e = 1 - (1 - local) ** 4;
          x = s.fx + (hx - s.fx) * e;
          y = s.fy + (hy - s.fy) * e;
          z = s.fz + (hz - s.fz) * e;
          alpha = smoothstep(0, 0.4, local);
        }

        const zr = z - camZ;
        if (zr < focal * 0.05) {
          pa[i] = 0;
          continue;
        }
        const scale = focal / zr;
        const radius = s.r * scale;
        const sx = cx + x * scale;
        const sy = cy + y * scale + yShift;
        if (
          sx + radius * 2 < 0 ||
          sx - radius * 2 > width ||
          sy + radius * 2 < 0 ||
          sy - radius * 2 > height
        ) {
          pa[i] = 0;
          continue;
        }
        const depthRatio = zr / focal;
        // Atmospheric perspective: far followers sink into the shell; the nearest fade only once they are
        // large and about to pass the camera, so the fly-through reads.
        alpha *= clamp(1.2 - (depthRatio - 1) * 0.55, 0.5, 1);
        alpha *= smoothstep(0.075, 0.14, depthRatio) * fadeAll;
        if (radius > bigFrom) alpha *= 1 - smoothstep(bigFrom, bigTo, radius);
        // Phones and tablets: keep the transparent navbar's controls clear.
        if (navFade && sy < navY) alpha *= 0.12 + 0.88 * smoothstep(navY - 24, navY, sy);
        px[i] = sx;
        py[i] = sy;
        pr[i] = radius;
        pz[i] = zr;
        pa[i] = alpha;
        if (alpha > 0.004) visible++;
      }

      if (!visible) return;
      order.sort((a, b) => pz[b] - pz[a]);
      for (const i of order) {
        const alpha = pa[i];
        if (alpha <= 0.004) continue;
        const k = pr[i] / SR;
        const size = SPRITE * k;
        ctx.globalAlpha = alpha > 1 ? 1 : alpha;
        ctx.drawImage(sprites[spheres[i].sprite], px[i] - SC * k, py[i] - SC * k, size, size);
      }
      ctx.globalAlpha = 1;
    };

    /* ---------- loop: only while the hero is on screen and the tab is visible ---------- */
    let running = false;
    let frameId = 0;
    let inView = true;
    const tick = (now: number) => {
      if (!running) return;
      draw(now);
      frameId = requestAnimationFrame(tick);
    };
    const updateLoop = () => {
      const should = !reduced && inView && document.visibilityState === 'visible';
      if (should && !running) {
        running = true;
        lastTime = performance.now();
        frameId = requestAnimationFrame(tick);
      } else if (!should && running) {
        running = false;
        cancelAnimationFrame(frameId);
      }
    };

    /* ---------- intro: gather starts ~1.1s after the headline begins, as the canvas fades in ---------- */
    let readyTimer = 0;
    let failsafe = 0;
    const begin = (at: number) => {
      if (introStart !== Number.POSITIVE_INFINITY) return;
      introStart = at;
      window.clearTimeout(failsafe);
      readyTimer = window.setTimeout(
        () => field.setAttribute('data-ready', ''),
        Math.max(0, at - performance.now()),
      );
    };
    const onPlay = () => begin(performance.now() + 1100);

    const applyMotionPreference = () => {
      reduced = reducedQuery.matches;
      if (reduced) {
        settled = true;
        field.setAttribute('data-static', '');
        field.setAttribute('data-ready', '');
        resetHandOff();
        lastProgress = -1;
        draw(performance.now());
      } else {
        field.removeAttribute('data-static');
      }
      updateLoop();
    };

    resize();
    if (reduced) {
      applyMotionPreference();
    } else {
      const intro = getIntroState();
      if (intro.phase === 'pending') {
        window.addEventListener(INTRO_PLAY_EVENT, onPlay, { once: true });
        failsafe = window.setTimeout(() => begin(performance.now()), 5200);
      } else if (intro.phase === 'playing') {
        begin(intro.at + 1100);
      } else {
        begin(performance.now() + 120);
      }
    }

    const resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(stage);
    const intersection = new IntersectionObserver(
      ([entry]) => {
        inView = Boolean(entry?.isIntersecting);
        updateLoop();
      },
      { threshold: 0 },
    );
    intersection.observe(section);
    const onVisibility = () => updateLoop();
    document.addEventListener('visibilitychange', onVisibility);
    reducedQuery.addEventListener('change', applyMotionPreference);
    document.fonts?.ready.then(() => {
      if (width) layout();
    });

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || !finePointer.matches) return;
      const rect = stage.getBoundingClientRect();
      pointerX = (event.clientX - rect.left) / Math.max(1, rect.width);
      pointerY = (event.clientY - rect.top) / Math.max(1, rect.height);
      pointerActive = true;
    };
    const onPointerLeave = () => {
      pointerActive = false;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);

    updateLoop();

    return () => {
      running = false;
      cancelAnimationFrame(frameId);
      window.clearTimeout(readyTimer);
      window.clearTimeout(failsafe);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      reducedQuery.removeEventListener('change', applyMotionPreference);
      window.removeEventListener(INTRO_PLAY_EVENT, onPlay);
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      resetHandOff();
    };
  }, []);

  return (
    <div ref={fieldRef} className={styles.field} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
