import React from 'react';
import {interpolateColors} from 'remotion';
import {AiChip, Avatar, FitPill, StatusPill, TabBar, TableCard, TableHeaderRow, TableRow, Toolbar} from '../../components';
import type {Message} from '../../data';
import {mix} from '../../motion';
import {C, R, TNUM} from '../../theme';

// Mirrors the kit's InboxScreen / InboxTable cell for cell (same tabs, columns, sizes), so the scene's last frame equals
// <InboxScreen rows={INBOX_FINAL} filteredCount={4} /> (H5). Adds what Triage needs: rows that open out of a short
// white pill, a horizontal push, a masked New → Filtered status swap, and a selected row while the side panel is open.
// ponytail: copy of the kit layout, not a kit change (kit is outside this task's ownership).

export type TriageRow = {
  message: Message;
  slot: number;
  opacity: number;
  x: number;
  open: number; // 0 = short pill, 1 = full row
  fit: number;
  lift: number;
  filtered?: number; // spam only: 0 = New, 1 = Filtered
  selected: boolean;
};

const LABELS = ['Sender', 'Type', 'Summary', 'Fit', 'Status', 'When'];
const WIDTHS = [220, 104, 380, 116, 124, 104];
const TABS = ['All', 'Collabs', 'Investment', 'Ideas', 'Press', 'Fan notes'];
const ROW = 48;
const ROWS_TOP = 72;
const FULL = 1096; // table card 1128 - 2 x 16 padding
const PILL = 236; // avatar and sender name
const STATUS = {new: ['warm', 'New'], shortlisted: ['cool', 'Shortlisted'], filtered: ['neutral', 'Filtered']} as const;

/** New rolls up and out, Filtered rises in, both inside one pill-shaped mask. */
const FilteredSwap: React.FC<{t: number}> = ({t}) => (
  <span style={{display: 'inline-grid', height: 24, overflow: 'hidden', borderRadius: R.pill}}>
    <span style={{gridArea: '1 / 1', display: 'flex', justifySelf: 'start', translate: `0 ${-100 * t}%`}}>
      <StatusPill tone="warm">New</StatusPill>
    </span>
    <span style={{gridArea: '1 / 1', display: 'flex', translate: `0 ${100 * (1 - t)}%`}}>
      <StatusPill tone="neutral">Filtered</StatusPill>
    </span>
  </span>
);

const Row: React.FC<{row: TriageRow}> = ({row: {message: m, slot, opacity, x, open, fit, lift, filtered, selected}}) => {
  const [tone, word] = STATUS[m.status];
  const cells = [
    <>
      <Avatar name={m.from} size={28} />
      <span style={{overflow: 'hidden', textOverflow: 'ellipsis'}}>{m.from}</span>
    </>,
    m.typeLabel,
    <span style={{overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: 16}}>{m.summary}</span>,
    m.fit === null ? <AiChip variant="reviewing" /> : <FitPill score={m.fit} fill={fit} />,
    filtered === undefined ? <StatusPill tone={tone}>{word}</StatusPill> : <FilteredSwap t={filtered} />,
    <span style={{...TNUM, color: C.inkMuted}}>{m.meta.split(' · ')[1]}</span>,
  ];
  const top = ROWS_TOP + slot * ROW;
  const isSelected = selected || lift > 0;
  if (open >= 1) {
    // Exactly the kit row (no wrapper, translate only while pushed) so the resting table matches InboxTable pixel for pixel.
    return (
      <TableRow
        cells={cells}
        widths={WIDTHS}
        selected={isSelected}
        style={{position: 'absolute', left: 16, right: 16, top, opacity, scale: `${1 + 0.02 * lift}`, translate: x === 0 ? undefined : `${x}px 0`}}
      />
    );
  }
  return (
    <div
      style={{
        position: 'absolute',
        left: 16 + x,
        top,
        width: mix(PILL, FULL, open),
        height: ROW,
        overflow: 'hidden',
        borderRadius: 24 * (1 - open),
        outline: `1px solid ${interpolateColors(open, [0.6, 1], [C.line, 'rgba(229,229,232,0)'])}`,
        opacity,
      }}
    >
      <TableRow cells={cells} widths={WIDTHS} selected={isSelected} style={{width: FULL}} />
    </div>
  );
};

/** Tab bar (Filtered count live), toolbar ("Sort: Fit") and the table card, filling the 1128 x 650 content box. */
export const TriageScreen: React.FC<{rows: TriageRow[]; filteredCount: number}> = ({rows, filteredCount}) => (
  <div style={{display: 'flex', flexDirection: 'column', gap: 16, width: 1128, height: 650}}>
    <TabBar tabs={[...TABS.map((label) => ({label})), {label: 'Filtered', count: filteredCount}]} active={0} />
    <Toolbar />
    <div style={{flex: 1, minHeight: 0}}>
      <TableCard style={{width: '100%', height: '100%'}}>
        <TableHeaderRow labels={LABELS} widths={WIDTHS} />
        {[...rows]
          // Lifted rows on top; otherwise top to bottom, the kit's paint order (rows share fractional-pixel edges at 1680 wide).
          .sort((a, b) => a.lift - b.lift || a.slot - b.slot)
          .map((row) => (
            <Row key={row.message.id} row={row} />
          ))}
      </TableCard>
    </div>
  </div>
);
