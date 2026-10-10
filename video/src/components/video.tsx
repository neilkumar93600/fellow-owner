import React from 'react';
import {useCurrentFrame} from 'remotion';
import type {Message} from '../data';
import {creator} from '../data';
import {FONT} from '../fonts';
import {C, EASE, R, TNUM} from '../theme';
import {Avatar} from './avatar';
import {Badge} from './chips';

// Video-scale parts (sizes in on-screen px at 1920 x 1080).

/** A DM on the pile: Pure White, radius 24; optional 2 px ink ring and a white label pill above it. */
export const DMBubble: React.FC<{message: Message; width?: number; ring?: number; label?: string; labelProgress?: number}> = ({
  message,
  width = 460,
  ring = 0,
  label,
  labelProgress = 1,
}) => {
  const lp = EASE.expo(Math.max(0, Math.min(1, labelProgress)));
  return (
    <div style={{position: 'relative', width, padding: '20px 24px', boxSizing: 'border-box', borderRadius: R.idea, backgroundColor: C.cardStrong, fontFamily: FONT, color: C.ink}}>
      {label && labelProgress > 0 ? (
        <span
          style={{
            position: 'absolute',
            left: 0,
            bottom: '100%',
            marginBottom: 12,
            display: 'inline-flex',
            alignItems: 'center',
            height: 44,
            padding: '0 20px',
            borderRadius: R.pill,
            backgroundColor: C.cardStrong,
            border: `1px solid ${C.line}`,
            fontSize: 22,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            opacity: lp,
            translate: `0 ${(1 - lp) * 10}px`,
            scale: `${0.92 + 0.08 * lp}`,
            transformOrigin: 'left bottom',
          }}
        >
          {label}
        </span>
      ) : null}
      <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
        <Avatar name={message.from} size={44} fontSize={16} />
        <div style={{flex: 1, minWidth: 0}}>
          <div style={{fontSize: 22, lineHeight: '28px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{message.from}</div>
          <div style={{fontSize: 22, lineHeight: '28px', fontWeight: 400, color: C.inkMuted, ...TNUM}}>{message.meta}</div>
        </div>
        <span style={{display: 'inline-flex', alignItems: 'center', height: 36, padding: '0 14px', borderRadius: R.pill, backgroundColor: C.tableHead, fontSize: 22, fontWeight: 500, whiteSpace: 'nowrap'}}>
          {message.tag}
        </span>
      </div>
      <div
        style={{
          marginTop: 14,
          fontSize: 22,
          lineHeight: '30px',
          fontWeight: 400,
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {message.text}
      </div>
      {ring > 0 ? <div style={{position: 'absolute', inset: 0, borderRadius: R.idea, border: `2px solid ${C.ink}`, opacity: ring}} /> : null}
    </div>
  );
};

/** "01 Share your link": 56 tall pill, glass on the shell, white with a hairline on the page. */
export const ChapterTag: React.FC<{n: string; label: string; surface: 'page' | 'shell'}> = ({n, label, surface}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 14,
      height: 56,
      padding: '0 24px 0 10px',
      boxSizing: 'border-box',
      borderRadius: R.pill,
      backgroundColor: surface === 'shell' ? C.glass : C.cardStrong,
      border: surface === 'page' ? `1px solid ${C.line}` : undefined,
      fontFamily: FONT,
      color: C.ink,
      whiteSpace: 'nowrap',
    }}
  >
    <span style={{display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 9999, backgroundColor: C.tableHead, fontSize: 22, fontWeight: 600, ...TNUM}}>{n}</span>
    <span style={{fontSize: 24, lineHeight: '32px', fontWeight: 500}}>{label}</span>
  </div>
);

/** Mira as one number: white pill with the MK avatar, name, follower count, and an optional Brick Red badge. */
export const MiraChip: React.FC<{badge?: number; followers?: string; style?: React.CSSProperties}> = ({badge = 0, followers = `${creator.followers} followers`, style}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 20,
      height: 96,
      padding: '12px 32px 12px 12px',
      boxSizing: 'border-box',
      borderRadius: R.pill,
      backgroundColor: C.cardStrong,
      fontFamily: FONT,
      color: C.ink,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    <span style={{position: 'relative', display: 'inline-flex'}}>
      <Avatar name={creator.name} size={72} fontSize={26} fontWeight={600} />
      {badge > 0 ? (
        <span style={{position: 'absolute', top: -6, right: -10}}>
          <Badge count={badge} size={36} />
        </span>
      ) : null}
    </span>
    <span style={{display: 'flex', flexDirection: 'column'}}>
      <span style={{fontSize: 30, lineHeight: '36px', fontWeight: 600}}>{creator.name}</span>
      <span style={{fontSize: 22, lineHeight: '28px', fontWeight: 500, color: C.inkSoft, ...TNUM}}>{followers}</span>
    </span>
  </div>
);

/** 720 x 88 glass pill with the url centred; optional caret blinking 15 on, 15 off. */
export const UrlPill: React.FC<{text: string; caret?: boolean; style?: React.CSSProperties}> = ({text, caret, style}) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 720,
        height: 88,
        borderRadius: R.pill,
        backgroundColor: C.glass,
        fontFamily: FONT,
        fontSize: 40,
        lineHeight: '48px',
        fontWeight: 500,
        letterSpacing: '-0.01em',
        color: C.ink,
        whiteSpace: 'pre',
        ...style,
      }}
    >
      {text}
      {caret ? <span style={{display: 'inline-block', width: '0.08em', height: '1em', marginLeft: '0.06em', backgroundColor: C.ink, opacity: Math.floor(frame / 15) % 2 === 0 ? 1 : 0}} /> : null}
    </div>
  );
};
