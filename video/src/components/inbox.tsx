import React from 'react';
import type {Message} from '../data';
import {SORTED_INBOX} from '../data';
import {C, TNUM} from '../theme';
import {Avatar} from './avatar';
import {AiChip, FitPill, StatusPill} from './chips';
import {TabBar, TableCard, TableHeaderRow, TableRow, Toolbar} from './dashboard';

// Shared by Triage and Today so the H5 handoff matches pixel for pixel.

export type InboxRowInput = {message: Message; slot: number; opacity?: number; fit?: number; reviewing?: boolean; lift?: number};

const LABELS = ['Sender', 'Type', 'Summary', 'Fit', 'Status', 'When'];
const WIDTHS = [220, 104, 380, 116, 124, 104]; // 1048 = 1128 content - 2 x 16 card padding - 2 x 24 row padding
const ROW = 48;
const ROWS_TOP = 72; // card padding 16 + header 48 + 8

const STATUS = {new: ['warm', 'New'], shortlisted: ['cool', 'Shortlisted'], filtered: ['neutral', 'Filtered']} as const;

/** Table card whose rows sit at `slot * 48` below the header, so a fractional slot slides a row (re-sorts, fly-ins). */
export const InboxTable: React.FC<{rows: InboxRowInput[]}> = ({rows}) => (
  <TableCard style={{width: '100%', height: '100%'}}>
    <TableHeaderRow labels={LABELS} widths={WIDTHS} />
    {[...rows]
      .sort((a, b) => (a.lift ?? 0) - (b.lift ?? 0))
      .map(({message: m, slot, opacity = 1, fit = 1, reviewing, lift = 0}) => {
        const [tone, word] = STATUS[m.status];
        const cells = [
          <>
            <Avatar name={m.from} size={28} />
            <span style={{overflow: 'hidden', textOverflow: 'ellipsis'}}>{m.from}</span>
          </>,
          m.typeLabel,
          <span style={{overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 16}}>
            {m.summary}
          </span>,
          reviewing || m.fit === null ? <AiChip variant="reviewing" /> : <FitPill score={m.fit} fill={fit} />,
          <StatusPill tone={tone}>{word}</StatusPill>,
          <span style={{...TNUM, color: C.inkMuted}}>{m.meta.split(' · ')[1]}</span>,
        ];
        return (
          <TableRow
            key={m.id}
            cells={cells}
            widths={WIDTHS}
            selected={lift > 0}
            style={{position: 'absolute', left: 16, right: 16, top: ROWS_TOP + slot * ROW, opacity, scale: `${1 + 0.02 * lift}`}}
          />
        );
      })}
  </TableCard>
);

const TABS = ['All', 'Collabs', 'Investment', 'Ideas', 'Press', 'Fan notes'];

/** Tab bar, toolbar ("Sort: Fit") and the inbox table, filling the 1128 x 650 content box. */
export const InboxScreen: React.FC<{rows: InboxRowInput[]; filteredCount?: number; activeTab?: number}> = ({rows, filteredCount = 4, activeTab = 0}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 16, width: 1128, height: 650}}>
    <TabBar tabs={[...TABS.map((label) => ({label})), {label: 'Filtered', count: filteredCount}]} active={activeTab} />
    <Toolbar />
    <div style={{flex: 1, minHeight: 0}}>
      <InboxTable rows={rows} />
    </div>
  </div>
);

export const INBOX_FINAL: InboxRowInput[] = SORTED_INBOX.map((message, slot) => ({message, slot, fit: 1}));
