import type {LucideIcon} from 'lucide-react';
import {LoaderCircle} from 'lucide-react';
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {FONT} from '../fonts';
import {C, R, TYPE} from '../theme';

const base = (height: number): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  height,
  boxSizing: 'border-box',
  borderRadius: R.pill,
  fontFamily: FONT,
  whiteSpace: 'nowrap',
  ...TYPE.label,
});

/** The one purple action per frame. `press` 0..1 scales 1 to 0.98; `loading` swaps the icon slot for a spinner. */
export const PrimaryButton: React.FC<{
  children: React.ReactNode;
  press?: number;
  width?: number | string;
  height?: number;
  icon?: LucideIcon;
  loading?: number;
}> = ({children, press = 0, width, height = 48, icon: Icon, loading = 0}) => {
  const frame = useCurrentFrame();
  const slot = Icon !== undefined || loading > 0;
  return (
    <span style={{...base(height), width, padding: '0 24px', backgroundColor: C.purple, color: C.cardStrong, scale: `${1 - 0.02 * press}`}}>
      {slot ? (
        <span style={{position: 'relative', width: 20, height: 20, flex: 'none'}}>
          {Icon ? <Icon size={20} strokeWidth={1.5} color={C.cardStrong} style={{position: 'absolute', inset: 0, opacity: 1 - loading}} /> : null}
          <LoaderCircle
            size={16}
            strokeWidth={1.5}
            color={C.cardStrong}
            style={{position: 'absolute', left: 2, top: 2, opacity: loading, rotate: `${(frame * 12) % 360}deg`}}
          />
        </span>
      ) : null}
      {children}
    </span>
  );
};

/** Pure White pill, 1px outline (Hairline on white surfaces, Ring Grey on glass), ink label. */
export const SecondaryButton: React.FC<{children: React.ReactNode; press?: number; height?: number; surface?: 'white' | 'glass'}> = ({
  children,
  press = 0,
  height = 48,
  surface = 'white',
}) => (
  <span
    style={{
      ...base(height),
      padding: '0 20px',
      backgroundColor: C.cardStrong,
      color: C.ink,
      border: `1px solid ${surface === 'glass' ? C.lineStrong : C.line}`,
      scale: `${1 - 0.02 * press}`,
    }}
  >
    {children}
  </span>
);
