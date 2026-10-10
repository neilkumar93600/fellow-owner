import {Sparkles} from 'lucide-react';
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import type {Community} from '../data';
import {FONT} from '../fonts';
import {clamp} from '../motion';
import {C, EASE, R, TYPE} from '../theme';
import {TINTS} from './surfaces';

const chip = (bg: string): React.CSSProperties => ({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  height: 24,
  padding: '0 10px',
  boxSizing: 'border-box',
  borderRadius: R.pill,
  backgroundColor: bg,
  color: C.ink,
  fontFamily: FONT,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  ...TYPE.caption12,
});

/** pick / suggested: lime with Sparkles (the only place Sparkles appears); reviewing: Paper White with a sweeping band. */
export const AiChip: React.FC<{variant: 'pick' | 'reviewing' | 'suggested' | 'unanalyzed'; label?: string}> = ({variant, label}) => {
  const frame = useCurrentFrame();
  if (variant === 'pick' || variant === 'suggested') {
    return (
      <span style={chip(C.lime)}>
        <Sparkles size={14} strokeWidth={1.5} color={C.ink} />
        {label ?? (variant === 'pick' ? 'AI pick' : 'AI suggested')}
      </span>
    );
  }
  if (variant === 'unanalyzed') return <span style={chip(C.tableHead)}>{label ?? 'Not analyzed'}</span>;
  // A Dove Grey band (half the chip wide) sweeps across every 48 frames (1.6 s), taking the first 30 of them.
  // -100% and 200% of its own width park it fully outside the chip at both ends, so the loop point never pops.
  const sweep = interpolate(frame % 48, [0, 30], [-100, 200], {...clamp, easing: EASE.inOut});
  return (
    <span style={{...chip(C.card), border: `1px solid ${C.line}`}}>
      <span
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: '50%',
          translate: `${sweep}% 0`,
          background: `linear-gradient(90deg, rgba(233,233,235,0), ${C.tableHead}, rgba(233,233,235,0))`,
        }}
      />
      <span style={{position: 'relative'}}>{label ?? 'AI reviewing'}</span>
    </span>
  );
};

/** Pure White, 24 tall: tabular number plus a 24 x 4 bar. `fill` animates both. */
export const FitPill: React.FC<{score: number; fill?: number}> = ({score, fill = 1}) => {
  const band = score >= 70 ? {num: C.successInk, bar: C.successInk} : score >= 40 ? {num: C.warnInk, bar: C.warnInk} : {num: C.inkMuted, bar: C.inkFaint};
  return (
    <span style={{...chip(C.cardStrong), gap: 6, padding: '0 8px', border: `1px solid ${C.line}`, color: band.num}}>
      <span style={{minWidth: 15, textAlign: 'right'}}>{Math.round(score * fill)}</span>
      <span style={{position: 'relative', width: 24, height: 4, borderRadius: 2, backgroundColor: C.line, overflow: 'hidden'}}>
        <span style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: 24, borderRadius: 2, backgroundColor: band.bar, transformOrigin: 'left', scale: `${(score / 100) * fill} 1`}} />
      </span>
    </span>
  );
};

const TONES = {warm: [C.warnBg, C.warnInk], cool: [C.infoBg, C.infoInk], neutral: [C.tableHead, C.ink]} as const;

export const StatusPill: React.FC<{tone: 'warm' | 'cool' | 'neutral'; children: React.ReactNode}> = ({tone, children}) => (
  <span style={{...chip(TONES[tone][0]), color: TONES[tone][1]}}>{children}</span>
);

export const CommunityChip: React.FC<{community: Community}> = ({community}) => {
  const Icon = community.icon;
  return (
    <span style={{...chip(TINTS[community.tint].tile), gap: 6}}>
      <Icon size={14} strokeWidth={1.5} color={C.ink} />
      {community.name}
    </span>
  );
};

/** Brick Red count badge, white tabular figure. */
export const Badge: React.FC<{count: number | string; size?: number}> = ({count, size = 16}) => (
  <span
    style={{
      display: 'inline-grid',
      placeItems: 'center',
      minWidth: size,
      height: size,
      padding: `0 ${size / 4}px`,
      boxSizing: 'border-box',
      borderRadius: R.pill,
      backgroundColor: C.dangerDeep,
      color: C.cardStrong,
      fontFamily: FONT,
      ...TYPE.caption12,
      fontSize: size <= 16 ? 12 : Math.round(size * 0.6),
      lineHeight: `${size}px`,
      fontWeight: size <= 16 ? 500 : 600,
      letterSpacing: 'normal',
    }}
  >
    {count}
  </span>
);
