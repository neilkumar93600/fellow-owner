import { Heart, ThumbsUp, Users } from 'lucide-react';
import type * as React from 'react';
import { CreatorImage } from '@/components/shared/creator-image';
import type { CreatorAsset } from '@/lib/creator-assets';
import { cn } from '@/lib/utils';
import st from './cta.module.css';
import { DEMO } from './demo-data';

/*
 * Fans orbit (landing CTA): fan faces, initials and three glass chips drifting on two elliptical rings
 * around the headline from 1280px; below that a static avatar cluster sits above the headline.
 * Pure CSS: each ring rotates a circle that a static scaleY squashes into an ellipse, and each item
 * counter-rotates and counter-scales so it stays upright (transform only). Decorative, aria-hidden.
 * The server renders everything; cta-motion.tsx pauses the loop while the section is off screen.
 */

type Tone = 'peach' | 'sky' | 'lilac' | 'mint';

type Item =
  | { kind: 'fan'; name: CreatorAsset }
  | { kind: 'initials'; text: string; tone: Tone }
  | { kind: 'chip'; text: string; Icon: typeof Heart };

const OUTER: Item[] = [
  { kind: 'fan', name: 'fan-1' },
  { kind: 'initials', text: 'AK', tone: 'lilac' },
  { kind: 'chip', text: `Loved by ${DEMO.creator.firstName}`, Icon: Heart },
  { kind: 'fan', name: 'fan-4' },
  { kind: 'fan', name: 'fan-6' },
  { kind: 'initials', text: 'JT', tone: 'peach' },
  { kind: 'chip', text: `+${DEMO.idea.use} would use this`, Icon: ThumbsUp },
];

const INNER: Item[] = [
  { kind: 'fan', name: 'fan-2' },
  { kind: 'initials', text: 'SM', tone: 'mint' },
  { kind: 'fan', name: 'fan-3' },
  { kind: 'chip', text: `Crew of ${DEMO.crew.length} formed`, Icon: Users },
  { kind: 'fan', name: 'fan-5' },
  { kind: 'initials', text: 'RB', tone: 'sky' },
];

const TONE: Record<Tone, string> = {
  peach: st.tonePeach,
  sky: st.toneSky,
  lilac: st.toneLilac,
  mint: st.toneMint,
};

function Face({ name }: { name: CreatorAsset }) {
  return (
    <span className={st.face}>
      <CreatorImage name={name} alt="" fill sizes="72px" />
    </span>
  );
}

function Piece({ item }: { item: Item }) {
  if (item.kind === 'fan') return <Face name={item.name} />;
  if (item.kind === 'initials') {
    return <span className={cn(st.face, st.initials, TONE[item.tone])}>{item.text}</span>;
  }
  return (
    <span className={st.chip}>
      <item.Icon size={14} strokeWidth={1.75} aria-hidden="true" />
      {item.text}
    </span>
  );
}

function Ring({
  items,
  k,
  dur,
  reverse,
  angles,
}: {
  items: Item[];
  k: number;
  dur: number;
  reverse?: boolean;
  /** Start angles in degrees; evenly spaced when omitted. Picked so a still ring keeps clear of the text. */
  angles?: number[];
}) {
  return (
    <div
      className={cn(st.frame, reverse && st.reverse)}
      style={{ '--k': k, '--dur': `${dur}s` } as React.CSSProperties}
    >
      <div className={st.ring}>
        {items.map((item, i) => (
          <div
            key={item.kind === 'fan' ? item.name : item.text}
            className={st.slot}
            style={
              {
                '--a': `${angles?.[i] ?? (360 / items.length) * i}deg`,
              } as React.CSSProperties
            }
          >
            <div className={cn(st.counter, item.kind !== 'chip' && st.small)}>
              <Piece item={item} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CtaOrbit() {
  return (
    <>
      <div aria-hidden="true" className={st.orbit} data-cta-reveal="orbit">
        <div className={st.rings}>
          <Ring items={OUTER} k={1} dur={90} />
          <Ring items={INNER} k={0.74} dur={70} reverse angles={[335, 15, 95, 160, 200, 290]} />
        </div>
      </div>
      <div aria-hidden="true" className={st.cluster}>
        {(['fan-1', 'fan-2', 'fan-3', 'fan-4', 'fan-5', 'fan-6'] as const).map((name) => (
          <Face key={name} name={name} />
        ))}
      </div>
    </>
  );
}
