import React, {useId} from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {formatNumber} from '../data';
import {C, EASE, TNUM} from '../theme';
import {clamp} from './core';

/** Each line rises out of its own mask (ease-out-expo); optional exit lifts it out the top (ease-in). */
export const LineReveal: React.FC<{
  lines: string[];
  start: number;
  stagger?: number;
  duration?: number;
  exitAt?: number;
  exitDuration?: number;
  style?: React.CSSProperties;
  lineStyle?: React.CSSProperties;
}> = ({lines, start, stagger = 5, duration = 20, exitAt, exitDuration = 12, style, lineStyle}) => {
  const frame = useCurrentFrame();
  return (
    <div style={style}>
      {lines.map((line, i) => {
        const inY = interpolate(frame, [start + i * stagger, start + i * stagger + duration], [110, 0], {...clamp, easing: EASE.expo});
        const outY =
          exitAt === undefined
            ? 0
            : interpolate(frame, [exitAt + i * Math.round(stagger / 2), exitAt + i * Math.round(stagger / 2) + exitDuration], [0, -110], {
                ...clamp,
                easing: EASE.in,
              });
        return (
          <div key={i} style={{overflow: 'hidden', paddingBottom: '0.12em', marginBottom: '-0.12em', ...lineStyle}}>
            <div style={{translate: `0 ${inY + outY}%`, whiteSpace: 'pre'}}>{line}</div>
          </div>
        );
      })}
    </div>
  );
};

const STRIP = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

/**
 * Mechanical counter: one digit strip per column. Column i counts floor(v / 10^i) on the shared eased progress,
 * so every column lands exactly on its digit while the low columns spin faster. Vertical motion blur comes from
 * each column's frame-to-frame travel; leading columns (and their commas) grow in as the value reaches them.
 */
export const Odometer: React.FC<{value: number; from?: number; start: number; duration: number; style?: React.CSSProperties}> = ({
  value,
  from = 0,
  start,
  duration,
  style,
}) => {
  const frame = useCurrentFrame();
  const id = useId().replace(/:/g, '');
  const progressAt = (f: number) => interpolate(f, [start, start + Math.max(1, duration)], [0, 1], {...clamp, easing: EASE.expo});
  const p = progressAt(frame);
  const pPrev = progressAt(frame - 1);
  const current = from + (value - from) * p;
  const digits = String(Math.max(Math.round(Math.abs(value)), Math.round(Math.abs(from)))).length;

  const columns: React.ReactNode[] = [];
  for (let i = digits - 1; i >= 0; i--) {
    const unit = 10 ** i;
    const a = Math.floor(from / unit);
    const b = Math.floor(value / unit);
    const pos = a + (b - a) * p;
    const prev = a + (b - a) * pPrev;
    const travel = Math.abs(pos - prev); // digits per frame
    const blur = Math.min(12, Math.round(travel * 6));
    const shown = i === 0 ? 1 : interpolate(current, [unit * 0.7, unit], [0, 1], clamp);
    const offset = ((pos % 10) + 10) % 10;
    const filterId = `${id}-c${i}`;
    columns.push(
      <span key={`d${i}`} style={{position: 'relative', display: 'inline-block', maxWidth: `${shown * 0.7}em`, opacity: shown, overflow: 'hidden', height: '1em', lineHeight: '1em', verticalAlign: 'top'}}>
        {blur > 0 ? (
          <svg width="0" height="0" style={{position: 'absolute'}}>
            <filter id={filterId} x="-10%" y="-50%" width="120%" height="200%">
              <feGaussianBlur stdDeviation={`0 ${blur}`} />
            </filter>
          </svg>
        ) : null}
        <span style={{visibility: 'hidden'}}>0</span>
        <span style={{position: 'absolute', left: 0, top: 0, display: 'flex', flexDirection: 'column', translate: `0 ${-offset}em`, filter: blur > 0 ? `url(#${filterId})` : undefined}}>
          {STRIP.map((d, k) => (
            <span key={k} style={{height: '1em', lineHeight: '1em'}}>
              {d}
            </span>
          ))}
        </span>
      </span>,
    );
    if (i > 0 && i % 3 === 0) {
      columns.push(
        <span key={`c${i}`} style={{display: 'inline-block', maxWidth: `${shown * 0.35}em`, opacity: shown, overflow: 'hidden', height: '1em', lineHeight: '1em', verticalAlign: 'top'}}>
          ,
        </span>,
      );
    }
  }

  return <span style={{display: 'inline-flex', whiteSpace: 'nowrap', ...TNUM, ...style, lineHeight: '1em'}}>{columns}</span>;
};

export const Ticker: React.FC<{
  from: number;
  to: number;
  start: number;
  duration: number;
  format?: (n: number) => string;
  easing?: (t: number) => number;
  style?: React.CSSProperties;
}> = ({from, to, start, duration, format = formatNumber, easing = EASE.expo, style}) => {
  const frame = useCurrentFrame();
  const v = interpolate(frame, [start, start + Math.max(1, duration)], [from, to], {...clamp, easing});
  return <span style={{...TNUM, ...style}}>{format(Math.round(v))}</span>;
};

/** Types `text` from `start`; the caret stays solid while typing, then blinks 15 frames on, 15 off. */
export const Typewriter: React.FC<{
  text: string;
  start: number;
  charsPerFrame?: number;
  caret?: boolean;
  caretUntil?: number;
  style?: React.CSSProperties;
}> = ({text, start, charsPerFrame = 1, caret = true, caretUntil, style}) => {
  const frame = useCurrentFrame();
  const count = Math.max(0, Math.min(text.length, Math.floor((frame - start) * charsPerFrame)));
  const typingEnds = start + Math.ceil(text.length / charsPerFrame);
  const blinkOn = frame < typingEnds || Math.floor((frame - typingEnds) / 15) % 2 === 0;
  const showCaret = caret && blinkOn && (caretUntil === undefined || frame < caretUntil);
  return (
    <span style={{whiteSpace: 'pre-wrap', ...style}}>
      {text.slice(0, count)}
      <span
        style={{
          display: 'inline-block',
          width: '0.08em',
          height: '1em',
          marginLeft: '0.04em',
          verticalAlign: '-0.12em',
          backgroundColor: C.ink,
          opacity: showCaret ? 1 : 0,
        }}
      />
    </span>
  );
};
