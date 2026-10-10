import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Odometer, ramp} from '../../motion';
import {EASE, TNUM} from '../../theme';

export const CONDENSE = 140;

/**
 * One glyph in the same box the kit Odometer gives a column at rest (so the swap at CONDENSE is invisible), plus
 * a width that can collapse or grow (calc-size of its own fit-content width) and a vertical roll inside its mask.
 */
const Glyph: React.FC<{ch: string; maxWidth: string; width?: number; roll?: number; opacity?: number}> = ({ch, maxWidth, width = 1, roll = 0, opacity = 1}) => (
  <span
    style={{
      position: 'relative',
      display: 'inline-block',
      maxWidth,
      width: width < 1 ? `calc-size(fit-content, size * ${width})` : undefined,
      opacity,
      overflow: 'hidden',
      height: '1em',
      lineHeight: '1em',
      verticalAlign: 'top',
    }}
  >
    <span style={{display: 'block', translate: roll ? `0 ${roll}%` : undefined}}>{ch}</span>
  </span>
);

/** 1, then 10, then the roll to 740,000 (kit Odometer); from CONDENSE ",000" rolls away and a K rolls in: 740K. */
export const HeroNumber: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 30) return <Odometer from={1} value={10} start={15} duration={12} />;
  // 44 frames so the last column is already still (unblurred) on the beat at 75
  if (frame < CONDENSE) return <Odometer from={10} value={740000} start={30} duration={44} />;
  const k = ramp(frame, 150, 10, EASE.expo);
  return (
    <span style={{display: 'inline-flex', whiteSpace: 'nowrap', ...TNUM, lineHeight: '1em'}}>
      {['7', '4', '0'].map((d, i) => (
        <Glyph key={`d${i}`} ch={d} maxWidth="0.7em" />
      ))}
      {[',', '0', '0', '0'].map((ch, i) => {
        const c = ramp(frame, CONDENSE + i, 12, EASE.in);
        return <Glyph key={`z${i}`} ch={ch} maxWidth={i === 0 ? '0.35em' : '0.7em'} width={1 - c} roll={-100 * c} opacity={1 - c} />;
      })}
      {frame >= 150 ? <Glyph ch="K" maxWidth="none" width={k} roll={100 * (1 - k)} /> : null}
    </span>
  );
};
