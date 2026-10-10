// Design tokens for the launch video, from DESIGN.md (frontmatter hex is normative) and spec section 3.
import type React from 'react';
import {Easing} from 'remotion';

export const C = {
  page: '#F2F2F3', shell: '#DADADC', glass: 'rgba(255,255,255,0.45)', card: '#F9F9FA', cardStrong: '#FFFFFF',
  tableHead: '#E9E9EB', ink: '#2D2D30', inkSoft: '#5E5E62', inkMuted: '#6E6E73', inkFaint: '#9A9AA0',
  line: '#E5E5E8', lineRow: '#D4D4D8', lineStrong: '#BDBDC2', lineField: '#8E8E94',
  lime: '#E8FA8B', limeTint: '#F5FCD2', peach: '#FFF3E3', peachTile: '#FFE6C4', orange: '#F2A93B',
  lavender: '#F1ECFF', lavenderTile: '#E3D9FF', purple: '#7C3AED', purpleChart: '#8B5CF6',
  aqua: '#E1F7F9', aquaTile: '#C9F0F4', teal: '#1FBFD0', success: '#16A34A', successInk: '#15803D',
  warnBg: '#FFF1D6', warnInk: '#A45A00', infoBg: '#DDF5F8', infoInk: '#0E7490',
  danger: '#EF4444', dangerDeep: '#DC2626', blur1: '#AEB8E6', blur2: '#9FD0D7', blur3: '#D7CCB6',
  // Icon tile on the lime-tinted Fitness card: the Fitness clay palette's light step, so marker lime stays a marker.
  limeTile: '#E6F1B1',
} as const;

export const R = {search: 12, tile: 14, field: 16, chip: 20, idea: 24, card: 28, fanShell: 32, shell: 40, pill: 9999} as const;

export const EASE = {
  expo: Easing.bezier(0.16, 1, 0.3, 1), // entrances
  quart: Easing.bezier(0.25, 1, 0.5, 1), // state changes
  quint: Easing.bezier(0.22, 1, 0.36, 1), // brand register
  inOut: Easing.bezier(0.65, 0, 0.35, 1), // camera moves
  in: Easing.bezier(0.32, 0, 0.67, 0), // exits
};

export const SHADOW = {
  overlay: '0 24px 64px -16px rgba(45,45,48,0.22)',
  device: '0 60px 140px -40px rgba(45,45,48,0.28)',
};

export const HAZE = {
  // canonical shell haze (DESIGN.json .ds-shell)
  shell:
    'radial-gradient(38% 53% at 53% 79%, rgba(174,184,230,0.72), rgba(174,184,230,0) 100%), radial-gradient(40% 41% at 71% 102%, rgba(159,208,215,0.88), rgba(159,208,215,0) 100%), radial-gradient(70% 60% at 97% 80%, rgba(215,204,182,0.9), rgba(215,204,182,0) 100%), #DADADC',
  // landing hero haze over the page
  page: 'radial-gradient(52% 62% at 66% 112%, rgba(174,184,230,0.45), rgba(174,184,230,0) 72%), radial-gradient(36% 58% at 100% 74%, rgba(159,208,215,0.42), rgba(159,208,215,0) 70%), radial-gradient(40% 50% at 92% 108%, rgba(215,204,182,0.45), rgba(215,204,182,0) 72%)',
};

export const TNUM: React.CSSProperties = {fontVariantNumeric: 'tabular-nums', fontFeatureSettings: "'tnum' 1"};

type Role =
  | 'tagline' | 'statement' | 'heroNumber' | 'caption' | 'support'
  | 'display' | 'h1' | 'h2' | 'stat' | 'count' | 'trend' | 'body' | 'label' | 'labelStrong' | 'small' | 'smallStrong' | 'caption12';

const t = (fontSize: number, lineHeight: number | string, fontWeight: number, letterSpacing = 'normal', tnum = false): React.CSSProperties => ({
  fontSize,
  lineHeight: typeof lineHeight === 'number' && lineHeight > 4 ? `${lineHeight}px` : lineHeight,
  fontWeight,
  letterSpacing,
  ...(tnum ? TNUM : {}),
});

export const TYPE: Record<Role, React.CSSProperties> = {
  // video roles (spec section 3)
  tagline: t(150, 0.95, 500, '-0.035em'),
  statement: t(120, 1, 500, '-0.03em'),
  heroNumber: t(220, 1, 600, '-0.03em', true),
  caption: t(80, 1.05, 500, '-0.02em'),
  support: t(48, 1.25, 400, '-0.01em'),
  // product roles (DESIGN.md typography)
  display: t(32, 40, 500, '-0.01em'),
  h1: t(24, 32, 500, '-0.005em'),
  h2: t(20, 28, 500),
  stat: t(40, 44, 600, '-0.02em', true),
  count: t(24, 32, 600, '-0.01em', true),
  trend: t(18, 24, 500, 'normal', true),
  body: t(15, 22, 400),
  label: t(15, 22, 500),
  labelStrong: t(15, 22, 600),
  small: t(13, 18, 400, 'normal', true),
  smallStrong: t(13, 18, 500, 'normal', true),
  caption12: t(12, 16, 500, '0.01em', true),
};
