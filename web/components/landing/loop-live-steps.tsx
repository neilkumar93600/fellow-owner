'use client';

import { Check, MousePointerClick, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { CommunityGrid } from '@/components/bio/community-grid';
import { DecisionCard } from '@/components/dashboard/today/decision-card';
import { AvatarInitials, AvatarStack } from '@/components/shared/avatar-initials';
import { CommunityChip } from '@/components/shared/community-chip';
import { IdeaCard } from '@/components/shared/idea-card';
import { SignalButtons } from '@/components/shared/signal-buttons';
import { StatCard } from '@/components/shared/stat-card';
import { EXAMPLE } from './example-data';
import {
  LIVE_CREW,
  LIVE_DECISION,
  LIVE_FEED,
  LIVE_JOIN,
  LIVE_JOINED_ROOM,
  LIVE_ROOMS,
  LIVE_SPACE,
  LIVE_STAT,
} from './loop-live-data';

// Steps 2 to 5 of the loop's live layer (loop-live.tsx). Only the client ever renders them, after the
// scroll leaves step 1, so they load as their own chunk: the idea card's tooltip, the decision card and
// the stat ticker stay off the landing page's first load.

const noop = () => {};
const BIO = 'mx-auto flex max-w-[792px] flex-col gap-8 p-8 @container';

export function LaterBrowserPage({ step }: { step: number }) {
  switch (step) {
    case 1:
      return (
        <div className={BIO}>
          <p className="glass-chip inline-flex h-10 items-center gap-2 self-start px-4 text-label text-ink">
            <Check aria-hidden="true" strokeWidth={2} className="size-4 text-success" />
            Joined {LIVE_JOINED_ROOM.name}
          </p>
          <CommunityGrid
            handle={LIVE_SPACE.handle}
            communities={LIVE_ROOMS}
            joinedIds={[LIVE_JOINED_ROOM.id]}
            interactive={false}
          />
        </div>
      );
    case 2:
      return (
        <div className="mx-auto flex max-w-[792px] flex-col gap-5 p-8">
          <div className="flex items-center justify-between gap-4">
            <p className="font-display text-[2.5rem] leading-none text-ink">
              {LIVE_JOINED_ROOM.name}
            </p>
            <CommunityChip
              name={`${LIVE_JOINED_ROOM.memberCount.toLocaleString('en-US')} fans`}
              tint={LIVE_JOINED_ROOM.tint}
              icon={LIVE_JOINED_ROOM.icon}
            />
          </div>
          {LIVE_FEED.map((post) => (
            <IdeaCard key={post.id} post={post} href="#" variant="fan" />
          ))}
        </div>
      );
    case 3:
      return (
        <div className="mx-auto flex max-w-[792px] flex-col gap-5 p-8">
          <div className="glass-strong flex flex-col gap-5 p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CommunityChip
                name={LIVE_JOINED_ROOM.name}
                tint={LIVE_JOINED_ROOM.tint}
                icon={LIVE_JOINED_ROOM.icon}
              />
              <AvatarStack people={LIVE_CREW} />
            </div>
            <p className="font-display text-[2.5rem] leading-[1.05] text-ink">
              {EXAMPLE.idea.title}
            </p>
            <p className="text-small-strong text-ink-soft">
              Crew · {LIVE_CREW.length} of {LIVE_CREW.length} roles filled
            </p>
            <ul className="flex flex-col gap-2">
              {LIVE_CREW.map((member) => (
                <li
                  key={member.role}
                  className="flex items-center gap-3 rounded-2xl bg-white/70 py-2.5 pr-4 pl-2.5"
                >
                  <AvatarInitials name={member.name} image={member.image} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-label text-ink">{member.name}</span>
                    <span className="block text-small text-ink-soft">{member.role}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-small text-success-ink">
                    <Check aria-hidden="true" strokeWidth={2} className="size-4" />
                    Filled
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      );
    default:
      return (
        <div className="mx-auto flex max-w-[1040px] flex-col gap-6 p-8">
          <div>
            <p className="font-display text-[2.5rem] leading-none text-ink">
              Good morning, {EXAMPLE.creator.firstName}
            </p>
            <p className="mt-2 text-body text-ink-soft">5 things need you</p>
          </div>
          <div className="grid grid-cols-[1fr_300px] items-start gap-6">
            <DecisionCard
              item={LIVE_DECISION}
              featureHref="#"
              loved={false}
              canLove
              onFeature={noop}
              onReply={noop}
              onLove={noop}
              onLater={noop}
            />
            <StatCard
              tint="peach"
              icon={MousePointerClick}
              value={LIVE_STAT.value}
              label={LIVE_STAT.label}
              changePct={null}
              descriptor={LIVE_STAT.descriptor}
              href="#"
            />
          </div>
        </div>
      );
  }
}

/** A plain phone card: the fan's side of the same step. */
function PhoneCard({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="glass-strong flex flex-col gap-3 p-5">
      <p className="text-caption text-ink-soft uppercase">{kicker}</p>
      <p className="font-display text-[1.75rem] leading-[1.1] text-ink">{title}</p>
      {children}
    </div>
  );
}

export function LaterPhonePage({ step }: { step: number }) {
  switch (step) {
    case 1:
      return (
        <div className="flex flex-col gap-4 px-4 pt-14">
          <PhoneCard kicker="Join" title="Rooms picked for you">
            <p className="text-small text-ink-soft">“{LIVE_JOIN.intro}”</p>
            <ul className="flex flex-col gap-2">
              {LIVE_JOIN.picks.map((pick) => (
                <li key={pick.room.id} className="flex flex-col gap-1 rounded-2xl bg-white/70 p-3">
                  <span className="flex items-center justify-between gap-2">
                    <CommunityChip
                      name={pick.room.name}
                      tint={pick.room.tint}
                      icon={pick.room.icon}
                    />
                    <Check aria-hidden="true" strokeWidth={2} className="size-4 text-success" />
                  </span>
                  <span className="text-small text-ink-soft">
                    <Sparkles
                      aria-hidden="true"
                      strokeWidth={1.5}
                      className="mr-1 inline size-3.5"
                    />
                    {pick.why}
                  </span>
                </li>
              ))}
            </ul>
          </PhoneCard>
        </div>
      );
    case 2:
      return (
        <div className="flex flex-col gap-4 px-4 pt-14">
          <PhoneCard
            kicker={`${EXAMPLE.idea.author} in ${EXAMPLE.idea.community}`}
            title={EXAMPLE.idea.title}
          >
            <p className="text-small text-ink-soft">Seven days for $420 all in.</p>
            <SignalButtons
              useCount={EXAMPLE.idea.use}
              buildCount={EXAMPLE.idea.build}
              viewerSignals={['use']}
            />
          </PhoneCard>
        </div>
      );
    case 3:
      return (
        <div className="flex flex-col gap-4 px-4 pt-14">
          <PhoneCard kicker="Your crew" title="You’re in as Photographer">
            <AvatarStack people={LIVE_CREW} />
          </PhoneCard>
        </div>
      );
    default:
      return (
        <div className="flex flex-col gap-4 px-4 pt-14">
          <PhoneCard kicker={`Featured by ${EXAMPLE.creator.firstName}`} title={EXAMPLE.idea.title}>
            <p className="text-small-strong text-ink">Made by</p>
            <ul className="flex flex-col gap-1.5">
              {LIVE_CREW.map((member) => (
                <li key={member.role} className="flex items-center gap-2 text-small text-ink">
                  <AvatarInitials name={member.name} image={member.image} size={28} />
                  {member.firstName}
                  <span className="text-ink-soft">· {member.role}</span>
                </li>
              ))}
            </ul>
          </PhoneCard>
        </div>
      );
  }
}
