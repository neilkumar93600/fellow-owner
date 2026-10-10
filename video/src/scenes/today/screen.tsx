import {Handshake, Lightbulb, ThumbsDown, ThumbsUp, Users} from 'lucide-react';
import React from 'react';
import {interpolateColors} from 'remotion';
import {AiChip, Card, DASHBOARD, StatCard} from '../../components';
import {briefing, stats} from '../../data';
import {FONT} from '../../fonts';
import {ramp} from '../../motion';
import {C, EASE, R, TYPE} from '../../theme';
import {ActivityChart, InboxMix, TopIdeas} from './charts';

// The Today screen at product scale, laid out in the 1128 x 650 content box (12 columns, 20 gaps: 4 + 8 columns).
// The page is taller than the box in the product; here the right column is compressed to fit and the
// "This week" card is cut by the box bottom, as a scrolled page would be.

const LEFT = {x: 0, w: 363};
const RIGHT = {x: 383, w: 745};
const PAD = 20;

/** Briefing highlight rows in dashboard coordinates (the camera and the lift-out in Today.tsx aim at these). */
export const ROW = {x: DASHBOARD.content.x + RIGHT.x + PAD, y: DASHBOARD.content.y + PAD + 28 + 2 + 22 + 8, w: RIGHT.w - 2 * PAD, h: 48} as const;
export const rowCenterY = (i: number) => ROW.y + i * ROW.h + ROW.h / 2;
/** Beats on which the highlight chips pulse and the cursor arrives on each row. */
export const BEATS = [105, 120, 135] as const;
const HOVER_OUT = [113, 128, 144] as const;

const STAT_ICONS = [Users, Lightbulb, Handshake] as const;

const enter = (f: number, start: number) => ramp(f, start, 20, EASE.expo);

/** A panel that rises into place: translateY 30 to 0 while its mask opens from the top, with a quick opacity assist. */
const Rise: React.FC<{f: number; start: number; x: number; y: number; w: number; h: number; children: React.ReactNode}> = ({f, start, x, y, w, h, children}) => {
  const p = enter(f, start);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        ...(p < 1 ? {translate: `0 ${(1 - p) * 30}px`, opacity: Math.min(1, p * 3), clipPath: `inset(0 0 ${(1 - p) * 35}% 0)`} : {}),
      }}
    >
      {children}
    </div>
  );
};

export const BriefingRow: React.FC<{index: number; pulse?: number; hover?: number; transparent?: boolean}> = ({index, pulse = 0, hover = 0, transparent}) => {
  const h = briefing.highlights[index];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        width: ROW.w,
        height: ROW.h,
        padding: '0 12px',
        boxSizing: 'border-box',
        borderRadius: 16,
        fontFamily: FONT,
        backgroundColor: transparent ? 'transparent' : interpolateColors(hover, [0, 1], [C.card, C.cardStrong]),
      }}
    >
      <span style={{display: 'inline-flex', flex: 'none', scale: `${1 + 0.18 * pulse}`}}>
        <AiChip variant="pick" />
      </span>
      <div style={{flex: 1, minWidth: 0}}>
        <div style={{...TYPE.label, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{h.title}</div>
        <div style={{...TYPE.small, color: C.inkMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'normal', fontFeatureSettings: 'normal'}}>{h.why}</div>
      </div>
      <ThumbsUp size={16} strokeWidth={1.5} color={C.inkSoft} style={{flex: 'none'}} />
      <ThumbsDown size={16} strokeWidth={1.5} color={C.inkSoft} style={{flex: 'none'}} />
    </div>
  );
};

const pulseAt = (f: number, beat: number) => {
  const up = ramp(f, beat, 4, EASE.quart);
  const down = ramp(f, beat + 4, 8, EASE.quart);
  return up - down;
};

const hoverAt = (f: number, i: number) => ramp(f, BEATS[i] - 3, 6, EASE.quart) - ramp(f, HOVER_OUT[i], 6, EASE.quart);

const WEEK_ROWS = [
  ['Joins', '1,218', '412', '27'],
  ['Ideas', '342', '118', '6'],
  ['Pitches', '214', '61', '14'],
];

/** Builds itself from frame 12 (staggered rises); numbers tick 24 to 60, donut draws 30 to 60, lines draw 40 to 80, tooltip pops at 80. */
export const TodayScreen: React.FC<{f: number}> = ({f}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: DASHBOARD.content.width, height: DASHBOARD.content.height, overflow: 'hidden', fontFamily: FONT}}>
    <Rise f={f} start={12} x={LEFT.x} y={0} w={LEFT.w} h={72}>
      <div style={{width: '100%', height: '100%', borderRadius: `${R.card}px ${R.card}px 0 0`, backgroundColor: C.glass, display: 'flex', alignItems: 'center', padding: '0 24px', boxSizing: 'border-box', ...TYPE.h2, color: C.ink}}>Fanbase overview</div>
    </Rise>
    {stats.map((s, i) => (
      <Rise key={s.label} f={f} start={15 + 3 * i} x={LEFT.x} y={80 + 152 * i} w={LEFT.w} h={144}>
        <StatCard tint={s.tint} icon={STAT_ICONS[i]} value={s.value} label={s.label} trend={s.trend} progress={ramp(f, 24 + 4 * i, 36, EASE.expo)} style={{width: '100%', height: '100%'}} />
      </Rise>
    ))}
    <Rise f={f} start={24} x={LEFT.x} y={536} w={LEFT.w} h={114}>
      <Card tint="white" style={{width: '100%', height: '100%'}}>
        <div style={{...TYPE.h2, color: C.ink}}>This week</div>
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', marginTop: 12, ...TYPE.small, color: C.inkMuted}}>
          {['Total', 'This month', 'Today'].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        {WEEK_ROWS.map(([name, total, month, today]) => (
          <div key={name} style={{marginTop: 8}}>
            <div style={{...TYPE.smallStrong, color: C.ink}}>{name}</div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', ...TYPE.count, color: C.inkSoft}}>
              <span>{total}</span>
              <span>{month}</span>
              <span>{today}</span>
            </div>
          </div>
        ))}
      </Card>
    </Rise>

    <Rise f={f} start={13} x={RIGHT.x} y={0} w={RIGHT.w} h={244}>
      <Card tint="paper" style={{width: '100%', height: '100%', padding: PAD}}>
        <div style={{...TYPE.h2, color: C.ink}}>Your AI briefing</div>
        <div style={{...TYPE.body, color: C.inkSoft, marginTop: 2}}>{briefing.headline}</div>
        <div style={{position: 'absolute', left: PAD, top: PAD + 28 + 2 + 22 + 8}}>
          {briefing.highlights.map((h, i) => (
            <BriefingRow key={h.title} index={i} pulse={pulseAt(f, BEATS[i])} hover={hoverAt(f, i)} />
          ))}
        </div>
      </Card>
    </Rise>
    <Rise f={f} start={22} x={RIGHT.x} y={264} w={300} h={196}>
      <InboxMix f={f} draw={[30, 60]} />
    </Rise>
    <Rise f={f} start={26} x={RIGHT.x + 320} y={264} w={425} h={196}>
      <TopIdeas />
    </Rise>
    <Rise f={f} start={30} x={RIGHT.x} y={480} w={RIGHT.w} h={170}>
      <ActivityChart f={f} draw={[40, 80]} />
    </Rise>
  </div>
);
