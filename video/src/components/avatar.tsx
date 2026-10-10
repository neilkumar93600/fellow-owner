import React from 'react';
import {avatarTint, creator, initials} from '../data';
import {FONT} from '../fonts';
import {C, EASE, TNUM} from '../theme';

/** Initials on a tile tint picked by hashing the name; Mira is MK on Lavender Tile (no photo exists). */
export const Avatar: React.FC<{
  name: string;
  size?: number;
  ring?: boolean;
  online?: boolean;
  tint?: string;
  fontSize?: number;
  fontWeight?: number;
}> = ({name, size = 40, ring, online, tint, fontSize, fontWeight = 500}) => {
  const isMira = name === creator.name;
  const k = size / 40;
  return (
    <span
      style={{
        position: 'relative',
        flex: 'none',
        display: 'inline-grid',
        placeItems: 'center',
        width: size,
        height: size,
        borderRadius: 9999,
        backgroundColor: tint ?? (isMira ? C.lavenderTile : avatarTint(name)),
        outline: ring ? `2px solid ${C.cardStrong}` : undefined,
        color: C.ink,
        fontFamily: FONT,
        fontSize: fontSize ?? (size <= 40 ? 13 : Math.round(size * 0.3)),
        lineHeight: 1,
        fontWeight,
        ...TNUM,
      }}
    >
      {isMira ? creator.initials : initials(name)}
      {online ? (
        <span
          style={{
            position: 'absolute',
            top: -2 * k,
            right: -2 * k,
            width: 14 * k,
            height: 14 * k,
            boxSizing: 'border-box',
            border: `${2 * k}px solid ${C.cardStrong}`,
            borderRadius: 9999,
            backgroundColor: C.success,
          }}
        />
      ) : null}
    </span>
  );
};

/** Overlapping 28 px avatars with 2 px white rings; a fractional `visible` brings the newest one in. */
export const AvatarStack: React.FC<{names: string[]; size?: number; visible?: number}> = ({names, size = 28, visible}) => {
  const shown = visible ?? names.length;
  return (
    <span style={{display: 'inline-flex', alignItems: 'center'}}>
      {names.map((name, i) => {
        const t = Math.max(0, Math.min(1, shown - i));
        if (t <= 0) return null;
        const e = EASE.expo(t);
        return (
          <span key={name} style={{marginLeft: i === 0 ? 0 : -8, opacity: e, scale: `${0.6 + 0.4 * e}`, display: 'inline-flex'}}>
            <Avatar name={name} size={size} ring fontSize={size <= 32 ? 12 : undefined} />
          </span>
        );
      })}
    </span>
  );
};
