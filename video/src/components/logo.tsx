import React from 'react';
import {interpolate} from 'remotion';
import {FONT} from '../fonts';
import {clamp} from '../motion';
import {C, EASE} from '../theme';

// Proportions from DESIGN.json .ds-logo at wordmark size 15: 20 px circles, 2 px border, second circle at +12, gap 12.

/** Two overlapping ink circles: the filled one, and an outlined one that slides out to its offset with `split`. */
export const LogoMark: React.FC<{size?: number; split?: number}> = ({size = 15, split = 1}) => {
  const k = size / 15;
  const d = 20 * k;
  const ring: React.CSSProperties = {position: 'absolute', top: 0, width: d, height: d, boxSizing: 'border-box', border: `${2 * k}px solid ${C.ink}`, borderRadius: 9999};
  return (
    <span style={{position: 'relative', display: 'inline-block', flex: 'none', width: d + 12 * k * split, height: d}}>
      <span style={{...ring, left: 0, backgroundColor: C.ink}} />
      <span style={{...ring, left: 12 * k * split}} />
    </span>
  );
};

const WORD = 'Fellow Owners';

/** "Fellow Owners" in Label Strong proportions; `reveal` staggers the letters in. */
export const Wordmark: React.FC<{size?: number; reveal?: number}> = ({size = 15, reveal = 1}) => {
  const n = WORD.length;
  return (
    <span style={{fontFamily: FONT, fontSize: size, lineHeight: `${(22 / 15) * size}px`, fontWeight: 600, color: C.ink, whiteSpace: 'pre', display: 'inline-flex'}}>
      {WORD.split('').map((ch, i) => {
        // Each letter takes 40% of the reveal window, starting in order.
        const t = interpolate(reveal, [(i / n) * 0.6, (i / n) * 0.6 + 0.4], [0, 1], {...clamp, easing: EASE.expo});
        return (
          <span key={i} style={{display: 'inline-block', opacity: t, translate: `0 ${(1 - t) * 0.35}em`}}>
            {ch}
          </span>
        );
      })}
    </span>
  );
};

export const LogoLockup: React.FC<{size?: number; split?: number; reveal?: number; style?: React.CSSProperties}> = ({size = 15, split, reveal, style}) => (
  <div style={{display: 'inline-flex', alignItems: 'center', gap: (12 * size) / 15, fontFamily: FONT, ...style}}>
    <LogoMark size={size} split={split} />
    <Wordmark size={size} reveal={reveal} />
  </div>
);
