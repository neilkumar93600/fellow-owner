import type {LucideIcon} from 'lucide-react';
import React from 'react';
import type {Tint} from '../data';
import {FONT} from '../fonts';
import {C, R} from '../theme';

/** Card fill, icon tile and icon stroke per community tint (DESIGN.md stat and community cards). */
export const TINTS: Record<Tint, {bg: string; tile: string; accent: string}> = {
  aqua: {bg: C.aqua, tile: C.aquaTile, accent: C.teal},
  lavender: {bg: C.lavender, tile: C.lavenderTile, accent: C.purpleChart},
  peach: {bg: C.peach, tile: C.peachTile, accent: C.orange},
  lime: {bg: C.limeTint, tile: C.limeTile, accent: C.ink},
  white: {bg: C.cardStrong, tile: C.tableHead, accent: C.ink},
};

const pill = (height: number): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 12,
  height,
  padding: '0 20px',
  boxSizing: 'border-box',
  borderRadius: R.pill,
  fontFamily: FONT,
  fontSize: 15,
  lineHeight: '22px',
  fontWeight: 500,
  color: C.ink,
  whiteSpace: 'nowrap',
});

/** Flat 45% white, no backdrop-filter. Only on the shell, only for controls and titles. */
export const GlassPill: React.FC<{children?: React.ReactNode; height?: number; style?: React.CSSProperties}> = ({children, height = 52, style}) => (
  <div style={{...pill(height), backgroundColor: C.glass, ...style}}>{children}</div>
);

/** Pure White pill with a 1px Hairline border: the pill for the plain page and over footage. */
export const WhitePill: React.FC<{children?: React.ReactNode; height?: number; style?: React.CSSProperties}> = ({children, height = 52, style}) => (
  <div style={{...pill(height), backgroundColor: C.cardStrong, border: `1px solid ${C.line}`, ...style}}>{children}</div>
);

const CARD_FILL = {paper: C.card, white: C.cardStrong, peach: C.peach, lavender: C.lavender, aqua: C.aqua, lime: C.limeTint} as const;

export const Card: React.FC<{
  tint: 'paper' | 'white' | 'peach' | 'lavender' | 'aqua' | 'lime';
  radius?: number;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({tint, radius = R.card, children, style}) => (
  <div style={{position: 'relative', backgroundColor: CARD_FILL[tint], borderRadius: radius, padding: 24, boxSizing: 'border-box', fontFamily: FONT, color: C.ink, ...style}}>
    {children}
  </div>
);

/** 56 px tile in the deeper tint with a 24 px icon in the tint's accent (white cards: Dove Grey tile, ink icon). */
export const IconTile: React.FC<{tint: Tint; icon: LucideIcon; size?: number}> = ({tint, icon: Icon, size = 56}) => (
  <div style={{flex: 'none', display: 'grid', placeItems: 'center', width: size, height: size, borderRadius: (R.tile * size) / 56, backgroundColor: TINTS[tint].tile}}>
    <Icon size={(24 * size) / 56} strokeWidth={1.5} color={TINTS[tint].accent} />
  </div>
);
