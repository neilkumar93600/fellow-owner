import {AbsoluteFill, Easing, Interactive, useCurrentFrame} from 'remotion';
import {LogoLockup, PrimaryButton, SecondaryButton, ShellStage, SphereCanvas} from '../components';
import {FONT} from '../fonts';
import {DrawPath, LineReveal, ramp} from '../motion';
import {C, EASE} from '../theme';
import type {Cue} from '../timeline';
import {START} from '../timeline';
import {ORIGIN, ringLines, spheresAt} from './outro/field';

export const CUES: Cue[] = [
  {frame: 0, sfx: 'whoosh', volume: 0.35},
  {frame: 50, sfx: 'shutter', volume: 0.3},
  {frame: 80, sfx: 'whoosh', volume: 0.2},
  {frame: 112, sfx: 'ding', volume: 0.3},
];

const LINES = ringLines();

const centred = (top: number): React.CSSProperties => ({position: 'absolute', left: 0, right: 0, top, translate: '0 -50%', display: 'flex', justifyContent: 'center'});

/** A button rising out of its own mask. */
const Rise: React.FC<{start: number; children: React.ReactNode}> = ({start, children}) => {
  const y = 110 * (1 - ramp(useCurrentFrame(), start, 15, EASE.expo));
  return (
    <div style={{overflow: 'hidden', paddingBottom: 4, marginBottom: -4}}>
      <div style={{translate: `0 ${y}%`}}>{children}</div>
    </div>
  );
};

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const stage = 1 + 0.02 * ramp(frame, 170, 69, Easing.linear);
  const lockup = ramp(frame, 50, 30, EASE.expo);

  return (
    <ShellStage frameOffset={START.Outro}>
      <AbsoluteFill style={{fontFamily: FONT, color: C.ink, scale: stage, transformOrigin: '960px 540px'}}>
        <Interactive.Div name="Ring lines" style={{position: 'absolute', inset: 0}}>
          {LINES.map((d, i) => (
            <DrawPath key={i} d={d} start={40 + i * 4} duration={30} stroke="rgba(255,255,255,0.7)" strokeWidth={2} viewBox="0 0 1920 1080" width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}} />
          ))}
        </Interactive.Div>

        <Interactive.Div name="Followers" style={{position: 'absolute', inset: 0}}>
          <SphereCanvas spheres={spheresAt(frame)} cx={ORIGIN.x} cy={ORIGIN.y} focal={2400} focusZ={0} dof={0.6} shadow={frame >= 12} />
        </Interactive.Div>

        <Interactive.Div name="Lockup" style={centred(430)}>
          <LogoLockup size={72} split={lockup} reveal={lockup} style={{scale: `${ramp(frame, 50, 12, EASE.expo)}`}} />
        </Interactive.Div>
        <Interactive.Div name="Tagline" style={{...centred(560), fontSize: 64, fontWeight: 500, letterSpacing: '-0.02em'}}>
          <LineReveal lines={['Turn followers into fellow owners.']} start={80} />
        </Interactive.Div>
        <Interactive.Div name="Calls to action" style={{...centred(680), gap: 24}}>
          <Rise start={110}>
            <PrimaryButton height={76}>
              <span style={{fontSize: 30, fontWeight: 500, margin: '0 16px'}}>Start your space</span>
            </PrimaryButton>
          </Rise>
          <Rise start={115}>
            <SecondaryButton height={76}>
              <span style={{fontSize: 30, fontWeight: 500, margin: '0 20px'}}>Try the demo</span>
            </SecondaryButton>
          </Rise>
        </Interactive.Div>
        <Interactive.Div name="Address" style={{...centred(780), fontSize: 34, fontWeight: 500}}>
          <LineReveal lines={['fellowowners.app']} start={125} />
        </Interactive.Div>
      </AbsoluteFill>
    </ShellStage>
  );
};
