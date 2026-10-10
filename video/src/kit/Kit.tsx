import {Inbox, LayoutGrid, Lightbulb, Plus, Users} from 'lucide-react';
import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig} from 'remotion';
import {
  AiChip,
  Avatar,
  AvatarStack,
  Badge,
  BrowserFrame,
  ChapterTag,
  CommunityCard,
  CommunityChip,
  Cursor,
  DashboardShell,
  DMBubble,
  FitPill,
  GlassPill,
  INBOX_FINAL,
  InboxScreen,
  LogoLockup,
  makeFollowers,
  MiraChip,
  PageBackdrop,
  PhoneFrame,
  PrimaryButton,
  SecondaryButton,
  SphereCanvas,
  StatCard,
  StatusPill,
  TapRipple,
  UrlPill,
  WhitePill,
} from '../components';
import {communities, creator, messages, stats} from '../data';
import {FONT} from '../fonts';
import {DrawPath, LineReveal, Odometer, Typewriter} from '../motion';
import {C, HAZE, R, TYPE} from '../theme';

// QA contact sheet. Frames 0 to 74: every part on the page and a shell strip. Frames 75 to 149: the big assemblies.

const at = (x: number, y: number, scale = 1): React.CSSProperties => ({position: 'absolute', left: x, top: y, scale: `${scale}`, transformOrigin: 'top left'});
const row: React.CSSProperties = {display: 'flex', alignItems: 'center', gap: 12};
const STAT_ICONS = [Users, Lightbulb, Inbox];

const PageA: React.FC = () => (
  <AbsoluteFill style={{fontFamily: FONT, color: C.ink}}>
    <PageBackdrop />
    <div style={{...at(60, 44), ...row, gap: 48}}>
      <LogoLockup />
      <LogoLockup size={30} />
      <LogoLockup size={60} />
    </div>
    <div style={{...at(1270, 50), ...TYPE.heroNumber, fontSize: 72, color: C.ink}}>
      <Odometer value={740000} from={1} start={-20} duration={45} />
    </div>
    <div style={{...at(1600, 40)}}>
      <DrawPath d="M0 80 C 60 80 80 20 140 30 S 230 70 300 10" start={-30} duration={60} stroke={C.orange} strokeWidth={4} viewBox="0 0 300 90" width={260} height={78} />
    </div>
    <div style={{...at(60, 150), width: 1800, height: 210, borderRadius: R.shell, background: HAZE.shell}}>
      <div style={{...at(32, 32), display: 'flex', flexDirection: 'column', gap: 8, width: 248}}>
        <GlassPill>
          <LayoutGrid size={20} strokeWidth={1.5} color={C.ink} />
          Today
        </GlassPill>
        <GlassPill style={{backgroundColor: C.lime, fontWeight: 600}}>
          <Inbox size={20} strokeWidth={1.5} color={C.ink} fill={C.ink} />
          Inbox
        </GlassPill>
      </div>
      <div style={{...at(320, 40), display: 'flex', flexDirection: 'column', gap: 24}}>
        <ChapterTag n="02" label="Your AI briefs you" surface="shell" />
        <div style={row}>
          <SecondaryButton surface="glass" height={40}>
            Add community <Plus size={16} strokeWidth={1.5} color={C.ink} />
          </SecondaryButton>
          <GlassPill height={40}>Glass pill</GlassPill>
        </div>
      </div>
      <div style={at(760, 60)}>
        <UrlPill text="fellowowners.app/mira" caret />
      </div>
      <div style={{...at(1520, 70), ...TYPE.support, fontSize: 40}}>
        <Typewriter text="Frontend dev who lifts" start={-14} charsPerFrame={0.8} />
      </div>
    </div>
    <div style={{...at(60, 392), ...row, flexWrap: 'wrap', width: 1800}}>
      <WhitePill height={40}>White pill</WhitePill>
      <AiChip variant="pick" />
      <AiChip variant="reviewing" />
      <AiChip variant="suggested" />
      <AiChip variant="unanalyzed" />
      <FitPill score={88} />
      <FitPill score={64} />
      <FitPill score={22} />
      <StatusPill tone="warm">New</StatusPill>
      <StatusPill tone="cool">Shortlisted</StatusPill>
      <StatusPill tone="neutral">Filtered</StatusPill>
      <CommunityChip community={communities[0]} />
      <CommunityChip community={communities[4]} />
      <Badge count="9+" />
      <Avatar name={creator.name} online />
      <Avatar name="Arjun Mehta" />
      <Avatar name="Priya Nair" size={28} />
      <AvatarStack names={['Arjun Mehta', 'Priya Nair', 'Leo Brandt', 'Sana Iqbal']} visible={3.5} />
    </div>
    <div style={{...at(60, 460), ...row, gap: 20, alignItems: 'flex-start'}}>
      {stats.map((s, i) => (
        <StatCard key={s.label} tint={s.tint} icon={STAT_ICONS[i]} value={s.value} label={s.label} trend={s.trend} style={{width: 340}} />
      ))}
      <div style={{display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-start'}}>
        <MiraChip badge={3} />
        <ChapterTag n="01" label="Share your link" surface="page" />
        <div style={row}>
          <PrimaryButton icon={Plus}>Start your space</PrimaryButton>
          <SecondaryButton>Try the demo</SecondaryButton>
        </div>
      </div>
    </div>
    <div style={{...at(1640, 460, 0.48), display: 'flex', flexDirection: 'column', gap: 100, paddingTop: 50}}>
      <DMBubble message={messages[0]} ring={1} label="A real project" />
      <DMBubble message={messages[3]} />
    </div>
    <div style={{...at(60, 700, 0.62), display: 'grid', gridTemplateColumns: 'repeat(3, 600px)', gap: 20}}>
      {communities.map((c, i) => (
        <CommunityCard
          key={c.slug}
          community={c}
          join={i === 2}
          selected={i === 0 ? 1 : 0}
          suggested={i === 0 || i === 4 ? 1 : 0}
          reason={i === 0 || i === 4 ? 'Matches your intro' : undefined}
        />
      ))}
    </div>
    <div style={{...at(1220, 700, 0.62), display: 'grid', gridTemplateColumns: 'repeat(1, 600px)', gap: 20}}>
      <CommunityCard community={communities[3]} compact join />
    </div>
    <LineReveal
      lines={['Gypsy jumps, quirky fjord', 'Fellow Owners, 740,000']}
      start={0}
      style={{...at(1220, 880), ...TYPE.caption, fontSize: 56, color: C.ink}}
    />
  </AbsoluteFill>
);

const followers = makeFollowers(60, 'kit');

const PageB: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{fontFamily: FONT}}>
      <PageBackdrop />
      <div style={at(40, 40, 0.92)}>
        <DashboardShell active="inbox">
          <InboxScreen rows={INBOX_FINAL} />
        </DashboardShell>
      </div>
      <div style={at(1440, 40, 1)}>
        <PhoneFrame />
      </div>
      <div style={at(1000, 820, 1)}>
        <BrowserFrame url="fellowowners.app/mira/gym-log" width={400} height={220} />
      </div>
      <SphereCanvas
        spheres={followers.map((f, i) => ({x: (i / 59) * 820 - 410 + f.ux * 30, y: f.uy * 90, z: f.uz * 700, r: 16 * f.size, color: f.color}))}
        width={900}
        height={240}
        dof={0.03}
        shadow
        style={{left: 60, top: 800}}
      />
      <TapRipple x={700} y={500} progress={0.45} />
      <Cursor x={760} y={560} press={frame > 40 ? 1 : 0} />
    </AbsoluteFill>
  );
};

export const Kit: React.FC = () => {
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{backgroundColor: C.page}}>
      <Sequence name="Page A" durationInFrames={75} premountFor={fps}>
        <PageA />
      </Sequence>
      <Sequence name="Page B" from={75} premountFor={fps}>
        <PageB />
      </Sequence>
    </AbsoluteFill>
  );
};
