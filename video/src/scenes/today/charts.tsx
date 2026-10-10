import React from 'react';
import {Card, TINTS} from '../../components';
import {showcase} from '../../data';
import {FONT} from '../../fonts';
import {DrawPath, ramp} from '../../motion';
import {C, EASE, R, TYPE} from '../../theme';

// Panels for the Today screen: Inbox mix donut, Top ideas compact table, Fanbase activity line chart.
// Everything is positioned in px inside its card; frames are scene frames.

const H2: React.CSSProperties = {...TYPE.h2, color: C.ink};

// ---- Inbox mix donut ----

const SEGMENTS = [
  {label: 'Collabs', count: 4, color: C.orange}, // Marigold
  {label: 'Ideas', count: 3, color: C.purpleChart}, // Chart Violet
  {label: 'Fan notes', count: 3, color: C.teal}, // Lagoon Teal
];
const TOTAL = SEGMENTS.reduce((sum, s) => sum + s.count, 0);
const DONUT = {size: 112, stroke: 20, gap: 12};
const RADIUS = (DONUT.size - DONUT.stroke) / 2;
const CIRC = 2 * Math.PI * RADIUS;

export const InboxMix: React.FC<{f: number; draw: [number, number]}> = ({f, draw}) => {
  const progress = ramp(f, draw[0], draw[1] - draw[0], EASE.quart);
  let start = 0;
  const arcs = SEGMENTS.map((s) => {
    const length = (s.count / TOTAL) * CIRC;
    const from = start;
    start += length;
    // round caps add stroke / 2 to each end, so the visible gap is `gap` once both caps are subtracted
    const dash = length - DONUT.gap - DONUT.stroke;
    const local = clamp01((progress * CIRC - from) / length);
    return {...s, dash: dash * local, offset: -(from + (DONUT.gap + DONUT.stroke) / 2), local};
  });
  return (
    <Card tint="paper" style={{width: '100%', height: '100%', padding: 20}}>
      <div style={H2}>Inbox mix</div>
      <div style={{position: 'absolute', left: 20, top: 56, width: DONUT.size, height: DONUT.size}}>
        <svg width={DONUT.size} height={DONUT.size} viewBox={`0 0 ${DONUT.size} ${DONUT.size}`} style={{display: 'block'}}>
          <g transform={`rotate(-90 ${DONUT.size / 2} ${DONUT.size / 2})`}>
            {arcs.map((a) =>
              a.local > 0 ? (
                <circle
                  key={a.label}
                  cx={DONUT.size / 2}
                  cy={DONUT.size / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={DONUT.stroke}
                  strokeLinecap="round"
                  strokeDasharray={`${a.dash} ${CIRC}`}
                  strokeDashoffset={a.offset}
                />
              ) : null,
            )}
          </g>
        </svg>
        <div
          style={{
            position: 'absolute',
            left: (DONUT.size - 68) / 2,
            top: (DONUT.size - 68) / 2,
            width: 68,
            height: 68,
            boxSizing: 'border-box',
            borderRadius: R.pill,
            backgroundColor: C.cardStrong,
            border: `1px solid ${C.line}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{...TYPE.count, color: C.ink, lineHeight: '28px'}}>{Math.round(TOTAL * progress)}</span>
          <span style={{...TYPE.caption12, color: C.inkMuted}}>pitches</span>
        </div>
      </div>
      <div style={{position: 'absolute', left: 156, top: 68, right: 20, display: 'flex', flexDirection: 'column', gap: 14}}>
        {SEGMENTS.map((s) => (
          <div key={s.label} style={{display: 'flex', alignItems: 'center', gap: 8, ...TYPE.small, color: C.inkSoft}}>
            <span style={{width: 10, height: 10, borderRadius: R.pill, backgroundColor: s.color}} />
            <span style={{flex: 1}}>{s.label}</span>
            <span style={{...TYPE.smallStrong, color: C.ink}}>{s.count}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

// ---- Top ideas compact table ----

const IDEA_COLS = [262, 78, 45];
const TOP_IDEAS = [...showcase].sort((a, b) => b.signals - a.signals).slice(0, 3);

export const TopIdeas: React.FC = () => (
  <Card tint="paper" style={{width: '100%', height: '100%', padding: 20}}>
    <div style={H2}>Top ideas</div>
    <div style={{position: 'absolute', left: 20, right: 20, top: 56}}>
      <div style={{display: 'flex', alignItems: 'center', height: 24, borderBottom: `1px solid ${C.lineRow}`, ...TYPE.small, color: C.inkMuted}}>
        {['Idea', 'Community', 'Signals'].map((label, i) => (
          <span key={label} style={{width: IDEA_COLS[i], flex: 'none', textAlign: i === 2 ? 'right' : 'left'}}>
            {label}
          </span>
        ))}
      </div>
      {TOP_IDEAS.map((idea, i) => (
        <div key={idea.title} style={{display: 'flex', alignItems: 'center', height: 32, borderBottom: i < TOP_IDEAS.length - 1 ? `1px solid ${C.lineRow}` : undefined, ...TYPE.small, color: C.inkSoft}}>
          <span style={{width: IDEA_COLS[0], flex: 'none', display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', whiteSpace: 'nowrap'}}>
            <span style={{flex: 'none', width: 22, height: 22, borderRadius: R.pill, backgroundColor: TINTS[idea.tint].tile}} />
            <span style={{overflow: 'hidden', textOverflow: 'ellipsis', fontVariantNumeric: 'normal', fontFeatureSettings: 'normal'}}>{idea.title}</span>
          </span>
          <span style={{width: IDEA_COLS[1], flex: 'none', whiteSpace: 'nowrap', fontVariantNumeric: 'normal', fontFeatureSettings: 'normal'}}>{idea.community}</span>
          <span style={{width: IDEA_COLS[2], flex: 'none', textAlign: 'right', ...TYPE.smallStrong, color: C.ink}}>{idea.signals}</span>
        </div>
      ))}
    </div>
  </Card>
);

// ---- Fanbase activity line chart ----

const WEEKS = 12;
const JOINS = [38, 44, 41, 52, 49, 60, 57, 68, 72, 70, 82, 96];
const IDEAS = [14, 18, 15, 22, 19, 26, 24, 29, 27, 33, 31, 37];
const PLOT = {left: 64, right: 710, top: 62, bottom: 124, max: 100};
const TIP = {index: 8, at: 80};

const px = (i: number) => PLOT.left + ((PLOT.right - PLOT.left) * i) / (WEEKS - 1);
const py = (v: number) => PLOT.bottom - ((PLOT.bottom - PLOT.top) * v) / PLOT.max;

/** Monotone cubic through the points (Fritsch-Carlson, as d3 curveMonotoneX), as an SVG path. */
function monotonePath(values: number[]): string {
  const xs = values.map((_, i) => px(i));
  const ys = values.map(py);
  const n = values.length;
  const h = xs.slice(1).map((x, i) => x - xs[i]);
  const s = ys.slice(1).map((y, i) => (y - ys[i]) / h[i]);
  const t: number[] = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    if (s[i - 1] * s[i] <= 0) continue;
    const p = (s[i - 1] * h[i] + s[i] * h[i - 1]) / (h[i - 1] + h[i]);
    t[i] = (Math.sign(s[i - 1]) + Math.sign(s[i])) * Math.min(Math.abs(s[i - 1]), Math.abs(s[i]), 0.5 * Math.abs(p));
  }
  t[0] = (3 * s[0] - t[1]) / 2;
  t[n - 1] = (3 * s[n - 2] - t[n - 2]) / 2;
  let d = `M${xs[0].toFixed(2)} ${ys[0].toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const k = h[i] / 3;
    d += ` C${(xs[i] + k).toFixed(2)} ${(ys[i] + t[i] * k).toFixed(2)} ${(xs[i + 1] - k).toFixed(2)} ${(ys[i + 1] - t[i + 1] * k).toFixed(2)} ${xs[i + 1].toFixed(2)} ${ys[i + 1].toFixed(2)}`;
  }
  return d;
}

const JOINS_PATH = monotonePath(JOINS);
const IDEAS_PATH = monotonePath(IDEAS);
const VIEW = '0 0 745 170';

export const ActivityChart: React.FC<{f: number; draw: [number, number]}> = ({f, draw}) => {
  const duration = draw[1] - draw[0];
  const pop = ramp(f, TIP.at, 10, EASE.expo);
  const tipX = px(TIP.index);
  const tipY = py(JOINS[TIP.index]);
  return (
    <Card tint="paper" style={{width: '100%', height: '100%', padding: 20}}>
      <div style={H2}>Fanbase activity</div>
      <div style={{position: 'absolute', right: 20, top: 20, height: 28, display: 'flex', alignItems: 'center', gap: 20, ...TYPE.body, color: C.inkSoft}}>
        {[
          ['Joins', C.orange],
          ['Ideas', C.purpleChart],
        ].map(([label, color]) => (
          <span key={label} style={{display: 'flex', alignItems: 'center', gap: 8}}>
            <span style={{width: 10, height: 10, borderRadius: R.pill, backgroundColor: color}} />
            {label}
          </span>
        ))}
      </div>
      <svg width={745} height={170} viewBox={VIEW} style={{position: 'absolute', left: 0, top: 0}}>
        {Array.from({length: WEEKS}, (_, i) => (
          <line key={i} x1={px(i)} x2={px(i)} y1={PLOT.top - 6} y2={PLOT.bottom} stroke={C.line} strokeWidth={1} />
        ))}
      </svg>
      {[0, 50, 100].map((v) => (
        <span key={v} style={{position: 'absolute', left: 20, width: 28, top: py(v) - 9, textAlign: 'right', ...TYPE.small, color: C.inkSoft}}>
          {v}
        </span>
      ))}
      {Array.from({length: WEEKS}, (_, i) => (
        <span key={i} style={{position: 'absolute', left: px(i) - 24, width: 48, top: PLOT.bottom + 8, textAlign: 'center', whiteSpace: 'nowrap', ...TYPE.small, color: C.inkSoft}}>
          Wk {i + 1}
        </span>
      ))}
      <DrawPath d={IDEAS_PATH} start={draw[0] + 4} duration={duration} stroke={C.purpleChart} strokeWidth={2.5} viewBox={VIEW} width={745} height={170} style={{position: 'absolute', left: 0, top: 0}} />
      <DrawPath d={JOINS_PATH} start={draw[0]} duration={duration} stroke={C.orange} strokeWidth={2.5} viewBox={VIEW} width={745} height={170} style={{position: 'absolute', left: 0, top: 0}} />
      {pop > 0 ? (
        <>
          <div style={{position: 'absolute', left: tipX, top: PLOT.top - 6, width: 1, height: PLOT.bottom - PLOT.top + 6, backgroundColor: C.lineStrong, transformOrigin: 'bottom', scale: `1 ${pop}`}} />
          <span style={{position: 'absolute', left: tipX - 5, top: tipY - 5, width: 10, height: 10, boxSizing: 'border-box', borderRadius: R.pill, backgroundColor: C.orange, border: `2px solid ${C.cardStrong}`, scale: `${pop}`}} />
          <span
            style={{
              position: 'absolute',
              left: tipX - 26,
              top: tipY - 42,
              width: 52,
              height: 28,
              display: 'grid',
              placeItems: 'center',
              borderRadius: R.pill,
              backgroundColor: C.lime,
              fontFamily: FONT,
              color: C.ink,
              ...TYPE.label,
              fontVariantNumeric: 'tabular-nums',
              transformOrigin: '50% 150%',
              scale: `${pop}`,
            }}
          >
            {JOINS[TIP.index]}
          </span>
        </>
      ) : null}
    </Card>
  );
};
