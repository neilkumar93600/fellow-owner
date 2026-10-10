import {Check, UserPlus} from 'lucide-react';
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {AiChip, Avatar, CommunityChip, GlassPill, IconTile, PlatformIcon, PrimaryButton, SecondaryButton, TINTS, WhitePill} from '../../components';
import type {Community} from '../../data';
import {communities, creator, FAN_INTRO} from '../../data';
import {FONT} from '../../fonts';
import {Odometer, ramp, Typewriter} from '../../motion';
import {C, EASE, R, TYPE} from '../../theme';
import {BIO_PITCH_TOP, BIO_ROW_H, bioRowTop, CARD, GRID_Y, joinLayout, ROW2_H, TEXTAREA, TILE_W} from './layout';

const byName = (name: string): Community => {
  const found = communities.find((c) => c.name === name);
  if (!found) throw new Error(`Unknown demo community: ${name}`);
  return found;
};

/** Rises out of its own mask (the wrapper clips, the content climbs in from below). */
const Rise: React.FC<{at: number; style: React.CSSProperties; children: React.ReactNode}> = ({at, style, children}) => {
  const frame = useCurrentFrame();
  const e = ramp(frame, at, 18);
  return (
    <div style={{position: 'absolute', overflow: 'hidden', ...style}}>
      <div style={{width: '100%', height: '100%', translate: `0 ${(1 - e) * 105}%`}}>{children}</div>
    </div>
  );
};

const BioRow: React.FC<{community: Community; press: number}> = ({community, press}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 12, height: '100%', padding: '0 16px', boxSizing: 'border-box', borderRadius: R.idea, backgroundColor: TINTS[community.tint].bg}}>
    <IconTile tint={community.tint} icon={community.icon} size={44} />
    <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
      <span style={{...TYPE.h2, color: C.ink}}>{community.name}</span>
      <span style={{...TYPE.small, color: C.inkSoft}}>{community.members} members</span>
    </div>
    <SecondaryButton height={40} press={press}>
      Join
    </SecondaryButton>
  </div>
);

const BIO_ROWS = ['Builders', 'Fitness Crew', 'Designers', 'Local Impact'];

/** Mira's bio page, built on the phone from frame 30 (stagger 4). `joinPress` is the Builders Join pill's press (0..1). */
export const BioPage: React.FC<{joinPress: number}> = ({joinPress}) => {
  const frame = useCurrentFrame();
  const avatar = ramp(frame, 30, 20);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 390, height: 800, fontFamily: FONT, color: C.ink}}>
      <div style={{position: 'absolute', left: 147, top: 24, scale: `${avatar}`}}>
        <Avatar name={creator.name} size={96} fontSize={32} fontWeight={600} />
      </div>
      <Rise at={34} style={{left: 0, top: 132, width: 390, height: 32}}>
        <div style={{...TYPE.h1, textAlign: 'center'}}>{creator.name}</div>
      </Rise>
      <Rise at={38} style={{left: 32, top: 168, width: 326, height: 44}}>
        <div style={{...TYPE.body, textAlign: 'center', color: C.inkSoft}}>{creator.bio}</div>
      </Rise>
      <div style={{position: 'absolute', left: 0, top: 224, width: 390, display: 'flex', justifyContent: 'center', gap: 6}}>
        {creator.platforms.map((p, i) => (
          <Rise key={p.platform} at={42 + i * 4} style={{position: 'relative', height: 30}}>
            <GlassPill height={30} style={{padding: '0 9px', gap: 6, fontSize: 13, lineHeight: '18px'}}>
              <PlatformIcon platform={p.platform} size={14} />
              {p.platform} {p.followers}
            </GlassPill>
          </Rise>
        ))}
      </div>
      <Rise at={54} style={{left: 16, top: 276, width: 358, height: 28}}>
        <div style={{...TYPE.h2}}>Join a community</div>
      </Rise>
      {BIO_ROWS.map((name, i) => (
        <Rise key={name} at={58 + i * 4} style={{left: 16, top: bioRowTop(i), width: 358, height: BIO_ROW_H}}>
          <BioRow community={byName(name)} press={i === 0 ? joinPress : 0} />
        </Rise>
      ))}
      <Rise at={74} style={{left: 16, top: BIO_PITCH_TOP + 2, width: 358, height: 48}}>
        <WhitePill height={48} style={{width: '100%', justifyContent: 'center', boxSizing: 'border-box'}}>
          Send Mira a pitch
        </WhitePill>
      </Rise>
    </div>
  );
};

const PickTile: React.FC<{community: Community; x: number; y: number; h: number; enterAt: number; suggestAt?: number; selectAt: number}> = ({
  community,
  x,
  y,
  h,
  enterAt,
  suggestAt,
  selectAt,
}) => {
  const frame = useCurrentFrame();
  const enter = ramp(frame, enterAt, 14);
  const suggest = suggestAt === undefined ? 0 : ramp(frame, suggestAt, 14);
  const select = ramp(frame, selectAt, 8, EASE.quart);
  const tint = TINTS[community.tint];
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: TILE_W,
        height: h,
        overflow: 'hidden',
        boxSizing: 'border-box',
        borderRadius: R.chip,
        backgroundColor: community.tint === 'white' ? C.card : tint.bg,
        border: community.tint === 'white' ? `1px solid ${C.line}` : undefined,
        translate: `0 ${(1 - enter) * 90}px`,
      }}
    >
      <div style={{position: 'absolute', left: 12, top: 12}}>
        <IconTile tint={community.tint} icon={community.icon} size={32} />
      </div>
      <span style={{position: 'absolute', left: 12, top: 50, ...TYPE.label, color: C.ink, whiteSpace: 'nowrap'}}>{community.name}</span>
      {suggest > 0 ? (
        <>
          <div style={{position: 'absolute', left: 12, top: 80, scale: `${suggest}`, transformOrigin: 'left center'}}>
            <AiChip variant="suggested" />
          </div>
          <div style={{position: 'absolute', left: 12, top: 108, width: TILE_W - 24, height: 54, overflow: 'hidden'}}>
            <div style={{...TYPE.small, color: C.inkSoft, translate: `0 ${(1 - suggest) * 105}%`}}>Matches your intro: {FAN_INTRO.toLowerCase()}</div>
          </div>
        </>
      ) : null}
      {select > 0 ? (
        <>
          <div style={{position: 'absolute', inset: 0, borderRadius: R.chip, border: `2px solid ${C.ink}`, opacity: select}} />
          <span
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              display: 'grid',
              placeItems: 'center',
              width: 24,
              height: 24,
              borderRadius: 9999,
              backgroundColor: C.ink,
              scale: `${select}`,
            }}
          >
            <Check size={16} strokeWidth={2} color={C.cardStrong} />
          </span>
        </>
      ) : null}
    </div>
  );
};

/** The Join card: progress dots, the intro textarea, then the picker and the one purple button. */
export const JoinPage: React.FC<{buttonPress: number; buttonLoading: number}> = ({buttonPress, buttonLoading}) => {
  const frame = useCurrentFrame();
  const l = joinLayout(frame);
  const focus = ramp(frame, 121, 6, EASE.quart);
  const col2 = CARD.pad + TILE_W + 10;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 390, height: 744, fontFamily: FONT, color: C.ink}}>
      <div style={{position: 'absolute', left: CARD.x, top: CARD.y, width: CARD.w, height: l.height, overflow: 'hidden', borderRadius: R.card, backgroundColor: C.cardStrong}}>
        <div style={{position: 'absolute', left: CARD.pad, top: CARD.pad, height: 24, display: 'flex', alignItems: 'center', gap: 12}}>
          <span style={{display: 'flex', alignItems: 'center', gap: 6}} aria-label="Step 2 of 3">
            <span style={{width: 8, height: 8, borderRadius: 4, backgroundColor: C.ink}} />
            <span style={{width: 24, height: 8, borderRadius: 4, backgroundColor: C.ink}} />
            <span style={{width: 8, height: 8, borderRadius: 4, backgroundColor: C.lineField}} />
          </span>
          <span style={{...TYPE.small, color: C.inkMuted}}>Step 2 of 3</span>
        </div>
        <div style={{position: 'absolute', left: CARD.pad, top: 58, ...TYPE.h1}}>Tell us about you</div>
        <div style={{position: 'absolute', left: CARD.pad, top: 104, ...TYPE.smallStrong, color: C.ink}}>One line about you</div>
        <div
          style={{
            position: 'absolute',
            left: CARD.pad,
            top: TEXTAREA.y,
            width: CARD.w - 2 * CARD.pad,
            height: TEXTAREA.h,
            boxSizing: 'border-box',
            padding: '12px 14px',
            borderRadius: R.field,
            backgroundColor: C.cardStrong,
            border: `1px solid ${focus > 0.5 ? C.ink : C.lineField}`,
            ...TYPE.body,
            color: C.ink,
          }}
        >
          <Typewriter text={FAN_INTRO} start={125} charsPerFrame={0.5} caretUntil={200} />
        </div>
        <div style={{position: 'absolute', left: CARD.pad, top: 250, ...TYPE.smallStrong, color: C.ink}}>Pick your communities</div>
        <PickTile community={byName('Builders')} x={CARD.pad} y={GRID_Y} h={l.row1} enterAt={178} suggestAt={190} selectAt={210} />
        <PickTile community={byName('Fitness Crew')} x={col2} y={GRID_Y} h={l.row1} enterAt={181} suggestAt={197} selectAt={220} />
        <PickTile community={byName('Designers')} x={CARD.pad} y={l.row2Y} h={ROW2_H} enterAt={184} selectAt={9999} />
        <PickTile community={byName('Local Impact')} x={col2} y={l.row2Y} h={ROW2_H} enterAt={187} selectAt={9999} />
        <div style={{position: 'absolute', left: CARD.pad, top: l.buttonY, width: CARD.w - 2 * CARD.pad}}>
          <PrimaryButton width="100%" press={buttonPress} loading={buttonLoading} icon={UserPlus}>
            Join 2 communities
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

/** Success: the Builders header band with the member count ticking, "You’re in." and the second community. */
export const SuccessPage: React.FC = () => {
  const builders = byName('Builders');
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 390, height: 744, fontFamily: FONT, color: C.ink}}>
      <div style={{position: 'absolute', left: 16, top: 16, width: 358, height: 202, borderRadius: R.card, backgroundColor: C.aqua}}>
        <div style={{position: 'absolute', left: 24, top: 24, display: 'flex', alignItems: 'center', gap: 16}}>
          <IconTile tint={builders.tint} icon={builders.icon} />
          <span style={{...TYPE.display, color: C.ink}}>{builders.name}</span>
        </div>
        <div style={{position: 'absolute', left: 24, top: 108, ...TYPE.body, color: C.inkMuted}}>Members</div>
        <div style={{position: 'absolute', left: 24, top: 134}}>
          <Odometer value={builders.members + 1} from={builders.members} start={258} duration={12} style={{...TYPE.stat, color: C.ink}} />
        </div>
      </div>
      <div style={{position: 'absolute', left: 16, top: 246, ...TYPE.h1}}>You’re in.</div>
      <div style={{position: 'absolute', left: 16, top: 292, scale: '1.4', transformOrigin: 'left center'}}>
        <CommunityChip community={byName('Fitness Crew')} />
      </div>
    </div>
  );
};
