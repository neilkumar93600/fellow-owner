'use client';

import { useEffect, useRef } from 'react';
import styles from './hero.module.css';
import { getIntroState, INTRO_PLAY_EVENT } from './hero-intro';

/*
 * Hero follower field: ~400 matte clay spheres (150 on phones) in a perspective volume, depth-sorted every
 * frame. They drift in from the edges, gather into six community clusters around the headline, breathe and
 * slowly turn, lean toward a mouse pointer (max 12px), and the camera dollies through them as the hero
 * scrolls away. Spheres are pre-rendered sprites, so a frame is one sort plus drawImage calls.
 * Decorative: the sub-line says the same thing in words.
 */

type Rgb = readonly [number, number, number];

const TAU = Math.PI * 2;
const INK: Rgb = [45, 45, 48];
const WHITE: Rgb = [255, 255, 255];

/** Six community palettes, in demo-data order. Strong tint first, then lighter and deeper variants. */
const PALETTES: readonly (readonly string[])[] = [
  ['#5ccfdc', '#8edde6', '#b4eaf0', '#2fbccc'], // Builders: aqua
  ['#b79cff', '#cbb8ff', '#9f7ef6', '#ddd1ff'], // Designers: lavender
  ['#f2a93b', '#f6bd66', '#f9d196', '#ee9b2c'], // Investors & Operators: light orange
  ['#ffc7a3', '#ffd8bb', '#f8b58c', '#ffe6c4'], // Music & Creators: peach
  ['#e3f77f', '#cfec66', '#b8d94a', '#effbb3'], // Fitness Crew: lime
  ['#f8f7f3', '#ececee', '#fbf6ea', '#e2e2e6'], // Local Impact: soft white
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

/** Matte clay sphere: broad highlight top-left, base colour, slightly darker rim, faint bounce light. */
function makeSprite(hex: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE;
  canvas.height = SPRITE;
  const g = canvas.getContext('2d');
  if (!g) return canvas;
  const base = hexToRgb(hex);

  const shx = SC + SR * 0.14;
  const shy = SC + SR * 0.3;
  const shadow = g.createRadialGradient(shx, shy, SR * 0.35, shx, shy, SR * 1.2);
  shadow.addColorStop(0, 'rgba(52, 54, 70, 0.13)');
  shadow.addColorStop(1, 'rgba(52, 54, 70, 0)');
  g.fillStyle = shadow;
  g.beginPath();
  g.arc(shx, shy, SR * 1.2, 0, TAU);
  g.fill();

  const body = g.createRadialGradient(
    SC - SR * 0.36,
    SC - SR * 0.42,
    SR * 0.04,
    SC - SR * 0.12,
    SC - SR * 0.14,
    SR * 1.18,
  );
  body.addColorStop(0, mix(base, WHITE, 0.62));
  body.addColorStop(0.26, mix(base, WHITE, 0.3));
  body.addColorStop(0.6, mix(base, WHITE, 0.02));
  body.addColorStop(0.86, mix(base, INK, 0.09));
  body.addColorStop(1, mix(base, INK, 0.2));
  g.fillStyle = body;
  g.beginPath();
  g.arc(SC, SC, SR, 0, TAU);
  g.fill();

  g.save();
  g.beginPath();
  g.arc(SC, SC, SR, 0, TAU);
  g.clip();
  const bx = SC + SR * 0.6;
  const by = SC + SR * 0.7;
  const bounce = g.createRadialGradient(bx, by, 0, bx, by, SR * 0.7);
  bounce.addColorStop(0, 'rgba(255, 255, 255, 0.16)');
  bounce.addColorStop(1, 'rgba(255, 255, 255, 0)');
  g.fillStyle = bounce;
  g.fillRect(0, 0, SPRITE, SPRITE);
  g.restore();
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

/** Moves a cluster centre out of the text block (plus padding) by the shortest move that stays on stage. */
function pushOut(sx: number, sy: number, radius: number, box: Box, w: number, h: number) {
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
    if (nx < -0.04 * w || nx > 1.04 * w || ny < 0.04 * h || ny > 1.04 * h) continue;
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
    let reduced = reducedQuery.matches;

    const sprites = PALETTES.flatMap((palette) => palette.map(makeSprite));

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

    /** The text block's box in stage coordinates, without the scroll shift. */
    const measureBox = (): Box => {
      const stageRect = stage.getBoundingClientRect();
      const box: Box = { l: Number.POSITIVE_INFINITY, t: Number.POSITIVE_INFINITY, r: -1, b: -1 };
      for (const el of section.querySelectorAll<HTMLElement>('[data-hero-measure]')) {
        const rect = el.getBoundingClientRect();
        box.l = Math.min(box.l, rect.left - stageRect.left);
        box.r = Math.max(box.r, rect.right - stageRect.left);
        box.t = Math.min(box.t, rect.top - stageRect.top - contentShift);
        box.b = Math.max(box.b, rect.bottom - stageRect.top - contentShift);
      }
      if (box.r < 0) return { l: width * 0.2, r: width * 0.8, t: height * 0.25, b: height * 0.75 };
      return box;
    };

    const layout = () => {
      const box = measureBox();
      const aspect = width / height;
      const anchors = aspect >= 1.2 ? WIDE : aspect >= 0.85 ? MID : TALL;
      const short = Math.min(width, height);
      const zoom = width < 640 ? 1.3 : 1;
      const cueShown = Boolean(cue && cue.offsetParent !== null);
      const unit = clamp(short / 900, 0.55, 1.25) * zoom;
      focal = Math.max(width, height) * 0.95;

      clusters = anchors.map((a, i) => {
        const spread = a.spread * short * zoom;
        const u = cueShown && a.uCue !== undefined ? a.uCue : a.u;
        const [sx, sy] = pushOut(
          u * width,
          a.v * height,
          (spread * 0.5) / a.depth,
          box,
          width,
          height,
        );
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

    /** Scroll progress through the hero: 0 at the top, 1 once it has fully left the viewport. */
    const progress = () => {
      if (reduced) return 0;
      const rect = section.getBoundingClientRect();
      return clamp(-rect.top / Math.max(1, rect.height), 0, 1);
    };

    const draw = (now: number) => {
      const t = now / 1000;
      const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      const p = progress();
      const still = reduced;

      // Hand-off: content lifts and fades, the field holds back a little while the camera pushes in.
      if (content && p !== lastProgress) {
        if (p <= 0) {
          content.style.removeProperty('opacity');
          content.style.removeProperty('transform');
          cue?.style.removeProperty('opacity');
          contentShift = 0;
        } else {
          contentShift = -p * 56;
          content.style.opacity = String(1 - smoothstep(0.12, 0.6, p));
          content.style.transform = `translate3d(0, ${contentShift.toFixed(1)}px, 0)`;
          if (cue) cue.style.opacity = String(1 - smoothstep(0, 0.12, p));
        }
        lastProgress = p;
      }

      ctx.clearRect(0, 0, width, height);
      const fadeAll = 1 - smoothstep(0.3, 0.86, p);
      if (fadeAll <= 0.002) return;
      const camZ = focal * 0.95 * p ** 1.3;
      const yShift = p * height * 0.26;
      const cx = width / 2;
      const cy = height / 2;
      const ease = 1 - Math.exp(-dt * 3.2);

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
        let hx = c.x + ox * cosA[k] - oz * sinA[k] + c.leanX * c.depth;
        let hy = c.y + oy + (bob[k] + c.leanY) * c.depth;
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
        if (zr < focal * 0.06) {
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
        // Atmospheric perspective: far followers sink into the shell; near ones fade as the camera passes.
        alpha *= clamp(1.2 - (depthRatio - 1) * 0.55, 0.5, 1);
        alpha *= smoothstep(0.08, 0.34, depthRatio) * fadeAll;
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
        if (content) {
          content.style.removeProperty('opacity');
          content.style.removeProperty('transform');
        }
        contentShift = 0;
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
      if (content) {
        content.style.removeProperty('opacity');
        content.style.removeProperty('transform');
      }
      cue?.style.removeProperty('opacity');
    };
  }, []);

  return (
    <div ref={fieldRef} className={styles.field} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
