// Content for the features bento (landing brief v2, part 8). Everything here mirrors Mira's demo space
// (demo-data.ts) and is shown under a "Demo" label.

import type { CommunityIcon, Tint } from '@fellow-owners/shared';
import { messages, promoteDraft } from './demo-data';

/* ---------- Tile 2: triage ---------- */

/** The top collab from the DM pile (fit 82) and how many spam messages never reached the inbox. */
export const TRIAGE = (() => {
  const pick = messages.find((m) => m.id === 'm2')!;
  return {
    from: pick.from,
    type: 'Collab',
    fit: pick.fit ?? 0,
    reason: pick.reason ?? '',
    filtered: messages.filter((m) => m.type === 'spam').length,
  };
})();

/* ---------- Tile 3: taste profile ---------- */

export const TASTE = [
  {
    group: 'Promote',
    lines: [
      { text: 'Fitness tools I’d use myself', on: true },
      { text: 'Paid build-in-public collabs', on: true },
      { text: 'Merch drops', on: false },
    ],
  },
  {
    group: 'Never',
    lines: [{ text: 'Follower growth schemes', on: true }],
  },
] as const;

/* ---------- Tile 4: a team forming on a project ---------- */

export const TEAM = {
  project: 'Gym-log app for creators',
  community: 'Builders',
  roles: [
    { role: 'Frontend', name: 'Arjun Mehta' },
    { role: 'Backend', name: 'Priya Nair' },
    { role: 'Mobile', name: 'Leo Brandt' },
  ],
  open: { role: 'Designer', applicant: 'Sana Iqbal' },
} as const;

/* ---------- Tile 5: pitch types ---------- */

export const PITCH_TYPES = ['Collab', 'Investment', 'Idea', 'Press', 'Fan note'] as const;
export const PITCH_SELECTED = 'Collab';
export const PITCH_DRAFT = 'Co-host our build-in-public sprint in March?';

/* ---------- Tile 6: tracked link ---------- */

/** Daily clicks on the short link over two weeks; Mira posted on day 9. Sums to promoteDraft.clicks. */
export const CLICKS_BY_DAY = [
  12, 18, 15, 22, 30, 26, 41, 120, 260, 198, 164, 140, 132, 106,
] as const;
export const CLICKS_TOTAL = CLICKS_BY_DAY.reduce((sum, n) => sum + n, 0);
export const CLICKS_PEAK = Math.max(...CLICKS_BY_DAY);
export const CLICKS_PEAK_DAY = CLICKS_BY_DAY.indexOf(CLICKS_PEAK as (typeof CLICKS_BY_DAY)[number]);
export const SHORT_LINK = `fellowowners.app${promoteDraft.shortLink}`;

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

/** Sparkline geometry in a 0..W x 0..H box (the SVG stretches it; strokes do not scale). */
export const SPARK = (() => {
  const W = 300;
  const H = 100;
  const top = 8;
  const bottom = 4;
  const max = CLICKS_PEAK;
  const points: [number, number][] = CLICKS_BY_DAY.map((v, i) => [
    (i / (CLICKS_BY_DAY.length - 1)) * W,
    top + (1 - v / max) * (H - top - bottom),
  ]);
  const line = monotonePath(points);
  const area = `${line} L ${W} ${H} L 0 ${H} Z`;
  const [px, py] = points[CLICKS_PEAK_DAY]!;
  const [ex, ey] = points[points.length - 1]!;
  return {
    W,
    H,
    line,
    area,
    peak: { x: (px / W) * 100, y: (py / H) * 100 },
    end: { x: (ex / W) * 100, y: (ey / H) * 100 },
  };
})();

/**
 * Monotone cubic interpolation (Fritsch-Carlson, as d3's curveMonotoneX): a smooth curve that never
 * overshoots the data, so a quiet day never dips below zero on the chart.
 */
function monotonePath(points: [number, number][]): string {
  const n = points.length;
  if (n < 2) return '';
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[i + 1]!;
    slopes.push((y1 - y0) / (x1 - x0));
  }
  const tangents: number[] = [slopes[0]!];
  for (let i = 1; i < n - 1; i++) {
    const a = slopes[i - 1]!;
    const b = slopes[i]!;
    if (a * b <= 0) {
      tangents.push(0);
    } else {
      const h0 = points[i]![0] - points[i - 1]![0];
      const h1 = points[i + 1]![0] - points[i]![0];
      tangents.push((3 * (h0 + h1)) / ((2 * h1 + h0) / a + (h1 + 2 * h0) / b));
    }
  }
  tangents.push(slopes[n - 2]!);

  const r = (v: number) => Math.round(v * 100) / 100;
  let d = `M ${r(points[0]![0])} ${r(points[0]![1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[i + 1]!;
    const h = (x1 - x0) / 3;
    d += ` C ${r(x0 + h)} ${r(y0 + tangents[i]! * h)} ${r(x1 - h)} ${r(y1 - tangents[i + 1]! * h)} ${r(x1)} ${r(y1)}`;
  }
  return d;
}

/* ---------- Shared atoms ---------- */

/** Background and icon-tile colours for each community tint (04 §5 community card). */
export const TINT_COLORS: Record<Tint, { bg: string; tile: string }> = {
  aqua: { bg: 'var(--aqua)', tile: 'var(--aqua-tile)' },
  lavender: { bg: 'var(--lavender)', tile: 'var(--lavender-tile)' },
  peach: { bg: 'var(--peach)', tile: 'var(--peach-tile)' },
  lime: { bg: '#f5fcd2', tile: 'var(--lime)' },
  white: { bg: 'var(--card-strong)', tile: 'var(--table-head)' },
};

export type IconName = CommunityIcon;

const AVATAR_TINTS = ['#FFE6C4', '#E3D9FF', '#C9F0F4', '#E8FA8B', '#E9E9EB'];

/** Initials on a pastel tint picked by hashing the name (04 §5 avatars). */
export function avatarTint(name: string): string {
  // FNV-1a: spreads short names across the five tints better than a plain polynomial hash.
  let hash = 2166136261;
  for (const ch of name) {
    hash ^= ch.charCodeAt(0);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return AVATAR_TINTS[hash % AVATAR_TINTS.length]!;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}
