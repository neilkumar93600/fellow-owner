import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Haze, ShellStage} from '../../components';
import {Grain, ramp} from '../../motion';
import {C, EASE, R} from '../../theme';
import {START} from '../../timeline';

const BLOOM_END = 45;

/**
 * Frames 0 to 44: the page (as PageBackdrop: page, page haze, grain) with the pewter shell blooming out of the
 * centre (clip-path inset) while its haze fades in and the page haze fades out. By frame 44 every layer equals
 * ShellStage with hazeDrift 0, which takes over from 45 and eases its breathing in, so the seam has no pop.
 */
export const BloomStage: React.FC<{children?: React.ReactNode}> = ({children}) => {
  const frame = useCurrentFrame();
  if (frame >= BLOOM_END) {
    return (
      <ShellStage frameOffset={START.Solution} hazeDrift={ramp(frame, BLOOM_END, 60, EASE.quart)}>
        {children}
      </ShellStage>
    );
  }
  const open = ramp(frame, 6, 34);
  const hazeIn = ramp(frame, 12, 32, EASE.quart);
  const ix = 920 * (1 - open);
  const iy = 500 * (1 - open);
  return (
    <AbsoluteFill style={{backgroundColor: C.page}}>
      <Haze variant="page" style={{opacity: 1 - open}} />
      <div
        style={{
          position: 'absolute',
          left: 40,
          top: 40,
          width: 1840,
          height: 1000,
          borderRadius: R.shell,
          backgroundColor: C.shell,
          clipPath: `inset(${iy}px ${ix}px ${iy}px ${ix}px round ${R.shell}px)`,
        }}
      >
        <Haze variant="shell" style={{opacity: hazeIn, borderRadius: R.shell}} />
      </div>
      <Grain frameOffset={START.Solution} />
      <AbsoluteFill>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};
