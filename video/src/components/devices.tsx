import {BatteryFull, Lock, Share, Signal, Wifi, X} from 'lucide-react';
import React from 'react';
import {FONT} from '../fonts';
import {C, R, SHADOW, TNUM, TYPE} from '../theme';

// Phone: device 418 x 872 (14 px ink bezel), screen 390 x 844 = status bar 44 + in-app browser bar 56 + page 744.
const BEZEL = 14;
const SCREEN_W = 390;
const STATUS_H = 44;
const BAR_H = 56;
const URL_W = 220;
// Inter's tnum also widens hyphens ("gym - log"), so url text stays proportional.
const PROSE: React.CSSProperties = {fontVariantNumeric: 'normal', fontFeatureSettings: 'normal'};

/** The url text box inside the in-app browser bar, relative to the device's top-left (for the H3 morph). */
export const PHONE_URLBAR = {x: BEZEL + (SCREEN_W - URL_W) / 2, y: BEZEL + STATUS_H + 9 + 22, width: URL_W, height: 16} as const;

export const PhoneFrame: React.FC<{url?: string; title?: string; children?: React.ReactNode; style?: React.CSSProperties}> = ({
  url = 'fellowowners.app/mira',
  title = 'Mira Kapoor',
  children,
  style,
}) => (
  <div style={{position: 'relative', width: 418, height: 872, padding: BEZEL, boxSizing: 'border-box', borderRadius: 60, backgroundColor: C.ink, boxShadow: SHADOW.device, fontFamily: FONT, ...style}}>
    <div style={{position: 'relative', width: SCREEN_W, height: 844, borderRadius: 46, overflow: 'hidden', backgroundColor: C.shell}}>
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: STATUS_H, padding: '0 28px 0 34px', backgroundColor: C.cardStrong, color: C.ink}}>
        <span style={{fontSize: 15, fontWeight: 600, ...TNUM}}>9:41</span>
        <span style={{display: 'flex', gap: 6, alignItems: 'center'}}>
          <Signal size={16} strokeWidth={2} color={C.ink} />
          <Wifi size={16} strokeWidth={2} color={C.ink} />
          <BatteryFull size={20} strokeWidth={1.5} color={C.ink} />
        </span>
      </div>
      <div style={{position: 'relative', height: BAR_H, boxSizing: 'border-box', backgroundColor: C.cardStrong, borderBottom: `1px solid ${C.line}`}}>
        <span style={{position: 'absolute', left: 12, top: 8, width: 40, height: 40, display: 'grid', placeItems: 'center'}}>
          <X size={20} strokeWidth={1.5} color={C.ink} />
        </span>
        <div style={{position: 'absolute', left: (SCREEN_W - URL_W) / 2, top: 9, width: URL_W, textAlign: 'center'}}>
          <div style={{...TYPE.labelStrong, color: C.ink, height: 22, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{title}</div>
          <div style={{...TYPE.caption12, ...PROSE, color: C.inkMuted, height: 16, whiteSpace: 'nowrap'}}>{url}</div>
        </div>
        <span style={{position: 'absolute', right: 12, top: 8, width: 40, height: 40, display: 'grid', placeItems: 'center'}}>
          <Share size={20} strokeWidth={1.5} color={C.ink} />
        </span>
      </div>
      <div style={{position: 'relative', width: SCREEN_W, height: 744, overflow: 'hidden'}}>{children}</div>
    </div>
  </div>
);

/** Pure White window: 48 px Dove Grey bar with three dots and a centred url pill; children fill the rest. */
export const BrowserFrame: React.FC<{url: string; width: number; height: number; children?: React.ReactNode; style?: React.CSSProperties}> = ({url, width, height, children, style}) => (
  <div style={{position: 'relative', width, height, borderRadius: 20, overflow: 'hidden', backgroundColor: C.cardStrong, boxShadow: SHADOW.device, fontFamily: FONT, ...style}}>
    <div style={{position: 'relative', height: 48, display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px', backgroundColor: C.tableHead}}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{width: 12, height: 12, borderRadius: 9999, backgroundColor: C.lineStrong}} />
      ))}
      <span
        style={{
          position: 'absolute',
          left: '50%',
          top: 10,
          translate: '-50% 0',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 28,
          padding: '0 16px',
          borderRadius: R.pill,
          backgroundColor: C.cardStrong,
          ...TYPE.small,
          ...PROSE,
          color: C.inkSoft,
          whiteSpace: 'nowrap',
        }}
      >
        <Lock size={12} strokeWidth={1.5} color={C.inkSoft} />
        {url}
      </span>
    </div>
    <div style={{position: 'relative', height: height - 48, overflow: 'hidden'}}>{children}</div>
  </div>
);
