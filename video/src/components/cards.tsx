import type {LucideIcon} from 'lucide-react';
import {Check, Pencil, TrendingUp} from 'lucide-react';
import React from 'react';
import type {Community} from '../data';
import {formatNumber} from '../data';
import {FONT} from '../fonts';
import {C, EASE, R, TYPE} from '../theme';
import {SecondaryButton} from './buttons';
import {AiChip} from './chips';
import {IconTile, TINTS} from './surfaces';

/** Splits "+18% this week" into the signed figure and its descriptor. */
const splitTrend = (trend: string): [string, string] => {
  const [figure, ...rest] = trend.split(' ');
  return [figure, rest.join(' ')];
};

/** Today stat card: tile, Stat number and label, then the trend row. `progress` ticks the number. */
export const StatCard: React.FC<{
  tint: 'peach' | 'lavender' | 'aqua' | 'white';
  icon: LucideIcon;
  value: number;
  label: string;
  trend: string;
  progress?: number;
  style?: React.CSSProperties;
}> = ({tint, icon, value, label, trend, progress = 1, style}) => {
  const [figure, descriptor] = splitTrend(trend);
  const lavender = tint === 'lavender';
  return (
    <div style={{backgroundColor: TINTS[tint].bg, borderRadius: R.card, padding: 24, boxSizing: 'border-box', fontFamily: FONT, ...style}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
        <IconTile tint={tint} icon={icon} />
        <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 56}}>
          <span style={{...TYPE.stat, color: C.inkSoft, lineHeight: '38px'}}>{formatNumber(value * progress)}</span>
          <span style={{...TYPE.smallStrong, color: C.inkSoft}}>{label}</span>
        </div>
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 8, marginTop: 16}}>
        <TrendingUp size={20} strokeWidth={1.5} color={C.successInk} />
        <span style={{...TYPE.trend, color: lavender ? C.ink : C.successInk}}>{figure}</span>
        <span style={{...TYPE.body, color: lavender ? C.inkSoft : C.inkMuted}}>{descriptor}</span>
      </div>
    </div>
  );
};

/**
 * Community card (machine-card layout): tile and H1 name, open space, members line with trend; ghost pencil or a
 * Join pill at the bottom right. `selected` draws the 2 px ink border and check; `suggested` brings in the AI chip.
 */
export const CommunityCard: React.FC<{
  community: Community;
  join?: boolean;
  selected?: number;
  suggested?: number;
  reason?: string;
  compact?: boolean;
  style?: React.CSSProperties;
}> = ({community, join, selected = 0, suggested = 0, reason, compact, style}) => {
  const lavender = community.tint === 'lavender';
  const pad = compact ? 16 : 24;
  const s = EASE.expo(Math.max(0, Math.min(1, suggested)));
  return (
    <div style={{position: 'relative', backgroundColor: TINTS[community.tint].bg, borderRadius: compact ? R.idea : R.card, padding: pad, boxSizing: 'border-box', fontFamily: FONT, ...style}}>
      <div style={{display: 'flex', alignItems: 'center', gap: compact ? 12 : 16}}>
        <IconTile tint={community.tint} icon={community.icon} size={compact ? 40 : 56} />
        <div style={{display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0}}>
          <span style={{...(compact ? TYPE.h2 : TYPE.h1), color: C.inkSoft, whiteSpace: 'nowrap'}}>{community.name}</span>
          {suggested > 0 ? (
            <div style={{display: 'flex', alignItems: 'center', gap: 8, opacity: s, translate: `0 ${(1 - s) * 6}px`}}>
              <AiChip variant="suggested" />
              {reason ? <span style={{...TYPE.small, color: lavender ? C.inkSoft : C.inkMuted}}>{reason}</span> : null}
            </div>
          ) : null}
        </div>
      </div>
      <div style={{display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: compact ? 14 : 40}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 8, fontSize: compact ? 15 : 18, lineHeight: '24px'}}>
          <span style={{fontWeight: 400, color: lavender ? C.inkSoft : C.inkMuted}}>Members</span>
          <span style={{...TYPE.trend, fontSize: 'inherit', color: C.inkSoft}}>{formatNumber(community.members)}</span>
          <TrendingUp size={compact ? 16 : 20} strokeWidth={1.5} color={C.successInk} />
          <span style={{...TYPE.trend, fontSize: 'inherit', color: lavender ? C.ink : C.successInk}}>{community.trend}</span>
        </div>
        {join ? (
          <SecondaryButton height={compact ? 40 : 44}>Join</SecondaryButton>
        ) : (
          <span style={{display: 'grid', placeItems: 'center', width: 40, height: 40}}>
            <Pencil size={20} strokeWidth={1.5} color={C.ink} />
          </span>
        )}
      </div>
      {selected > 0 ? (
        <>
          <div style={{position: 'absolute', inset: 0, borderRadius: compact ? R.idea : R.card, border: `2px solid ${C.ink}`, opacity: selected}} />
          <span
            style={{
              position: 'absolute',
              top: pad,
              right: pad,
              display: 'grid',
              placeItems: 'center',
              width: 24,
              height: 24,
              borderRadius: 9999,
              backgroundColor: C.ink,
              opacity: selected,
              scale: `${0.6 + 0.4 * EASE.expo(selected)}`,
            }}
          >
            <Check size={16} strokeWidth={2} color={C.cardStrong} />
          </span>
        </>
      ) : null}
    </div>
  );
};
