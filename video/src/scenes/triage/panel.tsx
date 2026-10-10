import React from 'react';
import {AiChip, DASHBOARD, FitPill, PrimaryButton, SecondaryButton, SidePanel, StatusPill} from '../../components';
import {messages} from '../../data';
import {C, R, TYPE} from '../../theme';

const arjun = messages.find((m) => m.id === 'm1')!;

/**
 * Arjun's pitch as the inbox side panel, docked to the dashboard's right edge (rendered inside the shell's content box,
 * so the shell clips it); `x` pushes it out to the right (0 = open).
 */
export const ArjunPanel: React.FC<{x: number}> = ({x}) => (
  <SidePanel
    title={arjun.from}
    status={<StatusPill tone="cool">Shortlisted</StatusPill>}
    style={{position: 'absolute', left: DASHBOARD.width - 480 - DASHBOARD.content.x + x, top: -DASHBOARD.content.y, height: DASHBOARD.height, borderRadius: `${R.card}px 0 0 ${R.card}px`}}
  >
    <div style={{...TYPE.h1, color: C.ink}}>Gym-log app for creators</div>
    <div style={{display: 'flex', alignItems: 'center', gap: 8, marginTop: 16}}>
      <AiChip variant="pick" />
      <FitPill score={arjun.fit ?? 0} />
    </div>
    <div style={{...TYPE.small, color: C.inkMuted, marginTop: 12}}>{arjun.reason}</div>
    <div style={{...TYPE.body, color: C.ink, marginTop: 20}}>{arjun.text}</div>
    <div style={{display: 'flex', gap: 12, marginTop: 24}}>
      <SecondaryButton>Shortlist</SecondaryButton>
      <span style={{flex: 1, display: 'flex'}}>
        <PrimaryButton width="100%">Reply</PrimaryButton>
      </span>
    </div>
  </SidePanel>
);
