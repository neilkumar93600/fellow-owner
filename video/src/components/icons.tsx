import React from 'react';
import {C} from '../theme';

// lucide-react v1 dropped brand icons, so the three platform glyphs for the bio page chips are drawn here,
// in lucide's language: 24 grid, 1.5 stroke, round caps, ink.

export type Platform = 'YouTube' | 'Instagram' | 'X';

export const PlatformIcon: React.FC<{platform: Platform; size?: number; color?: string}> = ({platform, size = 16, color = C.ink}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {platform === 'YouTube' ? (
      <>
        <rect x="2.5" y="5" width="19" height="14" rx="4" />
        <path d="m10 9.2 5 2.8-5 2.8z" fill={color} />
      </>
    ) : platform === 'Instagram' ? (
      <>
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.3" cy="6.7" r="0.6" fill={color} />
      </>
    ) : (
      <path d="M4 4l16 16M20 4 4 20" />
    )}
  </svg>
);
