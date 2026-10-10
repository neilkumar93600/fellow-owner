import {AbsoluteFill, Easing, Interactive, useCurrentFrame} from 'remotion';
import {MiraChip, PageBackdrop, SphereCanvas} from '../components';
import {FONT} from '../fonts';
import {LineReveal, mix, ramp} from '../motion';
import {C, EASE, TYPE} from '../theme';
import type {Cue} from '../timeline';
import {START} from '../timeline';
import {fieldAt, ORIGIN} from './hook/field';
import {FOLLOWERS_X, FormingChip} from './hook/FormingChip';
import {HeroNumber} from './hook/HeroNumber';

export const CUES: Cue[] = [
  {frame: 2, sfx: 'switch', volume: 0.2},
  {frame: 30, sfx: 'whoosh', volume: 0.4},
  {frame: 75, sfx: 'shutter', volume: 0.3},
  {frame: 105, sfx: 'whoosh', volume: 0.3},
  {frame: 150, sfx: 'switch', volume: 0.25},
  {frame: 210, sfx: 'ding', volume: 0.25},
];

const COPY: React.CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: 740,
  translate: '0 -50%',
  textAlign: 'center',
  fontSize: 84,
  lineHeight: 1.05,
  fontWeight: 500,
  letterSpacing: '-0.02em',
};

/** From here on the chip is the kit MiraChip itself (badge fully popped), so H1 matches Problem frame 0 exactly. */
const KIT_CHIP_FROM = 218;

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const field = fieldAt(frame);

  // Foreground camera: a slow 2 % drift through the reading holds, then the push onto the chip (1.4 at 225).
  const cam = 1 + 0.02 * ramp(frame, 90, 90, Easing.linear) + 0.38 * ramp(frame, 180, 45, EASE.inOut);

  // Number: rises out of its mask, swells to 1.03 during the roll and settles on the beat at 75; at 160 it shrinks
  // (0.1 x = the chip's 22 px) from the chip centre to the followers line and crossfades into it.
  const rise = ramp(frame, 0, 12, EASE.expo);
  const settle = frame < 75 ? mix(1, 1.03, ramp(frame, 30, 45, EASE.expo)) : mix(1.03, 1, ramp(frame, 75, 15, EASE.quart));
  // The pill and avatar only start once the number is below ~0.4 x (frame 166), so they never form under the big glyphs.
  const travel = ramp(frame, 160, 11, EASE.inOut);
  const merge = ramp(frame, 168, 6, Easing.linear);
  const badge = frame < 210 ? 0 : frame < 221 ? 1 : frame < 232 ? 2 : 3;

  return (
    <AbsoluteFill style={{fontFamily: FONT, color: C.ink}}>
      <PageBackdrop haze={mix(0.7, 1, ramp(frame, 180, 45, EASE.inOut))} frameOffset={START.Hook} />

      <Interactive.Div name="Far followers" style={{position: 'absolute', inset: 0}}>
        <SphereCanvas spheres={field.far} cx={ORIGIN.x} cy={ORIGIN.y} dof={0.005} />
      </Interactive.Div>

      <Interactive.Div name="Copy" style={{position: 'absolute', inset: 0, scale: cam, transformOrigin: '960px 540px'}}>
        {/* Two rows that stay up together (line 1 ~100 frames, line 2 ~75), so each sentence clears the 45-frame
            read and the second never crosses the first. Both lift out with the push. */}
        <div style={COPY}>
          <LineReveal lines={['people follow Mira.']} start={80} exitAt={192} exitDuration={15} />
        </div>
        <div style={{...COPY, top: 840}}>
          <LineReveal lines={['Until now, they were one number.']} start={110} exitAt={195} exitDuration={15} />
        </div>
      </Interactive.Div>

      <Interactive.Div name="Mira chip" style={{position: 'absolute', left: 960, top: 540, translate: '-50% -50%', scale: cam, transformOrigin: 'center'}}>
        {frame < KIT_CHIP_FROM ? (
          <FormingChip
            pill={ramp(frame, 166, 8, EASE.expo)}
            pillWidth={mix(0.3, 1, ramp(frame, 166, 15, EASE.expo))}
            avatar={ramp(frame, 167, 12, EASE.expo)}
            name={ramp(frame, 172, 14, EASE.expo)}
            followers={merge}
            badge={badge}
            badgeScale={ramp(frame, 210, 8, EASE.expo)}
          />
        ) : (
          <MiraChip badge={badge} followers="740K followers" />
        )}
        {merge < 1 ? (
          // Placed in the chip box: centred on it (= the frame centre) at first; at the end its left edge sits on the
          // followers line at 0.1 x. Percent translate is of its own width, so nothing needs measuring.
          <div
            style={{
              position: 'absolute',
              left: `calc(${(1 - travel) * 50}% + ${travel * FOLLOWERS_X}px)`,
              top: mix(68, 66, travel),
              translate: `${5 * travel - 50}% -50%`,
              scale: 0.1 ** travel,
              opacity: 1 - merge,
              ...TYPE.heroNumber,
            }}
          >
            <div style={{display: 'flex', scale: settle, overflow: 'hidden'}}>
              <div style={{display: 'flex', translate: `0 ${(1 - rise) * 100}%`}}>
                <HeroNumber />
              </div>
            </div>
          </div>
        ) : null}
      </Interactive.Div>

      <Interactive.Div name="Near followers" style={{position: 'absolute', inset: 0}}>
        <SphereCanvas spheres={field.near} cx={ORIGIN.x} cy={ORIGIN.y} dof={0.014} />
      </Interactive.Div>
    </AbsoluteFill>
  );
};
