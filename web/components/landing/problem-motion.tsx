'use client';

import { type RefObject, useEffect, useRef, useState } from 'react';
import { easeOut, lerp, type SceneFrame, segment, useScrollScene } from '@/hooks/use-scroll-scene';
import { PICK_ORDER, PILE, type PileSlot, problemMessages, ROW_ORDER } from './problem-data';

/**
 * Client island for "The problem". Server markup is the finished, sorted state; with motion allowed this
 * island switches the section to its pinned layout ([data-motion]) and scrubs the scene from scroll:
 *   A 0-0.30  the pile drifts      B 0.30-0.60  spam to Filtered, the rest into the inbox
 *   C 0.60-0.90  top 3 rise with reasons      D 0.90-1  hold on the closing line
 * Every per-frame update is a transform, opacity or custom property written through cached DOM refs.
 * Reduced motion: nothing mounts, and the flow layout stays.
 */
export function ProblemMotion() {
  const markerRef = useRef<HTMLSpanElement>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    rootRef.current = markerRef.current?.closest('section') ?? null;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setEnabled(!query.matches && rootRef.current !== null);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return (
    <span ref={markerRef} hidden>
      {enabled ? <SceneDriver rootRef={rootRef} /> : null}
    </span>
  );
}

function SceneDriver({ rootRef }: { rootRef: RefObject<HTMLElement | null> }) {
  const sceneRef = useRef<Scene | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const scene = createScene(root);
    sceneRef.current = scene;
    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
  }, [rootRef]);

  useScrollScene(rootRef, (frame) => sceneRef.current?.frame(frame), 'pin');
  return null;
}

/* ------------------------------------------------------------------------------------------------ */

type Mode = 'phone' | 'tablet' | 'desktop';

/** Compact title size (px) once the heading steps aside for the inbox. */
const COMPACT_PX: Record<Mode, number> = { phone: 26, tablet: 30, desktop: 32 };
/** How far the remaining inbox dims while the picks rise. */
const TABLE_DIM: Record<Mode, number> = { phone: 0, tablet: 0.4, desktop: 0.42 };

const T = {
  pile: [0, 0.3],
  headMove: [0.28, 0.42],
  headFade: [0.27, 0.35],
  tray: [0.29, 0.36],
  table: [0.31, 0.41],
  spamStart: 0.31,
  spamStagger: 0.035,
  spamDur: 0.11,
  rowStart: 0.35,
  rowEnd: 0.6,
  rowDur: 0.1,
  narrIn: [0.4, 0.47],
  narrOut: [0.57, 0.61],
  narr2In: [0.63, 0.7],
  lift: [0.595, 0.665],
  field: [0.6, 0.65],
  fieldPhone: [0.625, 0.655],
  dim: [0.595, 0.66],
  dimPhone: [0.59, 0.625],
  pickStart: 0.64,
  pickStagger: 0.05,
  pickDur: 0.165,
  closingStart: 0.86,
  closingStagger: 0.02,
  closingDur: 0.05,
} as const;

interface Scene {
  frame: (frame: SceneFrame) => void;
  destroy: () => void;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface BubbleState {
  el: HTMLElement;
  spam: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  start: number;
  dur: number;
  tx: number;
  ty: number;
  rEnd: number;
  sEnd: number;
  arc: number;
  fadeFrom: number;
  row: RowState | null;
}

interface RowState {
  el: HTMLElement;
  box: Box;
  /** Progress through its bubble's flight, written by the bubble pass each frame. */
  landed: number;
  /** 0..1 how far its pick card has lifted out, written by the pick pass each frame. */
  lifted: number;
}

interface PickState {
  el: HTMLElement;
  body: HTMLElement | null;
  chip: HTMLElement | null;
  why: HTMLElement | null;
  shadow: HTMLElement | null;
  box: Box;
  row: RowState | null;
  start: number;
}

interface Layout {
  vw: number;
  vh: number;
  mode: Mode;
  title: { dx: number; dy: number; s: number };
  bubbles: BubbleState[];
  rows: RowState[];
  picks: PickState[];
  liftDY: number;
  field: Box | null;
  /** Bottom of the "Worth your time" header, relative to the field's top. */
  fieldBase: number;
  /** Fit scale of the picks tray on short screens, and its transform origin (top centre). */
  k: number;
  origin: { x: number; y: number };
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function seg(p: number, range: readonly [number, number]): number {
  return segment(p, range[0], range[1]);
}

/** Offset box inside `ancestor`, ignoring transforms (offsets are layout-only). */
function boxIn(el: HTMLElement, ancestor: HTMLElement): Box {
  let x = 0;
  let y = 0;
  let node: HTMLElement | null = el;
  while (node && node !== ancestor) {
    x += node.offsetLeft;
    y += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

function modeFor(width: number): Mode {
  if (width < 768) return 'phone';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function createScene(root: HTMLElement): Scene {
  const one = (name: string) => root.querySelector<HTMLElement>(`[data-problem="${name}"]`);
  const all = (selector: string) => Array.from(root.querySelectorAll<HTMLElement>(selector));

  const stage = one('stage');
  const inner = one('inner');
  const title = one('title');
  const slot = one('slot');
  if (!stage || !inner || !title || !slot) return { frame: () => {}, destroy: () => {} };

  const counter = one('counter');
  const lead = one('lead');
  const table = one('table');
  const tray = one('tray');
  const trayIcon = one('tray-icon');
  const field = one('picks-field');
  const board = one('board');
  const boardFade = one('board-fade');
  const picksWrap = one('picks-wrap');
  const picksHead = one('picks-head');
  const picksCount = one('picks-count');
  const narrs = all('[data-problem="narr"]');
  const closing = all('[data-problem="closing"]');
  const counts = all('[data-problem="count"]');
  const rowEls = new Map(all('[data-row]').map((el) => [el.dataset.row ?? '', el]));
  const pickEls = new Map(all('[data-pick]').map((el) => [el.dataset.pick ?? '', el]));
  const bubbleEls = new Map(all('[data-bubble]').map((el) => [el.dataset.bubble ?? '', el]));

  const driven = new Set<HTMLElement>();
  const cache = new Map<HTMLElement, Record<string, string>>();

  /** Writes a style (or custom property) only when it changed. */
  function put(el: HTMLElement | null, prop: string, value: string) {
    if (!el) return;
    let entry = cache.get(el);
    if (!entry) {
      entry = {};
      cache.set(el, entry);
      driven.add(el);
    }
    if (entry[prop] === value) return;
    entry[prop] = value;
    el.style.setProperty(prop, value);
  }

  function fade(el: HTMLElement | null, opacity: number) {
    const o = opacity < 0.001 ? 0 : opacity > 0.999 ? 1 : opacity;
    put(el, 'opacity', o.toFixed(3));
    put(el, 'visibility', o === 0 ? 'hidden' : 'visible');
  }

  let layout: Layout | null = null;
  let lastProgress = 0;
  let phase = '';
  let shownCount = -1;
  let shownPicks = -1;

  function measure() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const mode = modeFor(vw);
    const styles = getComputedStyle(root);
    const gutter = Number.parseFloat(styles.getPropertyValue('--gutter')) || 16;
    const top = Number.parseFloat(styles.getPropertyValue('--top')) || 84;
    const bottom = Number.parseFloat(styles.getPropertyValue('--bottom')) || 20;
    const W = inner!.clientWidth;
    const H = inner!.clientHeight;

    // 1. Compact heading: size the slot for the scaled title, then aim the title at it.
    const fontSize = Number.parseFloat(getComputedStyle(title!).fontSize) || 72;
    const s = Math.min(1, COMPACT_PX[mode] / fontSize);
    slot!.style.height = `${Math.round(title!.offsetHeight * s)}px`;
    driven.add(slot!);
    const titleBox = boxIn(title!, inner!);
    const slotBox = boxIn(slot!, inner!);

    // Natural heading extents keep the pile clear of the text.
    let headRight = titleBox.x;
    for (const line of Array.from(title!.children) as HTMLElement[]) {
      const b = boxIn(line, inner!);
      headRight = Math.max(headRight, b.x + b.w);
    }
    let headBottom = titleBox.y + titleBox.h;
    if (lead) {
      const b = boxIn(lead, inner!);
      headRight = Math.max(headRight, b.x + Math.min(b.w, 520));
      headBottom = b.y + b.h;
    }

    // 2. Rows, picks and the tray, in their final layout.
    const visibleRows = ROW_ORDER.filter((id) => (rowEls.get(id)?.offsetHeight ?? 0) > 0);
    const rows = new Map<string, RowState>();
    for (const id of visibleRows) {
      const el = rowEls.get(id)!;
      rows.set(id, { el, box: boxIn(el, inner!), landed: 1, lifted: 0 });
    }
    const picks: PickState[] = PICK_ORDER.map((id, k) => {
      const el = pickEls.get(id)!;
      return {
        el,
        body: el.querySelector<HTMLElement>('[data-pick-part="body"]'),
        chip: el.querySelector<HTMLElement>('[data-pick-part="chip"]'),
        why: el.querySelector<HTMLElement>('[data-pick-part="why"]'),
        shadow: el.querySelector<HTMLElement>('[data-pick-part="shadow"]'),
        box: boxIn(el, inner!),
        row: rows.get(id) ?? null,
        start: T.pickStart + k * T.pickStagger,
      };
    });
    const tableBox = table ? boxIn(table, inner!) : { x: 0, y: 0, w: 0, h: 0 };
    const wrapBox = picksWrap ? boxIn(picksWrap, inner!) : null;
    const boardBox = board ? boxIn(board, inner!) : null;
    let k = 1;
    if (wrapBox && boardBox && wrapBox.h > 0) {
      const available = boardBox.y + boardBox.h - wrapBox.y;
      k = Math.max(0.8, Math.min(1, available / wrapBox.h));
    }
    const origin = wrapBox ? { x: wrapBox.x + wrapBox.w / 2, y: wrapBox.y } : { x: 0, y: 0 };
    put(picksWrap, 'transform', k < 1 ? `scale(${k.toFixed(4)})` : 'none');
    const lastPick = picks[picks.length - 1]?.box;
    const liftDY =
      mode === 'phone' || !lastPick
        ? 24
        : Math.max(0, origin.y + (lastPick.y + lastPick.h - origin.y) * k + 32 - tableBox.y);
    const trayTarget = trayIcon ?? tray;
    const trayBox = trayTarget ? boxIn(trayTarget, inner!) : { x: 0, y: H, w: 0, h: 0 };
    const trayCx = trayBox.x + trayBox.w / 2;
    const trayCy = trayBox.y + trayBox.h / 2;

    // 3. The pile: deterministic slots inside regions that avoid the heading.
    const free = { x: gutter, y: top, w: W - 2 * gutter, h: H - top - bottom };
    // On wide screens the pile may spill into the page margin beside the content column.
    const bleed = Math.min(120, Math.max(0, (vw - W) / 2 - 24));
    const right: Box = {
      x: headRight + 40,
      y: top + 8,
      w: free.x + free.w + bleed - (headRight + 40),
      h: free.h,
    };
    const leftLow: Box = {
      x: gutter,
      y: headBottom + 36,
      w: headRight - gutter,
      h: H - bottom - (headBottom + 36),
    };
    const below: Box = {
      x: gutter,
      y: headBottom + 28,
      w: free.w,
      h: H - bottom - (headBottom + 28),
    };

    const rowStagger =
      visibleRows.length > 1 ? (T.rowEnd - T.rowStart - T.rowDur) / (visibleRows.length - 1) : 0;
    const bubbles: BubbleState[] = [];
    let spamIndex = 0;

    PILE.forEach((entry, index) => {
      const el = bubbleEls.get(entry.id);
      const message = problemMessages[entry.id];
      if (!el || !message) return;
      const bw = el.offsetWidth;
      const bh = el.offsetHeight;
      if (bw === 0) return; // hidden at this breakpoint
      let place: PileSlot | undefined;
      let region = below;
      if (mode === 'desktop') {
        place = entry.desk;
        region = entry.desk.region === 'R' ? right : leftLow;
      } else if (mode === 'tablet') place = entry.tab;
      else place = entry.phone;
      if (!place) return;

      const x = region.x + place.u * Math.max(0, region.w - bw);
      const y = region.y + place.v * Math.max(0, region.h - bh);
      const depth = 0.4 + ((index * 37) % 10) / 16;
      const vx = (((index * 29) % 7) - 3) * 3 * depth;
      const vy = -30 * depth;
      const spam = message.type === 'spam';

      if (spam) {
        const start = T.spamStart + spamIndex * T.spamStagger;
        spamIndex += 1;
        const sEnd = 0.12;
        bubbles.push({
          el,
          spam,
          x,
          y,
          vx,
          vy,
          r: place.r,
          start,
          dur: T.spamDur,
          tx: trayCx - bw / 2,
          ty: trayCy - bh / 2,
          rEnd: place.r + (place.r < 0 ? -16 : 16),
          sEnd,
          arc: mode === 'phone' ? 24 : 56,
          fadeFrom: 0.72,
          row: null,
        });
        return;
      }

      const row = rows.get(entry.id) ?? null;
      if (!row) return;
      const order = visibleRows.indexOf(entry.id as (typeof visibleRows)[number]);
      const rb = row.box;
      const sEnd =
        mode === 'phone' ? Math.min(rb.h / bh, rb.w / bw) * 0.96 : Math.min(1, (rb.h * 0.8) / bh);
      const cx = mode === 'phone' ? rb.x + rb.w / 2 : rb.x + 14 + (bw * sEnd) / 2;
      const cy = rb.y + rb.h / 2;
      bubbles.push({
        el,
        spam,
        x,
        y,
        vx,
        vy,
        r: place.r,
        start: T.rowStart + order * rowStagger,
        dur: T.rowDur,
        tx: cx - bw / 2,
        ty: cy - bh / 2,
        rEnd: 0,
        sEnd,
        arc: 0,
        fadeFrom: 0.6,
        row,
      });
    });

    const fieldBox = field ? boxIn(field, inner!) : null;
    layout = {
      vw,
      vh,
      mode,
      title: { dx: slotBox.x - titleBox.x, dy: slotBox.y - titleBox.y, s },
      bubbles,
      rows: [...rows.values()],
      picks,
      liftDY,
      field: fieldBox,
      fieldBase:
        fieldBox && picksHead
          ? boxIn(picksHead, inner!).y + picksHead.offsetHeight + 6 - fieldBox.y
          : 0,
      k,
      origin,
    };
  }

  function render(p: number) {
    const L = layout;
    if (!L) return;
    lastProgress = p;

    const nextPhase = p < T.headMove[0] ? 'pile' : 'sort';
    if (nextPhase !== phase) {
      phase = nextPhase;
      root.setAttribute('data-phase', phase);
    }

    // Heading: steps aside and compacts.
    const hm = easeOut(seg(p, T.headMove));
    const { dx, dy, s } = L.title;
    put(
      title,
      'transform',
      `translate3d(${(dx * hm).toFixed(2)}px, ${(dy * hm).toFixed(2)}px, 0) scale(${lerp(1, s, hm).toFixed(4)})`,
    );
    if (L.mode === 'phone') {
      fade(title, 1 - segment(p, T.closingStart - 0.04, T.closingStart + 0.01));
    }
    const hf = seg(p, T.headFade);
    fade(counter, 1 - hf);
    put(counter, 'transform', `translate3d(0, ${(-12 * hf).toFixed(2)}px, 0)`);
    fade(lead, 1 - hf);
    put(lead, 'transform', `translate3d(0, ${(-24 * hf).toFixed(2)}px, 0)`);

    // Narration beside the compact title.
    if (L.mode !== 'phone') {
      const n1 = seg(p, T.narrIn) * (1 - seg(p, T.narrOut));
      const n2 = seg(p, T.narr2In);
      fade(narrs[0] ?? null, n1);
      put(narrs[0] ?? null, 'transform', `translate3d(0, ${((1 - n1) * 12).toFixed(2)}px, 0)`);
      fade(narrs[1] ?? null, n2);
      put(narrs[1] ?? null, 'transform', `translate3d(0, ${((1 - n2) * 12).toFixed(2)}px, 0)`);
    }

    // Inbox card: in during B, sinks and dims during C.
    const ti = easeOut(seg(p, T.table));
    const lift = easeOut(seg(p, T.lift));
    const tableDY = (1 - ti) * 28 + lift * L.liftDY;
    const dimRange = L.mode === 'phone' ? T.dimPhone : T.dim;
    fade(table, ti * lerp(1, TABLE_DIM[L.mode], seg(p, dimRange)));
    put(table, 'transform', `translate3d(0, ${tableDY.toFixed(2)}px, 0)`);
    // The bottom veil only matters once the inbox sinks below the stage edge.
    fade(boardFade, lift);

    // Bubbles: pile parallax, then spam to the tray and the rest onto their rows.
    const pileT = easeOut(seg(p, T.pile));
    let landed = 0;
    let bump = 0;
    for (const b of L.bubbles) {
      const bx = b.x + b.vx * pileT;
      const by = b.y + b.vy * pileT;
      const t = segment(p, b.start, b.start + b.dur);
      const e = easeInOut(t);
      const x = lerp(bx, b.tx, e);
      const y = lerp(by, b.ty, e) - Math.sin(Math.PI * t) * b.arc;
      const r = lerp(b.r, b.rEnd, e);
      const sc = lerp(1, b.sEnd, e);
      put(
        b.el,
        'transform',
        `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${r.toFixed(2)}deg) scale(${sc.toFixed(4)})`,
      );
      fade(b.el, 1 - segment(t, b.fadeFrom, 1));
      if (b.spam) {
        if (t >= 0.9) landed += 1;
        bump = Math.max(bump, 1 - Math.min(1, Math.abs(t - 0.92) / 0.08));
      } else if (b.row) {
        b.row.landed = segment(t, 0.6, 0.95);
      }
    }

    // Filtered tray and its count.
    const tr = easeOut(seg(p, T.tray));
    fade(tray, tr);
    put(
      tray,
      'transform',
      `translate3d(0, ${((1 - tr) * 16).toFixed(2)}px, 0) scale(${(1 + 0.06 * bump).toFixed(4)})`,
    );
    if (landed !== shownCount) {
      shownCount = landed;
      for (const el of counts) el.textContent = String(landed);
    }

    // Picks: each one opens out of its row (a row-height band of the card, clipped) and rises into the
    // lime stack; the field opens downward as each card settles.
    let reveal = L.fieldBase;
    let previousBottom = L.fieldBase;
    let picked = 0;
    const fieldIn = easeOut(seg(p, L.mode === 'phone' ? T.fieldPhone : T.field));
    const fieldTop = L.field?.y ?? 0;
    L.picks.forEach((pick) => {
      const t = segment(p, pick.start, pick.start + T.pickDur);
      const { k } = L;
      // On-screen centre of the card in its slot (the tray may be fit-scaled from its top centre).
      const pickCy = L.origin.y + (pick.box.y + pick.box.h / 2 - L.origin.y) * k;
      // Phones fade the inbox out first, so there the cards rise from below instead of from their rows.
      const rowBox = L.mode === 'phone' ? undefined : pick.row?.box;
      const rowCy = rowBox ? rowBox.y + rowBox.h / 2 + tableDY : pickCy + 140;

      // 1. Open: a row-height bar at the row grows into the full card.
      const open = rowBox ? easeOut(segment(t, 0, 0.3)) : 1;
      fade(pick.el, segment(t, 0, rowBox ? 0.04 : 0.3));
      if (open >= 1) put(pick.el, 'clip-path', 'none');
      else {
        const band = Math.max(0, (pick.box.h - (rowBox?.h ?? 48) / k) / 2) * (1 - open);
        const side = (rowBox ? Math.max(0, (pick.box.w - rowBox.w / k) / 2) : 0) * (1 - open);
        put(
          pick.el,
          'clip-path',
          `inset(${band.toFixed(1)}px ${side.toFixed(1)}px round ${(24 * open).toFixed(1)}px)`,
        );
      }
      if (pick.row) pick.row.lifted = segment(t, 0, 0.15);

      // 2. Fill: the summary and sender arrive while it is still at its row.
      const bodyT = segment(t, 0.08, 0.28);
      fade(pick.body, bodyT);
      put(pick.body, 'transform', `translate3d(0, ${((1 - bodyT) * 6).toFixed(2)}px, 0)`);

      // 3. Rise into the stack, then the AI chip and the reason land.
      const rise = easeInOut(segment(t, 0.25, 1));
      put(
        pick.el,
        'transform',
        `translate3d(0, ${(((rowCy - pickCy) * (1 - rise)) / k).toFixed(2)}px, 0)`,
      );
      fade(pick.shadow, segment(t, 0.3, 0.8));
      const chipT = easeOut(segment(t, 0.55, 0.85));
      fade(pick.chip, chipT);
      put(pick.chip, 'transform', `scale(${lerp(0.8, 1, chipT).toFixed(4)})`);
      fade(pick.why, segment(t, 0.6, 0.9));

      // The lime tray extends to take each card as it makes its final approach.
      const bottom = pick.box.y + pick.box.h + 12 - fieldTop;
      const settle = easeOut(segment(t, 0.78, 1));
      if (settle > 0) reveal = Math.max(reveal, lerp(previousBottom, bottom, settle));
      previousBottom = bottom;
      if (t >= 0.92) picked += 1;
    });
    if (L.field) {
      const hidden = Math.max(0, L.field.h - reveal);
      fade(field, fieldIn);
      put(field, 'clip-path', `inset(0 0 ${hidden.toFixed(1)}px 0 round 32px)`);
      fade(picksHead, fieldIn);
      put(picksHead, 'transform', `translate3d(0, ${((1 - fieldIn) * 10).toFixed(2)}px, 0)`);
    }
    if (picksCount && picked !== shownPicks) {
      shownPicks = picked;
      picksCount.textContent = String(picked);
    }

    for (const row of L.rows) {
      const value = row.landed * (1 - 0.85 * row.lifted);
      put(row.el, '--row-in', value.toFixed(3));
    }

    // Closing line.
    closing.forEach((el, i) => {
      const start = T.closingStart + i * T.closingStagger;
      const c = easeOut(segment(p, start, start + T.closingDur));
      fade(el, c);
      put(el, 'transform', `translate3d(0, ${((1 - c) * 20).toFixed(2)}px, 0)`);
    });
  }

  function progressNow(): number {
    const rect = root.getBoundingClientRect();
    const distance = root.offsetHeight - window.innerHeight;
    if (distance <= 0) return rect.top <= 0 ? 1 : 0;
    return Math.min(1, Math.max(0, -rect.top / distance));
  }

  // Switch to the pinned layout, then lay out and draw the current frame before the next paint.
  root.setAttribute('data-motion', '');
  measure();
  render(progressNow());

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry) return;
      if (entry.isIntersecting) root.setAttribute('data-visible', '');
      else root.removeAttribute('data-visible');
      if (entry.intersectionRatio >= 0.2) root.setAttribute('data-entered', '');
    },
    { threshold: [0, 0.2] },
  );
  observer.observe(stage);

  let disposed = false;
  document.fonts?.ready.then(() => {
    if (disposed) return;
    measure();
    render(lastProgress);
  });

  return {
    frame({ progress, width, height }) {
      if (!layout || width !== layout.vw || height !== layout.vh) measure();
      render(progress);
    },
    destroy() {
      disposed = true;
      observer.disconnect();
      for (const el of driven) {
        el.style.removeProperty('transform');
        el.style.removeProperty('opacity');
        el.style.removeProperty('visibility');
        el.style.removeProperty('--row-in');
        el.style.removeProperty('height');
        el.style.removeProperty('clip-path');
      }
      for (const el of counts) el.textContent = el.dataset.final ?? el.textContent;
      if (picksCount) picksCount.textContent = String(PICK_ORDER.length);
      for (const name of ['data-motion', 'data-visible', 'data-entered', 'data-phase']) {
        root.removeAttribute(name);
      }
    },
  };
}
