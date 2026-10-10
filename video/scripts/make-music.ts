// Run: node scripts/make-music.ts  ->  public/audio/music.wav
// Procedural temp track for the launch video (no samples, no license risk). Node built-ins only, fully deterministic.
// Bar lines come from src/timeline.ts, so the music and the scene cuts always agree. Swap public/audio/music.wav
// for a licensed track later; nothing else references this script.
import { mkdirSync, writeFileSync } from 'node:fs';
import { BAR, BPM, DURATION, FPS, START, TOTAL, type SceneId } from '../src/timeline.ts';

const SR = 44100;
const TAU = Math.PI * 2;
const TAIL = 1.5;
const N = Math.round((TOTAL / FPS + TAIL) * SR);
const SPB = 60 / BPM; // seconds per beat
const SPBAR = BAR / FPS; // seconds per bar
const bar = (id: SceneId) => START[id] / BAR;
const at = (b: number, beat = 0) => b * SPBAR + beat * SPB; // seconds
const db = (x: number) => 10 ** (x / 20);
const midi = (m: number) => 440 * 2 ** ((m - 69) / 12);

// Mix levels in dB (relative; the master is normalised to -1 dBFS at the end).
const G = { pad: -14, kick: -9, clap: -14, hat: -20, bass: -12, pluck: -16, ping: -24, riser: -20, impact: -10 };

// ---------- bars of interest, all derived from the timeline ----------
const HOOK = bar('Hook'); // 0
const PROBLEM = bar('Problem'); // 4
const SOLUTION = bar('Solution'); // 10
const DEMO = bar('FanJoin'); // 18
const CHAPTERS = [bar('Triage'), bar('Today'), bar('Build')]; // 23, 27, 31
const OUTRO = bar('Outro'); // 38
const END = TOTAL / BAR; // 42
const DROP0 = at(SOLUTION - 1, 2); // last two beats of the bar before Solution: everything but a swell drops out
const DROP1 = at(SOLUTION);
const live = (t: number) => t < DROP0 || t >= DROP1;

// ---------- small DSP helpers ----------
function rng(seed: number) {
  let a = seed >>> 0; // mulberry32
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const noise = (seed: number, n: number) => {
  const r = rng(seed);
  return Float32Array.from({ length: n }, () => r() * 2 - 1);
};
const norm = (x: Float32Array) => {
  let p = 0;
  for (const v of x) p = Math.max(p, Math.abs(v));
  return x.map((v) => v / (p || 1));
};
const taper = (x: Float32Array, sec: number) => {
  const n = Math.min(x.length, Math.round(sec * SR));
  for (let i = 0; i < n; i++) x[x.length - 1 - i] *= i / n;
  return x;
};

/** RBJ biquad: band-pass, high-pass. */
function biquad(x: Float32Array, type: 'bp' | 'hp', f: number, q: number) {
  const w = (TAU * f) / SR;
  const al = Math.sin(w) / (2 * q);
  const c = Math.cos(w);
  const [b0, b1, b2] = type === 'bp' ? [al, 0, -al] : [(1 + c) / 2, -(1 + c), (1 + c) / 2];
  const a0 = 1 + al;
  const [a1, a2] = [(-2 * c) / a0, (1 - al) / a0];
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2) / a0 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v;
    y[i] = v;
  }
  return y;
}

type Bus = { l: Float32Array; r: Float32Array };
const bus = (): Bus => ({ l: new Float32Array(N), r: new Float32Array(N) });
/** Add a mono sound at time t (seconds) with equal-power pan (-1..1). */
function put(b: Bus, t: number, x: Float32Array, gain: number, pan = 0) {
  const s0 = Math.round(t * SR);
  const a = ((pan + 1) * Math.PI) / 4;
  const gl = Math.cos(a) * gain;
  const gr = Math.sin(a) * gain;
  for (let i = 0; i < x.length && s0 + i < N; i++) {
    b.l[s0 + i] += x[i] * gl;
    b.r[s0 + i] += x[i] * gr;
  }
}

/** Schroeder reverb: 4 parallel combs + 2 series allpasses per channel, wet signal only. */
function reverb(src: Bus, rt60: number): Bus {
  const mono = src.l.map((v, i) => 0.5 * (v + src.r[i]));
  const [l, r] = [0, 1].map((ch) => {
    let sig = new Float32Array(N);
    for (const base of [1116, 1188, 1277, 1356]) {
      const d = base + ch * 23;
      const g = 10 ** ((-3 * d) / (SR * rt60));
      const scale = Math.sqrt(1 - g * g) * 0.5;
      const buf = new Float32Array(d);
      let idx = 0, damp = 0;
      for (let i = 0; i < N; i++) {
        const o = buf[idx];
        damp = o * 0.65 + damp * 0.35;
        buf[idx] = mono[i] * scale + damp * g;
        sig[i] += o;
        if (++idx === d) idx = 0;
      }
    }
    for (const base of [556, 441]) {
      const d = base + ch * 23;
      const buf = new Float32Array(d);
      let idx = 0;
      const out = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const o = buf[idx];
        out[i] = o - sig[i];
        buf[idx] = sig[i] + o * 0.5;
        if (++idx === d) idx = 0;
      }
      sig = out;
    }
    return sig;
  });
  return { l, r };
}

// ---------- instruments (each returns a mono one-shot) ----------
const KICK = (() => {
  const x = new Float32Array(Math.round(0.3 * SR));
  const click = biquad(noise(10, x.length), 'hp', 2500, 0.7);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += (TAU * (45 + 65 * Math.exp(-t / 0.03))) / SR; // sweep 110 -> 45 Hz
    x[i] = Math.sin(ph) * Math.exp(-t / 0.06) * Math.min(1, t / 0.001) + 0.12 * click[i] * Math.exp(-t / 0.003);
  }
  return taper(norm(x), 0.02);
})();

const CLAP = (() => {
  const x = biquad(noise(12, Math.round(0.12 * SR)), 'bp', 1500, 1);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    let env = t >= 0.027 ? Math.exp(-(t - 0.027) / 0.035) : 0;
    for (const p of [0, 0.009, 0.018]) if (t >= p) env += 0.8 * Math.exp(-(t - p) / 0.003);
    x[i] *= env;
  }
  return taper(norm(x), 0.01);
})();

const HAT = (() => {
  const x = biquad(noise(11, Math.round(0.025 * SR)), 'hp', 7000, 0.7);
  for (let i = 0; i < x.length; i++) x[i] *= Math.exp(-i / SR / 0.007);
  return taper(norm(x), 0.003);
})();

const PING = (f: number) => {
  const x = new Float32Array(Math.round(0.14 * SR));
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    x[i] = Math.sin(TAU * f * t) * Math.min(1, t / 0.003) * Math.exp(-t / 0.03);
  }
  return taper(x, 0.01);
};

/** Sine plus a little 2nd harmonic. */
function bassNote(m: number, len: number, harm = 0.25) {
  const f = midi(m);
  const rel = 0.06;
  const x = new Float32Array(Math.round((len + rel) * SR));
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    const gate = t < len ? 1 : 1 - (t - len) / rel;
    x[i] = (Math.sin(TAU * f * t) + harm * Math.sin(TAU * 2 * f * t)) * Math.min(1, t / 0.01) * Math.exp(-t / 0.7) * gate;
  }
  return x;
}

/** Karplus-Strong: noise burst into a delay line with an averaging low-pass. bright 0..1 = how open the burst is. */
function pluck(m: number, bright: number, seed: number) {
  const D = SR / midi(m) - 0.5; // the averaging filter adds half a sample of delay
  const L = Math.ceil(D) + 1;
  const out = new Float32Array(Math.round(1.4 * SR));
  const r = rng(seed);
  const k = 0.25 + 0.7 * bright;
  let lp = 0;
  for (let i = 0; i < L; i++) {
    lp += k * (r() * 2 - 1 - lp);
    out[i] = lp;
  }
  const burst = norm(out.subarray(0, L));
  out.set(burst, 0);
  const g = 0.9965 + 0.0015 * bright;
  const tap = (p: number) => {
    const i0 = Math.floor(p);
    return out[i0] + (p - i0) * (out[i0 + 1] - out[i0]);
  };
  for (let i = L; i < out.length; i++) out[i] = g * 0.5 * (tap(i - D) + tap(i - D - 1));
  return taper(out, 0.05);
}

/** Band-passed noise, centre frequency and volume both rising. */
function riser(len: number, f0: number, f1: number, ampPow: number, seed: number) {
  const x = noise(seed, Math.round(len * SR));
  const out = new Float32Array(x.length);
  let lo = 0, bp = 0;
  for (let i = 0; i < x.length; i++) {
    const u = i / x.length;
    const fc = Math.min(5500, f0 * (f1 / f0) ** (u ** 1.2));
    const F = 2 * Math.sin((Math.PI * fc) / SR);
    const hp = x[i] - lo - 0.35 * bp;
    bp += F * hp;
    lo += F * bp;
    out[i] = bp * u ** ampPow;
  }
  return taper(norm(out), 0.004);
}

/** Low sine boom (55 Hz) plus a noise thump. */
const IMPACT = (() => {
  const x = new Float32Array(Math.round(3 * SR));
  const th = noise(13, x.length);
  let ph = 0, lp = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    ph += (TAU * (55 + 30 * Math.exp(-t / 0.06))) / SR;
    lp += 0.04 * (th[i] - lp);
    x[i] = Math.sin(ph) * Math.exp(-t / 0.9) * Math.min(1, t / 0.004) + 6 * lp * Math.exp(-t / 0.05);
  }
  return taper(norm(x), 0.3);
})();

// ---------- harmony ----------
type Chord = { pad: number[]; bass: number };
const CH = {
  Dmaj9: { pad: [50, 57, 61, 64], bass: 38 },
  Bm9: { pad: [57, 61, 62, 66], bass: 35 },
  Bm: { pad: [54, 59, 62, 66], bass: 35 },
  G: { pad: [55, 59, 62, 67], bass: 43 },
  DoverFs: { pad: [54, 57, 62, 66], bass: 42 },
  A: { pad: [57, 61, 64, 69], bass: 45 },
  D: { pad: [50, 57, 62, 66], bass: 38 },
  AoverCs: { pad: [57, 61, 64, 69], bass: 37 },
  Bm7: { pad: [54, 59, 62, 69], bass: 35 },
  Gmaj7: { pad: [55, 59, 62, 66], bass: 43 },
} satisfies Record<string, Chord>;

/** [first bar, number of bars, chord] */
const PROGRESSION: [number, number, Chord][] = [
  [0, 2, CH.Dmaj9], [2, 2, CH.Bm9], // Hook
  [4, 2, CH.Bm], [6, 1, CH.G], [7, 1, CH.DoverFs], [8, 2, CH.A], // Problem
  [10, 2, CH.D], [12, 2, CH.AoverCs], [14, 2, CH.Bm7], [16, 2, CH.Gmaj7], // Solution
  ...Array.from({ length: OUTRO - DEMO }, (_, i): [number, number, Chord] => [
    DEMO + i, 1, [CH.D, CH.Bm7, CH.Gmaj7, CH.A][i % 4],
  ]), // Demo
  [OUTRO, END - OUTRO, CH.Dmaj9], // Outro
];
const chordAt = (b: number) => PROGRESSION.find(([s, n]) => b >= s && b < s + n)![2];

// Pad low-pass cutoff (Hz) over time, as keyframes [seconds, Hz]; one-pole coefficient per sample.
const CUT: [number, number][] = [
  [0, 900], [at(PROBLEM), 2000],
  [at(PROBLEM) + 0.001, 1100], [DROP0, 1500],
  [DROP1, 1800], [at(DEMO), 2400],
  [at(DEMO) + 0.001, 2200], [at(OUTRO), 2500],
  [at(OUTRO) + 0.001, 1800], [at(END), 900], [at(END) + 10, 900],
];
const CUT_COEF = new Float32Array(N).map((_, i) => {
  const t = i / SR;
  let k = 1;
  while (k < CUT.length - 1 && CUT[k][0] < t) k++;
  const [t0, f0] = CUT[k - 1];
  const [t1, f1] = CUT[k];
  const fc = f0 + (f1 - f0) * Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
  return 1 - Math.exp((-TAU * fc) / SR);
});

/** One pad voice: 3 detuned oscillators (saw, triangle, saw; -6, 0, +6 cents) into the automated one-pole low-pass. */
function padVoice(b: Bus, t: number, dur: number, rel: number, m: number, pan: number, gain: number, seed: number) {
  const r = rng(seed);
  const f = midi(m);
  const ratio = [2 ** (-6 / 1200), 1, 2 ** (6 / 1200)];
  const ph = [r(), r(), r()];
  const s0 = Math.round(t * SR);
  const [A, D, R] = [Math.round(0.25 * SR), Math.round(dur * SR), Math.round(rel * SR)];
  const out = new Float32Array(D + R);
  let y = 0;
  for (let i = 0; i < out.length; i++) {
    for (let k = 0; k < 3; k++) ph[k] = (ph[k] + (f * ratio[k]) / SR) % 1;
    const x = 0.35 * (2 * ph[0] - 1) + 0.4 * (4 * Math.abs(ph[1] - 0.5) - 1) + 0.35 * (2 * ph[2] - 1);
    y += CUT_COEF[Math.min(N - 1, s0 + i)] * (x - y);
    let env = i < A ? Math.sin((Math.PI / 2) * (i / A)) : 1;
    if (i >= D) env *= 0.5 * (1 + Math.cos((Math.PI * (i - D)) / R));
    out[i] = y * env;
  }
  put(b, t, out, gain, pan);
}

// ---------- arrangement ----------
const dry = bus(); // everything that gets ducked in the drop-out
const padBus = bus();
const fxBus = bus(); // sends into the long reverb
const pluckBus = bus();
const swell = bus(); // reverse-swell and impacts, never ducked

// Pads
const PAN4 = [-0.35, -0.12, 0.12, 0.35];
PROGRESSION.forEach(([first, n, chord], c) => {
  const t0 = at(first);
  const drops = first + n === SOLUTION; // the chord before Solution is cut at the drop-out
  const t1 = drops ? DROP0 : at(first + n) + 0.1;
  const rel = drops ? 0.15 : 0.8;
  chord.pad.forEach((m, v) => padVoice(padBus, t0, t1 - t0, rel, m, PAN4[v], db(G.pad) * 0.5, 100 + c * 10 + v));
});

// Sub pulse (Hook), bass (rest)
for (let b = HOOK; b < PROBLEM; b++)
  for (let beat = 0; beat < 4; beat++)
    put(dry, at(b, beat), bassNote(chordAt(b).bass, 0.4, 0.1), db(G.bass - 4));
for (let b = PROBLEM; b < OUTRO; b++) {
  const root = chordAt(b).bass;
  const pattern: [number, number, number][] =
    b < DEMO
      ? [[0, root, 1.8], [2, root, 1.8]]
      : [[0, root, 0.7], [1.5, root + 12, 0.6], [2, root, 0.7], [3, root + 7, 0.7]];
  for (const [beat, m, len] of pattern) if (live(at(b, beat))) put(dry, at(b, beat), bassNote(m, len * SPB), db(G.bass));
}
put(dry, at(OUTRO), bassNote(CH.Dmaj9.bass, 3.8), db(G.bass));

// Problem: low thrum (two sines beating at 0.7 Hz) and pings rising in density
{
  const t0 = at(PROBLEM);
  const x = new Float32Array(Math.round((DROP0 - t0) * SR));
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    x[i] = 0.5 * (Math.sin(TAU * midi(35) * t) + Math.sin(TAU * (midi(35) + 0.7) * t)) * (0.3 + 0.7 * (i / x.length)) * Math.min(1, t / 0.5);
  }
  put(dry, t0, x, db(G.bass - 8));
  const r = rng(77);
  const slots = Math.floor((DROP0 - t0) / (SPB / 4));
  for (let s = 0; s < slots; s++) {
    if (r() < 0.02 + 0.3 * (s / slots)) put(dry, t0 + s * (SPB / 4), PING(1800 + 800 * r()), db(G.ping) * (0.5 + 0.5 * r()), r() * 1.6 - 0.8);
  }
}

// Drums: hats from the bar after Problem's first, kick + clap groove two bars into Solution
const FILLS = [DEMO - 1, ...CHAPTERS.map((c) => c - 1), OUTRO - 1];
const GROOVE_FROM = SOLUTION + 2;
for (let b = PROBLEM + 1; b < OUTRO; b++) {
  const fill = FILLS.includes(b);
  if (b >= GROOVE_FROM) {
    for (const beat of b < DEMO || fill ? [0, 2] : [0, 2, 3.5]) put(dry, at(b, beat), KICK, db(G.kick), 0);
    for (const beat of [1, 3]) {
      put(dry, at(b, beat), CLAP, db(G.clap), 0);
      put(fxBus, at(b, beat), CLAP, db(G.clap) * 0.25, 0);
    }
    if (fill && b !== OUTRO - 1) for (const [beat, v] of [[3.5, 0.5], [3.75, 0.7]]) put(dry, at(b, beat), CLAP, db(G.clap) * v, 0);
  }
  if (b >= SOLUTION && b < GROOVE_FROM) continue;
  for (let s = 0; s < 8; s++) {
    const beat = s / 2;
    if (!live(at(b, beat)) || (fill && beat >= 3)) continue;
    const v = s === 0 ? 1 : s % 2 === 0 ? 0.8 : 0.5;
    put(dry, at(b, beat), HAT, db(G.hat) * v, s % 2 ? 0.3 : -0.3);
    if (b >= CHAPTERS[2] && !fill) put(dry, at(b, beat + 0.25), HAT, db(G.hat) * 0.3, s % 2 ? -0.2 : 0.2); // lift: 16th ghosts
  }
  if (fill) for (let k = 0; k < 4; k++) put(dry, at(b, 3 + k / 4), HAT, db(G.hat) * (0.4 + 0.2 * k), k % 2 ? 0.3 : -0.3);
}

// Plucked arpeggio
const ARP = [0, 1, 2, 3, 2, 1];
function arpBar(b: number, bright: number, gain: number, steps = 8) {
  const notes = chordAt(b).pad.map((m) => m + 12);
  for (let s = 0; s < steps; s++) {
    const m = notes[ARP[s % ARP.length]];
    put(pluckBus, at(b, s / 2), pluck(m, bright, 1000 + b * 16 + s), db(G.pluck) * gain * (s % 2 ? 0.7 : 1), 0);
  }
}
for (const [b, beat, i] of [[2, 1, 2], [2, 3.5, 3], [3, 2, 1], [3, 3.5, 3]]) {
  put(pluckBus, at(b, beat), pluck(chordAt(b).pad[i] + 12, 0.35, 900 + b * 8 + beat), db(G.pluck) * 0.8, 0);
}
for (let b = SOLUTION + 4; b < OUTRO; b++) arpBar(b, b >= CHAPTERS[2] ? 0.85 : 0.5, 1);
for (let b = OUTRO; b < END; b++) arpBar(b, 0.4, 0.8);

// Echo: 3/16 note, 25% feedback, panned right
{
  const d = Math.round(3 * SPB * 0.5 * SR);
  const e = new Float32Array(N);
  for (let i = d; i < N; i++) e[i] = pluckBus.l[i - d] + 0.25 * e[i - d];
  for (let i = 0; i < N; i++) {
    dry.l[i] += pluckBus.l[i] * 1.1 + e[i] * 0.35;
    dry.r[i] += pluckBus.l[i] * 0.75 + e[i] * 1.2;
  }
}

// Risers, reverse swell, impacts
const risers: [number, number, number, number, number, number][] = [
  // start bar, bars, f0, f1, volume dB, seed
  [HOOK + 3, 1, 400, 7000, G.riser, 21],
  ...CHAPTERS.map((c, i): [number, number, number, number, number, number] => [c - 1, 1, 500, 6000, G.riser - 7, 22 + i]),
];
for (const [b, n, f0, f1, vol, seed] of risers) {
  put(dry, at(b), riser(n * SPBAR, f0, f1, 2, seed), db(vol), -0.5);
  put(dry, at(b), riser(n * SPBAR, f0, f1, 2, seed + 50), db(vol), 0.5);
}
for (const [pan, seed] of [[-0.6, 31], [0.6, 32]] as const) put(swell, DROP0, riser(DROP1 - DROP0, 250, 5000, 3, seed), db(G.riser + 3), pan);
put(swell, DROP1, IMPACT, db(G.impact), 0);
put(fxBus, DROP1, IMPACT, db(G.impact) * 0.7, 0);
put(swell, at(OUTRO + 2), IMPACT, db(G.impact) * 0.4, 0);
put(fxBus, at(OUTRO + 2), IMPACT, db(G.impact) * 0.4 * 0.7, 0);

// ---------- master ----------
const padRev = reverb(padBus, 1.6);
const fxRev = reverb(fxBus, 3.5);
const duck = new Float32Array(N).fill(1);
for (let i = Math.round(DROP0 * SR); i < Math.round(DROP1 * SR); i++) duck[i] = Math.max(0, 1 - (i - DROP0 * SR) / (0.06 * SR));
const fadeStart = at(OUTRO + 2); // everything fades out after the soft final hit
const fadeEnd = N / SR - 0.1;
const master = [
  [dry.l, padBus.l, padRev.l, fxRev.l, swell.l],
  [dry.r, padBus.r, padRev.r, fxRev.r, swell.r],
].map(([d, p, pr, fr, sw]) => {
  const m = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const fade = t < fadeStart ? 1 : t > fadeEnd ? 0 : 0.5 * (1 + Math.cos((Math.PI * (t - fadeStart)) / (fadeEnd - fadeStart)));
    m[i] = ((d[i] + 0.8 * p[i] + 0.2 * pr[i]) * duck[i] + fr[i] * 0.6 + sw[i]) * fade;
  }
  return m;
});

// High-pass at 25 Hz (2nd order Butterworth) to kill DC, then normalise to -1 dBFS.
const hp = master.map((m) => biquad(m, 'hp', 25, Math.SQRT1_2));
let peak = 0;
for (const ch of hp) for (const v of ch) peak = Math.max(peak, Math.abs(v));
const k = db(-1) / peak;
const fadeN = Math.round(0.01 * SR);
for (const ch of hp) {
  for (let i = 0; i < N; i++) ch[i] *= k;
  for (let i = 0; i < fadeN; i++) {
    ch[i] *= i / fadeN;
    ch[N - 1 - i] *= i / fadeN;
  }
}

// ---------- write the canonical 44-byte-header 16-bit stereo WAV ----------
const wav = Buffer.alloc(44 + N * 4);
wav.write('RIFF', 0, 'ascii');
wav.writeUInt32LE(36 + N * 4, 4);
wav.write('WAVEfmt ', 8, 'ascii');
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(SR, 24);
wav.writeUInt32LE(SR * 4, 28);
wav.writeUInt16LE(4, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36, 'ascii');
wav.writeUInt32LE(N * 4, 40);
let outPeak = 0;
for (let i = 0; i < N; i++) {
  for (let c = 0; c < 2; c++) {
    const v = Math.max(-32768, Math.min(32767, Math.round(hp[c][i] * 32767)));
    outPeak = Math.max(outPeak, Math.abs(v));
    wav.writeInt16LE(v, 44 + (i * 2 + c) * 2);
  }
}
const target = new URL('../public/audio/music.wav', import.meta.url);
mkdirSync(new URL('../public/audio/', import.meta.url), { recursive: true });
writeFileSync(target, wav);

// ---------- report ----------
const rms = (from: number, to: number) => {
  const [a, b] = [Math.round(from * SR), Math.min(N, Math.round(to * SR))];
  let s = 0;
  for (let i = a; i < b; i++) s += hp[0][i] ** 2 + hp[1][i] ** 2;
  return 10 * Math.log10(s / (2 * (b - a)));
};
console.log(`total ${(N / SR).toFixed(2)} s, sample peak ${(20 * Math.log10(outPeak / 32767)).toFixed(2)} dBFS`);
for (const id of Object.keys(DURATION) as SceneId[]) {
  const from = START[id] / FPS;
  console.log(`${id.padEnd(9)} ${from.toFixed(0).padStart(3)}-${((START[id] + DURATION[id]) / FPS).toFixed(0).padEnd(3)} s  rms ${rms(from, from + DURATION[id] / FPS).toFixed(1)} dBFS`);
}
console.log(`Tail      ${(TOTAL / FPS).toFixed(0)}-${(N / SR).toFixed(1)} s  rms ${rms(TOTAL / FPS, N / SR).toFixed(1)} dBFS`);
