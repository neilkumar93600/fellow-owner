import {
  ArrowUpRight,
  Check,
  ChevronLeft,
  Code2,
  Dumbbell,
  Ellipsis,
  Hammer,
  Leaf,
  type LucideIcon,
  MessageCircle,
  Music,
  PenTool,
  Plus,
  Send,
  Server,
  ThumbsUp,
  X,
} from 'lucide-react';
import type * as React from 'react';
import { cn } from '@/lib/utils';
import { communities, creator, fan } from './demo-data';
import { FAN_INTRO, type FanStep } from './fans-data';
import s from './fans-screens.module.css';

/*
 * The four fan screens inside the phone, built from the real UI specs (04 §7, DESIGN.md "Fan pages"): the
 * Pewter Shell page with glass chips, pastel community cards, the white Join card, the community feed and the
 * post detail. Every size is in em so the whole screen scales with the phone (the frame sets font-size).
 * These are pictures of the product: the phone is aria-hidden and the step list carries the meaning, so
 * nothing in here is a real control.
 */

type CardTint = 'peach' | 'lavender' | 'aqua' | 'white';

const TINT_CLASS: Record<CardTint, string | undefined> = {
  peach: s.tPeach,
  lavender: s.tLavender,
  aqua: s.tAqua,
  white: s.tWhite,
};

const ICONS: Record<string, LucideIcon> = {
  builders: Code2,
  designers: PenTool,
  fitness: Dumbbell,
  music: Music,
  'local-impact': Leaf,
};

/** Community cards rotate apricot, lavender, aqua and white; lime stays reserved for "you are here" and AI. */
const CARD_TINT: Record<string, CardTint> = {
  builders: 'aqua',
  designers: 'lavender',
  fitness: 'peach',
  music: 'white',
  'local-impact': 'white',
};

function community(slug: string) {
  const found = communities.find((c) => c.slug === slug);
  if (!found) throw new Error(`Unknown demo community: ${slug}`);
  return { ...found, Icon: ICONS[slug] ?? Code2, cardTint: CARD_TINT[slug] ?? 'white' };
}

function Avatar({
  initials,
  tint,
  className,
}: {
  initials: string;
  tint: 'peach' | 'lavender' | 'aqua';
  className?: string;
}) {
  return <span className={cn(s.avatar, s[`av_${tint}`], className)}>{initials}</span>;
}

/** The fan's in-app browser chrome (Instagram, TikTok and YouTube all frame the page like this). */
export function FanScreen({ step, children }: { step: FanStep; children: React.ReactNode }) {
  return (
    <div className={s.screen}>
      <div className={s.browser}>
        <X className={s.browserIcon} strokeWidth={1.75} />
        <span className={s.browserTitle}>
          <span className={s.browserName}>{step.pageTitle}</span>
          <span className={s.browserPath}>{step.path}</span>
        </span>
        <Ellipsis className={s.browserIcon} strokeWidth={1.75} />
      </div>
      <div className={s.page}>{children}</div>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* 1. Bio page                                                                                     */
/* ---------------------------------------------------------------------------------------------- */

const BIO_COMMUNITIES = ['builders', 'designers', 'fitness', 'local-impact'] as const;

export function BioScreen() {
  const featured = community('builders');
  return (
    <div className={s.bio}>
      <div className={s.bioHead}>
        <Avatar initials="MK" tint="lavender" className={s.bioAvatar} />
        <p className={s.bioName}>{creator.name}</p>
        <p className={s.bioMeta}>
          @{creator.handle} · <span className="tabular">{creator.followers}</span> followers
        </p>
        <ul className={s.platforms}>
          {creator.platforms.map((p) => (
            <li key={p.platform} className={s.platform}>
              {p.platform} <strong className="tabular">{p.followers}</strong>
            </li>
          ))}
        </ul>
      </div>

      <div className={s.rowHead}>
        <p className={s.label}>Join a community</p>
        <p className={s.rowMeta}>See all {communities.length}</p>
      </div>
      <ul className={s.bioGrid}>
        {BIO_COMMUNITIES.map((slug) => {
          const c = community(slug);
          return (
            <li key={slug} className={cn(s.ccard, TINT_CLASS[c.cardTint])}>
              <span className={s.ccardTop}>
                <span className={s.tile}>
                  <c.Icon strokeWidth={1.5} />
                </span>
                <span className={s.joinPill}>Join</span>
              </span>
              <span className={s.ccardName}>{c.name}</span>
              <span className={cn(s.ccardMembers, 'tabular')}>{c.members} members</span>
            </li>
          );
        })}
      </ul>

      <span className={s.pitchPill}>
        <Send strokeWidth={1.5} />
        Send {creator.firstName} a pitch
      </span>

      <p className={cn(s.label, s.featuredLabel)}>Featured by {creator.firstName}</p>
      <div className={s.featured}>
        <span className={cn(s.tile, s.tileAqua)}>
          <featured.Icon strokeWidth={1.5} />
        </span>
        <span className={s.featuredText}>
          <span className={s.featuredTitle}>Gym-log app for creators</span>
          <span className={s.featuredMeta}>Builders · team of 4</span>
        </span>
        <ArrowUpRight className={s.featuredArrow} strokeWidth={1.5} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* 2. Join, step 2 of 3                                                                            */
/* ---------------------------------------------------------------------------------------------- */

const JOIN_TILES = [
  { slug: 'builders', suggested: true },
  { slug: 'fitness', suggested: true },
  { slug: 'designers', suggested: false },
  { slug: 'music', suggested: false },
] as const;

export function JoinScreen() {
  return (
    <div className={s.join} data-fans-join>
      <div className={s.joinTop}>
        <span className={s.ghost}>
          <ChevronLeft strokeWidth={1.75} />
        </span>
        <span className={s.dots}>
          <span className={s.dotDone} />
          <span className={s.dotNow} />
          <span className={s.dotNext} />
        </span>
        <span className={cn(s.rowMeta, 'tabular')}>2 of 3</span>
      </div>

      <div className={s.joinCard}>
        <p className={s.joinTitle}>Tell us about you</p>
        <p className={s.joinSub}>One line is enough. We suggest communities from it.</p>

        <p className={s.fieldLabel}>Your intro</p>
        <div className={s.textarea}>
          <span data-fans-typed>{FAN_INTRO}</span>
          <span className={s.caret} />
          <span className={cn(s.count, 'tabular')}>
            <span data-fans-count>{FAN_INTRO.length}</span>/140
          </span>
        </div>

        <p className={s.fieldLabel}>Pick your communities</p>
        <ul className={s.joinGrid}>
          {JOIN_TILES.map(({ slug, suggested }) => {
            const c = community(slug);
            return (
              <li
                key={slug}
                className={cn(s.jtile, TINT_CLASS[c.cardTint], suggested && s.jtileOn)}
              >
                <span className={cn(s.tile, s.tileSm)}>
                  <c.Icon strokeWidth={1.5} />
                </span>
                <span className={s.jtileName}>{c.name}</span>
                {suggested ? <span className={s.suggested}>AI suggested</span> : null}
                {suggested ? (
                  <span className={s.check}>
                    <Check strokeWidth={2.25} />
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>

        <span className={cn(s.primary, s.confirm)}>Confirm</span>
      </div>
      <p className={s.joinNext}>Next: skills and links, if you like</p>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* 3. Community feed                                                                               */
/* ---------------------------------------------------------------------------------------------- */

export function FeedScreen() {
  const builders = community('builders');
  return (
    <div className={s.feed} data-fans-feed>
      <div className={cn(s.band, s.tAqua)}>
        <span className={cn(s.tile, s.tileAqua, s.tileLg)}>
          <builders.Icon strokeWidth={1.5} />
        </span>
        <span className={s.bandText}>
          <span className={s.bandName}>{builders.name}</span>
          <span className={cn(s.bandMeta, 'tabular')}>
            {builders.members} members <span className={s.trend}>{builders.trend}</span>
          </span>
        </span>
        <span className={s.joined}>
          <Check strokeWidth={2} />
          Joined
        </span>
      </div>

      <div className={s.tabs}>
        <span className={cn(s.tab, s.tabOn)}>Ideas</span>
        <span className={s.tab}>Projects</span>
        <span className={s.tab}>Discussions</span>
      </div>

      <article className={s.idea}>
        <div className={s.ideaTop}>
          <Avatar initials="AM" tint="peach" className={s.avatarSm} />
          <span className={s.ideaWho}>
            <span className={s.ideaName}>{fan.name}</span>
            <span className={s.ideaWhen}>2h</span>
          </span>
          <span className={s.typeChip}>Idea</span>
        </div>
        <p className={s.ideaTitle}>Gym-log app for creators</p>
        <p className={s.ideaBody}>
          Log a set in three taps and share a weekly card with your followers. Three devs in, need a
          designer.
        </p>
        <div className={s.signals}>
          <span className={cn(s.signal, s.signalUse)} data-fans-signal>
            <ThumbsUp strokeWidth={1.75} />
            I’d use this
            <span className={cn(s.signalCount, 'tabular')}>
              <span className={s.countBefore}>40</span>
              <span className={s.countAfter}>41</span>
            </span>
          </span>
          <span className={s.signal}>
            <Hammer strokeWidth={1.75} />
            I’d help build
            <span className={cn(s.signalCount, 'tabular')}>12</span>
          </span>
        </div>
        <p className={s.comments}>
          <MessageCircle strokeWidth={1.5} />
          <span className="tabular">9</span> comments
        </p>
      </article>

      <article className={cn(s.idea, s.ideaNext)}>
        <div className={s.ideaTop}>
          <Avatar initials="KM" tint="aqua" className={s.avatarSm} />
          <span className={s.ideaWho}>
            <span className={s.ideaName}>Kofi Mensah</span>
            <span className={s.ideaWhen}>5h</span>
          </span>
          <span className={s.typeChip}>Idea</span>
        </div>
        <p className={s.ideaTitle}>Saturday code club for kids</p>
        <p className={s.ideaBody}>
          Builders teach kids to ship a small game in six weekends. Looking for two mentors.
        </p>
        <div className={s.signals}>
          <span className={s.signal}>
            <ThumbsUp strokeWidth={1.75} />
            I’d use this
            <span className={cn(s.signalCount, 'tabular')}>18</span>
          </span>
          <span className={s.signal}>
            <Hammer strokeWidth={1.75} />
            I’d help build
            <span className={cn(s.signalCount, 'tabular')}>7</span>
          </span>
        </div>
      </article>

      <span className={s.fab}>
        <Plus strokeWidth={2} />
        New post
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* 4. Project (post detail)                                                                        */
/* ---------------------------------------------------------------------------------------------- */

export function ProjectScreen() {
  const designers = community('designers');
  return (
    <div className={s.project}>
      <div className={s.projectTop}>
        <span className={s.back}>
          <ChevronLeft strokeWidth={1.75} />
          Builders
        </span>
        <span className={s.statusPill}>Forming team</span>
      </div>

      <p className={s.projectTitle}>Gym-log app for creators</p>
      <p className={s.projectBy}>
        <Avatar initials="AM" tint="peach" className={s.avatarXs} />
        {fan.name} · Builders
      </p>
      <p className={s.projectBody}>Log a set in three taps. Every Sunday, share your week.</p>

      <div className={s.rowHead}>
        <p className={s.label}>Roles needed</p>
        <p className={cn(s.rowMeta, 'tabular')}>1 open</p>
      </div>

      <div className={s.role}>
        <div className={s.roleTop}>
          <span className={cn(s.tile, s.tileSm, s.tileLavender)}>
            <designers.Icon strokeWidth={1.5} />
          </span>
          <span className={s.roleName}>Designer</span>
          <span className={s.openPill}>Open</span>
        </div>
        <p className={s.roleNeed}>Logo, onboarding screens and the weekly share card.</p>
        <span className={cn(s.primary, s.roleJoin)}>Join as Designer</span>
      </div>

      <div className={cn(s.role, s.roleFilled)}>
        <div className={s.roleTop}>
          <span className={cn(s.tile, s.tileSm, s.tileAqua)}>
            <Server strokeWidth={1.5} />
          </span>
          <span className={s.roleName}>Backend</span>
          <span className={s.filledBy}>
            <Avatar initials="KM" tint="aqua" className={s.avatarXs} />
            Filled
          </span>
        </div>
      </div>

      <div className={s.team}>
        <span className={s.stack}>
          <Avatar initials="AM" tint="peach" className={s.avatarSm} />
          <Avatar initials="KM" tint="aqua" className={s.avatarSm} />
          <Avatar initials="PS" tint="lavender" className={s.avatarSm} />
        </span>
        <span className={s.teamText}>
          <span className={s.teamName}>Team of 3</span>
          <span className={s.teamMeta}>Arjun, Kofi and Priya</span>
        </span>
      </div>

      <div className={s.rowHead}>
        <p className={s.label}>Comments</p>
        <p className={cn(s.rowMeta, 'tabular')}>9</p>
      </div>
      <div className={s.comment}>
        <Avatar initials="SI" tint="lavender" className={s.avatarSm} />
        <p className={s.commentText}>
          <span className={s.commentName}>Sana Iqbal</span> I’d test it at my gym every Sunday.
        </p>
      </div>
    </div>
  );
}
