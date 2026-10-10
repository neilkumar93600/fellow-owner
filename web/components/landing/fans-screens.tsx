import {
  Backpack,
  Camera,
  Car,
  Check,
  ChevronLeft,
  Ellipsis,
  Film,
  Heart,
  type LucideIcon,
  MessageCircle,
  Sparkles,
  Sunrise,
  ThumbsUp,
  UserPlus,
  Utensils,
  Wallet,
  X,
} from 'lucide-react';
import type * as React from 'react';
import { CreatorImage } from '@/components/shared/creator-image';
import type { CreatorAsset } from '@/lib/creator-assets';
import { cn } from '@/lib/utils';
import { communities, creator, DEMO, fan } from './demo-data';
import { DIGEST, FAN_INTRO, FAN_PICKS, type FanStep } from './fans-data';
import s from './fans-screens.module.css';

/*
 * The four fan screens inside the phone, built from the fan-page spec (creator pivot §8): the Join card
 * under a small bio header (the AI's room picks, each with its reason), the community feed with "Loved by
 * Mira", an idea's open spots, and the AI's weekly community digest. Every size is in em so the whole screen scales with the phone (the frame sets font-size).
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
  wallet: Wallet,
  backpack: Backpack,
  camera: Camera,
  utensils: Utensils,
  car: Car,
  sunrise: Sunrise,
};

function room(slug: string) {
  const found = communities.find((c) => c.slug === slug);
  if (!found) throw new Error(`Unknown demo community: ${slug}`);
  return { ...found, Icon: ICONS[found.icon] ?? Wallet, cardTint: found.tint as CardTint };
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

/** Mira or a fan as a round photo (the generated faces), in the same box as Avatar. */
function Face({ name, className }: { name: CreatorAsset; className?: string }) {
  return (
    <span className={cn(s.avatar, s.face, className)}>
      <CreatorImage name={name} alt="" fill sizes="64px" />
    </span>
  );
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
/* 1. Bio link, then Join: the AI picks rooms and says why                                          */
/* ---------------------------------------------------------------------------------------------- */

export function JoinScreen() {
  return (
    <div className={s.join} data-fans-join>
      <div className={s.miniHead}>
        <Face name="mira-portrait" className={s.miniAvatar} />
        <span className={s.miniText}>
          <span className={s.miniName}>{creator.name}</span>
          <span className={s.miniMeta}>
            @{creator.handle} · <span className="tabular">{creator.followers}</span> followers
          </span>
        </span>
      </div>

      <div className={s.joinCard}>
        <p className={s.joinTitle}>Tell us about you</p>

        <p className={s.fieldLabel}>Your intro</p>
        <div className={s.textarea}>
          <span data-fans-typed>{FAN_INTRO}</span>
          <span className={s.caret} />
          <span className={cn(s.count, 'tabular')}>
            <span data-fans-count>{FAN_INTRO.length}</span>/140
          </span>
        </div>

        <p className={cn(s.fieldLabel, s.fieldRow)}>
          Rooms picked for you
          <span className={s.aiTag}>
            <Sparkles strokeWidth={1.75} />
            AI
          </span>
        </p>
        <ul className={s.picks}>
          {FAN_PICKS.map(({ slug, why }) => {
            const c = room(slug);
            return (
              <li key={slug} className={cn(s.pick, TINT_CLASS[c.cardTint], s.pickOn)}>
                <span className={cn(s.tile, s.tileSm)}>
                  <c.Icon strokeWidth={1.5} />
                </span>
                <span className={s.pickText}>
                  <span className={s.pickName}>{c.name}</span>
                  <span className={s.pickWhy}>{why}</span>
                </span>
                <span className={s.check}>
                  <Check strokeWidth={2.25} />
                </span>
              </li>
            );
          })}
        </ul>

        <span className={cn(s.primary, s.confirm)}>Confirm</span>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* 3. Community feed                                                                               */
/* ---------------------------------------------------------------------------------------------- */

export function FeedScreen() {
  const budget = room('budget-travel');
  return (
    <div className={s.feed} data-fans-feed>
      <div className={cn(s.band, s.tPeach)}>
        <span className={cn(s.tile, s.tileLg)}>
          <budget.Icon strokeWidth={1.5} />
        </span>
        <span className={s.bandText}>
          <span className={s.bandName}>{budget.name}</span>
          <span className={cn(s.bandMeta, 'tabular')}>
            {budget.members} fans <span className={s.trend}>{budget.trend}</span>
          </span>
        </span>
        <span className={s.joined}>
          <Check strokeWidth={2} />
          Joined
        </span>
      </div>

      <div className={s.tabs}>
        <span className={cn(s.tab, s.tabOn)}>Ideas</span>
        <span className={s.tab}>Collabs</span>
        <span className={s.tab}>Chat</span>
      </div>

      <article className={s.idea}>
        <div className={s.ideaTop}>
          <Face name="fan-1" className={s.avatarSm} />
          <span className={s.ideaWho}>
            <span className={s.ideaName}>{fan.name}</span>
            <span className={s.ideaWhen}>2h</span>
          </span>
          <span className={cn(s.typeChip, s.lovedChip)}>
            <Heart strokeWidth={2} fill="currentColor" />
            Loved by Mira
          </span>
        </div>
        <p className={s.ideaTitle}>Lisbon on $60 a day</p>
        <p className={s.ideaBody}>
          Walking routes, a $9 lunch map and a one-week plan. A local guide and a photographer are
          in. Looking for an editor.
        </p>
        <div className={s.signals}>
          <span className={cn(s.signal, s.signalUse)} data-fans-signal>
            <ThumbsUp strokeWidth={1.75} />
            I’d use this
            <span className={cn(s.signalCount, 'tabular')}>
              <span className={s.countBefore}>{DEMO.idea.use - 1}</span>
              <span className={s.countAfter}>{DEMO.idea.use}</span>
            </span>
          </span>
          <span className={s.signal}>
            <UserPlus strokeWidth={1.75} />
            Count me in
            <span className={cn(s.signalCount, 'tabular')}>{DEMO.idea.build}</span>
          </span>
        </div>
        <p className={s.comments}>
          <MessageCircle strokeWidth={1.5} />
          <span className="tabular">9</span> comments
        </p>
      </article>

      <article className={cn(s.idea, s.ideaNext)}>
        <div className={s.ideaTop}>
          <Avatar initials="YS" tint="aqua" className={s.avatarSm} />
          <span className={s.ideaWho}>
            <span className={s.ideaName}>Yuki Sato</span>
            <span className={s.ideaWhen}>5h</span>
          </span>
          <span className={s.typeChip}>Idea</span>
        </div>
        <p className={s.ideaTitle}>Tokyo cafés under $5</p>
        <p className={s.ideaBody}>
          Thirty cafés where a coffee costs less than five dollars. Need a photographer and a
          translator.
        </p>
        <div className={s.signals}>
          <span className={s.signal}>
            <ThumbsUp strokeWidth={1.75} />
            I’d use this
            <span className={cn(s.signalCount, 'tabular')}>18</span>
          </span>
          <span className={s.signal}>
            <UserPlus strokeWidth={1.75} />
            Count me in
            <span className={cn(s.signalCount, 'tabular')}>7</span>
          </span>
        </div>
      </article>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* 4. An idea's crew                                                                               */
/* ---------------------------------------------------------------------------------------------- */

export function ProjectScreen() {
  return (
    <div className={s.project}>
      <div className={s.projectTop}>
        <span className={s.back}>
          <ChevronLeft strokeWidth={1.75} />
          Budget Travel
        </span>
        <span className={s.statusPill}>Finding a crew</span>
      </div>

      <p className={s.projectTitle}>Lisbon on $60 a day</p>
      <p className={s.projectBy}>
        <Face name="fan-1" className={s.avatarXs} />
        {fan.name} · Budget Travel
      </p>
      <p className={s.projectBody}>
        A week in Lisbon, every day under $60. Made by fans, for fans.
      </p>

      <div className={s.rowHead}>
        <p className={s.label}>Open spots</p>
        <p className={cn(s.rowMeta, 'tabular')}>1 open</p>
      </div>

      <div className={s.role}>
        <div className={s.roleTop}>
          <span className={cn(s.tile, s.tileSm, s.tileLavender)}>
            <Film strokeWidth={1.5} />
          </span>
          <span className={s.roleName}>Video editor</span>
          <span className={s.openPill}>Open</span>
        </div>
        <p className={s.roleNeed}>Cut a 6-minute guide from the clips the crew has shot.</p>
        <span className={cn(s.primary, s.roleJoin)}>Join as Video editor</span>
      </div>

      <div className={cn(s.role, s.roleFilled)}>
        <div className={s.roleTop}>
          <span className={cn(s.tile, s.tileSm, s.tileAqua)}>
            <Camera strokeWidth={1.5} />
          </span>
          <span className={s.roleName}>Photographer</span>
          <span className={s.filledBy}>
            <Avatar initials="MC" tint="aqua" className={s.avatarXs} />
            Filled
          </span>
        </div>
      </div>

      <div className={s.team}>
        <span className={s.stack}>
          <Face name="fan-1" className={s.avatarSm} />
          <Avatar initials="ID" tint="peach" className={s.avatarSm} />
          <Avatar initials="MC" tint="aqua" className={s.avatarSm} />
        </span>
        <span className={s.teamText}>
          <span className={s.teamName}>
            {DEMO.crew.length - 1} of {DEMO.crew.length} roles filled
          </span>
          <span className={s.teamMeta}>Priya, Inês and Maya</span>
        </span>
      </div>

      <div className={s.rowHead}>
        <p className={s.label}>Comments</p>
        <p className={cn(s.rowMeta, 'tabular')}>9</p>
      </div>
      <div className={s.comment}>
        <Avatar initials="SI" tint="lavender" className={s.avatarSm} />
        <p className={s.commentText}>
          <span className={s.commentName}>Sana Iqbal</span> I’m booking Lisbon with this next month.
        </p>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- */
/* 4. The AI's weekly digest of a room                                                              */
/* ---------------------------------------------------------------------------------------------- */

export function DigestScreen() {
  const budget = room('budget-travel');
  return (
    <div className={s.digest}>
      <div className={cn(s.band, s.tPeach)}>
        <span className={cn(s.tile, s.tileLg)}>
          <budget.Icon strokeWidth={1.5} />
        </span>
        <span className={s.bandText}>
          <span className={s.bandName}>{budget.name}</span>
          <span className={cn(s.bandMeta, 'tabular')}>
            {budget.members} fans <span className={s.trend}>{budget.trend}</span>
          </span>
        </span>
        <span className={s.joined}>
          <Check strokeWidth={2} />
          Joined
        </span>
      </div>

      <div className={s.digestCard}>
        <div className={s.digestTop}>
          <span className={s.aiTag}>
            <Sparkles strokeWidth={1.75} />
            AI summary
          </span>
          <p className={s.digestTitle}>
            This week in {budget.name}
            <span className={s.digestStat}>
              <span className="tabular">{DIGEST.ideas}</span> ideas
            </span>
          </p>
        </div>
        <p className={s.digestText}>{DIGEST.summary}</p>
        <ul className={s.themes}>
          {DIGEST.themes.map((theme) => (
            <li key={theme} className={s.theme}>
              {theme}
            </li>
          ))}
        </ul>
      </div>

      <div className={s.rowHead}>
        <p className={s.label}>Top 3 ideas</p>
        <p className={s.rowMeta}>I’d use this</p>
      </div>
      <ol className={s.standouts}>
        {DIGEST.top.map((idea, index) => (
          <li key={idea.title} className={s.standout}>
            <span className={cn(s.rank, 'tabular')}>{index + 1}</span>
            <span className={s.standoutText}>
              <span className={s.standoutTitle}>{idea.title}</span>
              <span className={s.standoutWhy}>{idea.why}</span>
            </span>
            <span className={cn(s.standoutCount, 'tabular')}>
              <ThumbsUp strokeWidth={1.75} />
              {idea.use}
            </span>
          </li>
        ))}
      </ol>
      <p className={s.digestNote}>Demo summary. The numbers are made up.</p>
    </div>
  );
}
