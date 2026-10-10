import type {LucideIcon} from 'lucide-react';
import {Bell, ChevronDown, CircleQuestionMark, Inbox, LayoutGrid, Lightbulb, Megaphone, Search, Settings, UserRound, Users, X} from 'lucide-react';
import React from 'react';
import {creator} from '../data';
import {FONT} from '../fonts';
import {C, HAZE, R, SHADOW, TYPE} from '../theme';
import {Avatar} from './avatar';
import {Badge} from './chips';
import {LogoLockup} from './logo';

// Creator dashboard at product scale, internal size 1440 x 810 (DESIGN.md creator grid):
// shell padding 24, header row 88, sidebar 248 + 16 gap, content box x 288..1416, y 136..786 (1128 x 650).

export type NavId = 'today' | 'inbox' | 'ideas' | 'communities' | 'people' | 'promote' | 'settings' | 'help';

const NAV: {id: NavId; label: string; icon: LucideIcon}[] = [
  {id: 'today', label: 'Today', icon: LayoutGrid},
  {id: 'inbox', label: 'Inbox', icon: Inbox},
  {id: 'ideas', label: 'Ideas', icon: Lightbulb},
  {id: 'communities', label: 'Communities', icon: Users},
  {id: 'people', label: 'People', icon: UserRound},
  {id: 'promote', label: 'Promote', icon: Megaphone},
  {id: 'settings', label: 'Settings', icon: Settings},
  {id: 'help', label: 'Help', icon: CircleQuestionMark},
];

export const DASHBOARD = {width: 1440, height: 810, content: {x: 288, y: 136, width: 1128, height: 650}} as const;

const ITEM_H = 52;
const ITEM_STEP = 60;

const Sidebar: React.FC<{active: NavId; activeFrom?: NavId; activeT: number}> = ({active, activeFrom, activeT}) => {
  const to = NAV.findIndex((n) => n.id === active);
  const from = activeFrom ? NAV.findIndex((n) => n.id === activeFrom) : to;
  const limeY = (from + (to - from) * activeT) * ITEM_STEP;
  const current = activeT >= 0.5 ? to : from;
  return (
    <div style={{position: 'absolute', left: 24, top: 136, width: 248, height: NAV.length * ITEM_STEP}}>
      {NAV.map((n, i) => (
        <div key={n.id} style={{position: 'absolute', left: 0, top: i * ITEM_STEP, width: 248, height: ITEM_H, borderRadius: R.pill, backgroundColor: C.glass}} />
      ))}
      <div style={{position: 'absolute', left: 0, top: limeY, width: 248, height: ITEM_H, borderRadius: R.pill, backgroundColor: C.lime}} />
      {NAV.map((n, i) => {
        const Icon = n.icon;
        const on = i === current;
        return (
          <div
            key={n.id}
            style={{position: 'absolute', left: 0, top: i * ITEM_STEP, width: 248, height: ITEM_H, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', boxSizing: 'border-box', color: C.ink, ...(on ? TYPE.labelStrong : TYPE.label)}}
          >
            {on ? (
              // Filled form: ink fill, with the glyph's own strokes redrawn in lime so interior detail (the inbox tray) survives.
              <span style={{position: 'relative', width: 20, height: 20, flex: 'none'}}>
                <Icon size={20} strokeWidth={1.5} color={C.ink} fill={C.ink} style={{position: 'absolute', inset: 0}} />
                <Icon size={20} strokeWidth={1.5} color={C.lime} style={{position: 'absolute', inset: 0}} />
              </span>
            ) : (
              <Icon size={20} strokeWidth={1.5} color={C.ink} />
            )}
            {n.label}
          </div>
        );
      })}
    </div>
  );
};

const Ghost: React.FC<{children: React.ReactNode}> = ({children}) => (
  <span style={{position: 'relative', display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: R.pill}}>{children}</span>
);

const Header: React.FC<{badge?: string}> = ({badge}) => (
  <div style={{position: 'absolute', left: 288, top: 24, width: 1128, height: 88, display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
    <div>
      <div style={{...TYPE.display, color: C.ink}}>Welcome, {creator.firstName} 🎉</div>
      <div style={{...TYPE.body, color: C.inkSoft, marginTop: 4}}>Here’s what needs you today.</div>
    </div>
    <div style={{display: 'flex', alignItems: 'center', gap: 4, height: 64, padding: '0 12px', boxSizing: 'border-box', borderRadius: R.pill, backgroundColor: C.glass}}>
      <Ghost>
        <Search size={20} strokeWidth={1.5} color={C.ink} />
      </Ghost>
      <Ghost>
        <Bell size={20} strokeWidth={1.5} color={C.ink} />
        {badge ? (
          <span style={{position: 'absolute', top: 2, right: -2}}>
            <Badge count={badge} />
          </span>
        ) : null}
      </Ghost>
      <span style={{marginLeft: 4, display: 'inline-flex'}}>
        <Avatar name={creator.name} online />
      </span>
    </div>
  </div>
);

/** The creator shell: logo cell, welcome header with the glass tray, glass sidebar with the lime active pill. */
export const DashboardShell: React.FC<{
  active: NavId;
  activeFrom?: NavId;
  activeT?: number;
  badge?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({active, activeFrom, activeT = 1, badge = '9+', children, style}) => (
  <div
    style={{
      position: 'relative',
      width: DASHBOARD.width,
      height: DASHBOARD.height,
      borderRadius: R.shell,
      background: HAZE.shell,
      overflow: 'hidden',
      fontFamily: FONT,
      color: C.ink,
      ...style,
    }}
  >
    <div style={{position: 'absolute', left: 24, top: 24, width: 248, height: 88, padding: '0 8px', boxSizing: 'border-box', display: 'flex', alignItems: 'center'}}>
      <LogoLockup />
    </div>
    <Header badge={badge} />
    <Sidebar active={active} activeFrom={activeFrom} activeT={activeT} />
    <div style={{position: 'absolute', left: DASHBOARD.content.x, top: DASHBOARD.content.y, width: DASHBOARD.content.width, height: DASHBOARD.content.height}}>{children}</div>
  </div>
);

/** Glass tab bar, 64 tall; the active tab is Label ink with a 2 px underline that grows in place (`underline` 0..1 = scaleX). */
export const TabBar: React.FC<{tabs: {label: string; count?: number}[]; active: number; underline?: number}> = ({tabs, active, underline = 1}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 48, height: 64, padding: '0 24px', boxSizing: 'border-box', borderRadius: R.pill, backgroundColor: C.glass, fontFamily: FONT}}>
    {tabs.map((tab, i) => {
      const on = i === active;
      return (
        <span key={tab.label} style={{position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 6, height: 48, whiteSpace: 'nowrap', ...(on ? TYPE.label : TYPE.body), color: on ? C.ink : C.inkSoft}}>
          {tab.label}
          {tab.count !== undefined ? <span style={{...TYPE.smallStrong, color: on ? C.ink : C.inkSoft}}>{tab.count}</span> : null}
          {on ? <span style={{position: 'absolute', left: 0, right: 0, bottom: 10, height: 2, borderRadius: 2, backgroundColor: C.ink, scale: `${underline} 1`}} /> : null}
        </span>
      );
    })}
  </div>
);

/** Glass toolbar (16 padding, 72 tall): optional H2 title or controls on the left; search square and dropdown right. */
export const Toolbar: React.FC<{title?: string; children?: React.ReactNode; dropdown?: string}> = ({title, children, dropdown = 'Sort: Fit'}) => (
  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, height: 72, padding: 16, boxSizing: 'border-box', borderRadius: R.pill, backgroundColor: C.glass, fontFamily: FONT}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 8}}>
      {title ? <span style={{...TYPE.h2, color: C.ink}}>{title}</span> : null}
      {children}
    </div>
    <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
      <span style={{display: 'grid', placeItems: 'center', width: 40, height: 40, boxSizing: 'border-box', borderRadius: R.search, backgroundColor: C.cardStrong, border: `1px solid ${C.lineStrong}`}}>
        <Search size={20} strokeWidth={1.5} color={C.ink} />
      </span>
      <span style={{display: 'inline-flex', alignItems: 'center', gap: 8, height: 40, padding: '0 16px', borderRadius: R.search, backgroundColor: C.cardStrong, ...TYPE.body, color: C.ink}}>
        {dropdown}
        <ChevronDown size={16} strokeWidth={1.5} color={C.ink} />
      </span>
    </div>
  </div>
);

/** Pure White table card, radius 28, 16 padding. */
export const TableCard: React.FC<{children?: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{position: 'relative', backgroundColor: C.cardStrong, borderRadius: R.card, padding: 16, boxSizing: 'border-box', overflow: 'hidden', fontFamily: FONT, ...style}}>{children}</div>
);

/** Dove Grey header pill, 48 tall, Small Strong ink labels in fixed-width columns. */
export const TableHeaderRow: React.FC<{labels: string[]; widths: number[]}> = ({labels, widths}) => (
  <div style={{display: 'flex', alignItems: 'center', height: 48, padding: '0 24px', borderRadius: R.pill, backgroundColor: C.tableHead}}>
    {labels.map((label, i) => (
      <span key={label} style={{...TYPE.smallStrong, color: C.ink, width: widths[i], flex: 'none'}}>
        {label}
      </span>
    ))}
  </div>
);

/** 48 px row at Paper White (Pure White when selected), Small ink-soft cells, 1 px Ledger Grey divider. */
export const TableRow: React.FC<{cells: React.ReactNode[]; widths: number[]; selected?: boolean; style?: React.CSSProperties}> = ({cells, widths, selected, style}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      height: 48,
      padding: '0 24px',
      boxSizing: 'border-box',
      backgroundColor: selected ? C.cardStrong : C.card,
      borderBottom: `1px solid ${C.lineRow}`,
      ...TYPE.small,
      // Inter's tnum also widens hyphens ("co - host"), so prose cells stay proportional; figures opt in.
      fontVariantNumeric: 'normal',
      fontFeatureSettings: 'normal',
      color: C.inkSoft,
      ...style,
    }}
  >
    {cells.map((cell, i) => (
      <div key={i} style={{width: widths[i], flex: 'none', display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis'}}>
        {cell}
      </div>
    ))}
  </div>
);

/** Overlay side panel: Pure White, 480 wide, radius 28, Overlay Soft shadow; header H2, status, close ghost. */
export const SidePanel: React.FC<{title: string; status?: React.ReactNode; children?: React.ReactNode; style?: React.CSSProperties}> = ({title, status, children, style}) => (
  <div style={{width: 480, backgroundColor: C.cardStrong, borderRadius: R.card, padding: 24, boxSizing: 'border-box', boxShadow: SHADOW.overlay, fontFamily: FONT, color: C.ink, ...style}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20}}>
      <span style={{...TYPE.h2, color: C.ink, flex: 1}}>{title}</span>
      {status}
      <Ghost>
        <X size={20} strokeWidth={1.5} color={C.ink} />
      </Ghost>
    </div>
    {children}
  </div>
);
