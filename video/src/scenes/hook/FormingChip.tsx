import React from 'react';
import {Avatar, Badge} from '../../components';
import {creator} from '../../data';
import {FONT} from '../../fonts';
import {C, R, TNUM} from '../../theme';

/** Left edge of the followers line inside the chip: padding 12 + avatar 72 + gap 20. */
export const FOLLOWERS_X = 104;

const at = (v: number) => (v < 1 ? v : undefined); // leave the property off at rest, so a finished chip equals the kit MiraChip

/**
 * The kit MiraChip's exact layout with each part on its own progress (0..1): the pill grows from a dot to 30 % and
 * on to full width, the avatar pops, the name rises out of its mask, the followers line fades up under the
 * arriving number, the badge pops. With every progress at 1 it renders the same pixels as `MiraChip`.
 */
export const FormingChip: React.FC<{pill: number; pillWidth: number; avatar: number; name: number; followers: number; badge: number; badgeScale: number}> = ({
  pill,
  pillWidth,
  avatar,
  name,
  followers,
  badge,
  badgeScale,
}) => {
  const done = pill >= 1 && pillWidth >= 1;
  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 20,
        height: 96,
        padding: '12px 32px 12px 12px',
        boxSizing: 'border-box',
        borderRadius: R.pill,
        backgroundColor: done ? C.cardStrong : undefined,
        fontFamily: FONT,
        color: C.ink,
        whiteSpace: 'nowrap',
      }}
    >
      {!done && pill > 0 ? (
        <span
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${(1 - pillWidth) * 50}%`,
            right: `${(1 - pillWidth) * 50}%`,
            borderRadius: R.pill,
            backgroundColor: C.cardStrong,
            scale: pill,
            zIndex: -1, // under the in-flow avatar and text, inside the wrapper's stacking context
          }}
        />
      ) : null}
      <span style={{position: 'relative', display: 'inline-flex', scale: at(avatar)}}>
        <Avatar name={creator.name} size={72} fontSize={26} fontWeight={600} />
        {badge > 0 ? (
          <span style={{position: 'absolute', top: -6, right: -10, scale: at(badgeScale)}}>
            <Badge count={badge} size={36} />
          </span>
        ) : null}
      </span>
      <span style={{display: 'flex', flexDirection: 'column'}}>
        {name < 1 ? (
          <span style={{fontSize: 30, lineHeight: '36px', fontWeight: 600, overflow: 'hidden', paddingBottom: '0.12em', marginBottom: '-0.12em'}}>
            <span style={{display: 'block', translate: `0 ${(1 - name) * 110}%`}}>{creator.name}</span>
          </span>
        ) : (
          <span style={{fontSize: 30, lineHeight: '36px', fontWeight: 600}}>{creator.name}</span>
        )}
        <span style={{fontSize: 22, lineHeight: '28px', fontWeight: 500, color: C.inkSoft, ...TNUM, opacity: at(followers)}}>{`${creator.followers} followers`}</span>
      </span>
    </div>
  );
};
