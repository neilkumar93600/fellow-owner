import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {clamp, seeded} from '../../motion';
import {C, EASE} from '../../theme';

/** About 40 faint, textless DM shapes that fall in from above the frame from 40 on, behind the pile. */
const GHOSTS = Array.from({length: 40}, (_, i) => {
  const lines = seeded(`ghost-l${i}`) < 0.5 ? 2 : 3;
  return {
    x: -60 + seeded(`ghost-x${i}`) * 1900,
    w: 150 + seeded(`ghost-w${i}`) * 80,
    h: 28 + lines * 16,
    lines,
    t0: 40 + seeded(`ghost-t${i}`) ** 1.3 * 180,
    v: 2.5 + seeded(`ghost-v${i}`) * 2.5,
    r: -8 + seeded(`ghost-r${i}`) * 16,
    phase: seeded(`ghost-p${i}`) * Math.PI * 2,
    opacity: 0.35 + seeded(`ghost-o${i}`) * 0.15,
  };
});

export const Ghosts: React.FC = () => {
  const frame = useCurrentFrame();
  // Slower parallax than the pile's 1.0 to 1.05 push.
  const push = interpolate(frame, [30, 209], [1, 1.02], {...clamp, easing: EASE.inOut});
  return (
    <AbsoluteFill style={{scale: `${push}`}}>
      {GHOSTS.map((g, i) => {
        const y = -g.h - 40 + (frame - g.t0) * g.v;
        if (frame < g.t0 || y > 1120) return null;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: g.x + 30 * Math.sin(frame * 0.02 + g.phase),
              top: y,
              width: g.w,
              height: g.h,
              padding: '14px 16px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              borderRadius: 18,
              backgroundColor: C.cardStrong,
              opacity: g.opacity,
              rotate: `${g.r + 4 * Math.sin(frame * 0.015 + g.phase)}deg`,
            }}
          >
            {Array.from({length: g.lines}, (__, k) => (
              <div key={k} style={{height: 8, width: k === g.lines - 1 ? '60%' : '100%', borderRadius: 4, backgroundColor: C.lineRow}} />
            ))}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
