import {AbsoluteFill, Interactive, interpolate, useCurrentFrame} from 'remotion';
import {Badge, DMBubble, MiraChip, PageBackdrop} from '../components';
import {formatNumber, messages, PILE, SPAM_IDS} from '../data';
import {FONT} from '../fonts';
import {clamp, drift, LineReveal, mix, ramp, Ticker} from '../motion';
import {C, EASE, R, TYPE} from '../theme';
import type {Cue} from '../timeline';
import {START} from '../timeline';
import {Ghosts} from './problem/Ghosts';

export const CUES: Cue[] = [
  {frame: 12, sfx: 'whoosh', volume: 0.35},
  {frame: 40, sfx: 'switch', volume: 0.2},
  {frame: 165, sfx: 'whip', volume: 0.4},
  {frame: 177, sfx: 'whip', volume: 0.3},
  {frame: 217, sfx: 'click', volume: 0.25},
  {frame: 232, sfx: 'click', volume: 0.25},
  {frame: 247, sfx: 'click', volume: 0.25},
  {frame: 330, sfx: 'whoosh', volume: 0.4},
];

const MSG = Object.fromEntries(messages.map((m) => [m.id, m]));
const SLOT = Object.fromEntries(PILE.map((p) => [p.id, p.desk]));

// DMBubble at width 440: padding 20 + header 56 + gap 14 + two 30 px text lines + padding 20.
const BW = 440;
const BH = 170;
const REGION = {R: {x: 860, y: 70, w: 940, h: 940}, L: {x: 140, y: 470, w: 660, h: 540}};

/** Top-left of a pile slot on the 1920 x 1080 desk. */
function slotXY(id: string) {
  const {region, u, v} = SLOT[id];
  const g = REGION[region];
  return {x: g.x + u * (g.w - BW), y: g.y + v * (g.h - BH)};
}

/** The 10 real DMs in PILE (stacking) order; m1 and m2 come last, on top. */
const AVALANCHE = PILE.filter((p) => !SPAM_IDS.includes(p.id)).map((p) => p.id);

const GEMS = [
  {id: 'm1', label: 'A real project'},
  {id: 'm2', label: 'A paid collab'},
  {id: 'm3', label: 'An investor'},
];

/** Spam lands on the gems (offsets from the gem slot), in slam order, so later ones stack on top. */
const SLAMS = [
  {id: 'm12', at: 165, on: 'm1', dx: -30, dy: -50},
  {id: 'm6', at: 171, on: 'm2', dx: 40, dy: -50},
  {id: 'm4', at: 177, on: 'm3', dx: -24, dy: -50},
  {id: 'm9', at: 183, on: 'm2', dx: -60, dy: -150},
];

const PILLS = ['Paid DMs', 'Group chats', 'Link-in-bio lists'];

/** Chip centre and scale: centre stage (H1), then up to the top left (20 to 50). */
function chipAt(frame: number) {
  const t = ramp(frame, 20, 30, EASE.inOut);
  return {x: mix(960, 330, t), y: mix(540, 160, t), s: mix(1.4, 0.8, t)};
}

/** Where a waiting bubble peeks out from behind the chip: centre and scale. */
function peekAt(frame: number, i: number, id: string) {
  const chip = chipAt(frame);
  const e = ramp(frame, 12 + 2 * i, 10);
  const slot = slotXY(id);
  const dx = slot.x + BW / 2 - chip.x;
  const dy = slot.y + BH / 2 - chip.y;
  const len = Math.hypot(dx, dy) || 1;
  const dist = (90 + 6 * (i % 4)) * chip.s * e;
  return {x: chip.x + (dx / len) * dist, y: chip.y + (dy / len) * dist, s: 0.25 * chip.s * e};
}

/** Avalanche bubble: peeks from 12, flies from 30 + 5i along an arc, lands on its slot with ease-out-expo. */
function flight(frame: number, i: number, id: string) {
  const launch = 30 + 5 * i;
  const slot = slotXY(id);
  const end = {x: slot.x + BW / 2, y: slot.y + BH / 2};
  const r = SLOT[id].r;
  if (frame < launch) {
    const p = peekAt(frame, i, id);
    return {cx: p.x, cy: p.y, s: p.s, r: 0};
  }
  const start = peekAt(launch, i, id);
  const p = ramp(frame, launch, 30);
  const bow = (i % 2 === 0 ? 1 : -1) * (120 + 12 * i) * Math.sin(Math.PI * p);
  const len = Math.hypot(end.x - start.x, end.y - start.y) || 1;
  const nx = -(end.y - start.y) / len;
  const ny = (end.x - start.x) / len;
  return {
    cx: mix(start.x, end.x, p) + nx * bow,
    cy: mix(start.y, end.y, p) + ny * bow,
    s: mix(start.s, 1, p),
    r: mix(i % 2 === 0 ? -14 : 14, r, p),
  };
}

/** 4 px decaying shake after each slam lands (8 frames after it starts). */
function shake(frame: number) {
  let x = 0;
  let y = 0;
  for (const {at} of SLAMS) {
    const t = frame - (at + 8);
    if (t < 0) continue;
    const k = 4 * Math.exp(-t / 4);
    y += k * Math.cos(t * 2.4);
    x += 0.5 * k * Math.sin(t * 3.1);
  }
  return {x, y};
}

const Bubble: React.FC<{id: string; cx: number; cy: number; s: number; r: number; z?: number; lift?: number; label?: string; labelProgress?: number}> = ({
  id,
  cx,
  cy,
  s,
  r,
  z,
  lift = 0,
  label,
  labelProgress,
}) => {
  const {x, y} = slotXY(id);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        zIndex: z,
        translate: `${cx - (x + BW / 2)}px ${cy - (y + BH / 2) - 6 * lift}px`,
        rotate: `${r}deg`,
        scale: `${s * (1 + 0.05 * lift)}`,
      }}
    >
      <DMBubble message={MSG[id]} width={BW} ring={lift} label={label} labelProgress={labelProgress} />
    </div>
  );
};

export const Problem: React.FC = () => {
  const frame = useCurrentFrame();
  const chip = chipAt(frame);
  const buzz = interpolate(frame, [0, 3, 26, 30], [0, 2, 2, 0], clamp);
  const jx = drift('buzz-x', frame, 0.7, buzz);
  const jy = drift('buzz-y', frame, 0.7, buzz);
  const badge = frame >= 20 ? '9+' : Math.round(interpolate(frame, [2, 16], [3, 9], clamp));
  const unread = ramp(frame, 40, 12);
  const push = interpolate(frame, [30, 209], [1, 1.05], {...clamp, easing: EASE.inOut});
  const tilt = interpolate(frame, [30, 209], [-1, 0], {...clamp, easing: EASE.inOut});
  const sh = shake(frame);
  const dim = ramp(frame, 205, 30, EASE.quart);
  const blur = Math.round(14 * dim);
  const implode = ramp(frame, 330, 22, EASE.in);

  return (
    <AbsoluteFill style={{fontFamily: FONT, color: C.ink}}>
      <PageBackdrop frameOffset={START.Problem} />

      {frame < 352 ? (
        <Interactive.Div
          name="Pile"
          style={{
            position: 'absolute',
            inset: 0,
            filter: blur > 0 ? `blur(${blur}px)` : undefined,
            opacity: mix(1, 0.35, dim),
            scale: `${1 - implode}`,
            rotate: `${25 * implode}deg`,
            transformOrigin: '960px 540px',
          }}
        >
          <Ghosts />
          <AbsoluteFill style={{scale: `${push}`, rotate: `${tilt}deg`, translate: `${sh.x}px ${sh.y}px`}}>
            {AVALANCHE.map((id, i) => {
              if (frame < 12 + 2 * i) return null;
              const gem = GEMS.findIndex((g) => g.id === id);
              const liftAt = 130 + 6 * gem;
              return (
                <Bubble
                  key={id}
                  id={id}
                  {...flight(frame, i, id)}
                  // Gems stack m1 < m2 < m3 above the rest, so every lifted label stays visible.
                  z={gem < 0 ? undefined : 1 + gem}
                  lift={gem < 0 ? 0 : ramp(frame, liftAt, 12, EASE.quart)}
                  label={gem < 0 ? undefined : GEMS[gem].label}
                  labelProgress={interpolate(frame, [liftAt + 4, liftAt + 16], [0, 1], clamp)}
                />
              );
            })}
            {SLAMS.map(({id, at, on, dx, dy}) => {
              if (frame < at) return null;
              const gem = slotXY(on);
              const cx = gem.x + dx + BW / 2;
              const cy = gem.y + dy + BH / 2;
              const fall = ramp(frame, at, 8, EASE.in);
              return <Bubble key={id} id={id} cx={cx} cy={mix(-260, cy, fall)} s={mix(1.08, 1, fall)} r={SLOT[id].r} z={4} />;
            })}
          </AbsoluteFill>

          <div style={{position: 'absolute', left: chip.x + jx, top: chip.y + jy, translate: '-50% -50%', scale: chip.s, transformOrigin: 'center'}}>
            <MiraChip badge={typeof badge === 'number' ? badge : 0} />
            {typeof badge === 'string' ? (
              <span style={{position: 'absolute', left: 94, top: 6, translate: '-100% 0'}}>
                <Badge count={badge} size={36} />
              </span>
            ) : null}
          </div>
          {frame >= 40 ? (
            <div
              style={{
                position: 'absolute',
                left: 476,
                top: 160,
                display: 'inline-flex',
                alignItems: 'center',
                height: 52,
                padding: '0 22px',
                borderRadius: R.pill,
                backgroundColor: C.dangerDeep,
                color: C.cardStrong,
                fontSize: 26,
                fontWeight: 600,
                whiteSpace: 'nowrap',
                translate: `${(1 - unread) * -24}px -50%`,
                scale: unread,
                transformOrigin: 'left center',
              }}
            >
              <Ticker from={99} to={3214} start={40} duration={79} easing={EASE.in} format={(n) => `${formatNumber(n)} unread`} />
            </div>
          ) : null}
        </Interactive.Div>
      ) : null}

      <Interactive.Div name="Headline" style={{position: 'absolute', left: 140, top: 230, fontSize: 84, lineHeight: 1.05, fontWeight: 500, letterSpacing: '-0.02em'}}>
        {/* Both always mounted, each hidden by its own line masks. The second starts at 135 (beat), the first frame after the first has fully exited, so glyphs never overlap. */}
        <LineReveal lines={['Thousands of', 'messages a week.']} start={45} exitAt={120} />
        <LineReveal lines={['The ones that', 'matter get buried.']} start={135} exitAt={205} style={{position: 'absolute', left: 0, top: 0}} />
      </Interactive.Div>

      {PILLS.map((text, k) => {
        const at = 210 + 15 * k;
        if (frame < at) return null;
        const strike = ramp(frame, at + 7, 8, EASE.quart);
        return (
          <div
            key={text}
            style={{
              position: 'absolute',
              left: 960,
              top: 400 + 140 * k,
              display: 'inline-flex',
              alignItems: 'center',
              height: 104,
              padding: '0 48px',
              boxSizing: 'border-box',
              borderRadius: R.pill,
              backgroundColor: C.cardStrong,
              border: `1px solid ${C.line}`,
              fontSize: 56,
              fontWeight: 500,
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              translate: `-50% calc(-50% + ${-900 * ramp(frame, 270, 12, EASE.in)}px)`,
              scale: ramp(frame, at, 12),
            }}
          >
            <span style={{position: 'relative'}}>
              {text}
              {/* ponytail: a clipped round-capped bar, since DrawPath needs the text width in px and fonts measure late. */}
              <span
                style={{
                  position: 'absolute',
                  left: -16,
                  top: '50%',
                  width: `calc((100% + 32px) * ${strike})`,
                  height: 4,
                  marginTop: -2,
                  borderRadius: 2,
                  backgroundColor: C.ink,
                }}
              />
            </span>
          </div>
        );
      })}

      {frame >= 275 ? (
        <Interactive.Div
          name="Statement"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            scale: interpolate(frame, [275, 330], [1, 1.02], clamp) * (1 - ramp(frame, 330, 15, EASE.in)),
          }}
        >
          <LineReveal lines={['Most never get read.']} start={275} lineStyle={TYPE.statement} />
        </Interactive.Div>
      ) : null}

      {frame >= 340 ? (
        <Interactive.Div
          name="Dot"
          style={{position: 'absolute', left: 950, top: 530, width: 20, height: 20, borderRadius: 9999, backgroundColor: C.ink, scale: ramp(frame, 340, 12)}}
        />
      ) : null}
    </AbsoluteFill>
  );
};
