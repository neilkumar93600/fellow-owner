import type * as React from 'react';

/** CSS custom properties read by .aurora-blob and the aurora-drift keyframes (globals.css). */
type BlobStyle = React.CSSProperties & Record<`--${string}`, string>;

/** Golden hour: warm peach top left like a low sun, sky and lilac across, mint at the foot. */
const BLOBS: BlobStyle[] = [
  {
    left: '-22vmax',
    top: '-18vmax',
    '--blob': 'var(--color-aurora-peach)',
    '--to-x': '8vmax',
    '--to-y': '6vmax',
  },
  {
    right: '-26vmax',
    top: '-24vmax',
    '--blob': 'var(--color-aurora-sky)',
    '--to-x': '-6vmax',
    '--to-y': '8vmax',
  },
  {
    right: '-18vmax',
    bottom: '-30vmax',
    '--blob': 'var(--color-aurora-lilac)',
    '--to-x': '-10vmax',
    '--to-y': '-6vmax',
  },
  {
    left: '-20vmax',
    bottom: '-34vmax',
    '--blob': 'var(--color-aurora-mint)',
    '--to-x': '10vmax',
    '--to-y': '-4vmax',
  },
];

/**
 * DESIGN.md Aurora: the page-wide backdrop behind every frosted panel. Fixed, behind everything, hidden
 * from assistive tech. The blobs drift for a few slow passes and then rest; static under reduced motion.
 * Rendered once, in app/layout.tsx.
 */
export function AuroraBackdrop() {
  return (
    <div aria-hidden="true" className="aurora">
      {BLOBS.map((style, i) => (
        <span
          key={style['--blob']}
          className="aurora-blob"
          style={{ ...style, animationDelay: `${i * -9}s` }}
        />
      ))}
      <span className="grain" />
    </div>
  );
}
