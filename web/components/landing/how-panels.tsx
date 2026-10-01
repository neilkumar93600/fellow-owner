import type { CommunityIcon, Tint } from '@fellow-owners/shared';
import {
  Check,
  CircleCheck,
  Code2,
  Dumbbell,
  Leaf,
  Link2,
  type LucideIcon,
  PenTool,
  Sparkles,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from './how.module.css';
import { HowCopyLink } from './how-copy';
import {
  BIO,
  CLICK_DAYS,
  CLICKS,
  DRAFT,
  formatCount,
  HOST,
  JOIN_CODE,
  JOIN_TILES,
  PITCH,
  TASTE,
} from './how-data';

/*
 * The three mini UIs of "How it works". Server-rendered in their finished state (every digit typed,
 * the fit filled, the clicks counted), so they read complete without JavaScript and under reduced
 * motion. how-rail.tsx rewinds and replays them through the data-how-* hooks.
 *
 * Each visual is aria-hidden; its figcaption (sr-only) says what it shows.
 */

const ICONS: Partial<Record<CommunityIcon, LucideIcon>> = {
  'code-2': Code2,
  dumbbell: Dumbbell,
  'pen-tool': PenTool,
  leaf: Leaf,
};

const TINT_CLASS: Record<Tint, string> = {
  aqua: styles.tintAqua!,
  lavender: styles.tintLavender!,
  peach: styles.tintPeach!,
  lime: styles.tintLime!,
  white: styles.tintWhite!,
};

function DemoChip({ className }: { className?: string }) {
  return <span className={cn(styles.demoChip, className)}>Demo</span>;
}

/* ---------- 01 Share your link ---------- */

export function ShareVisual() {
  return (
    <div className={styles.shareGrid}>
      <div className={styles.linkBlock}>
        <p className={styles.linkLabel}>Your bio link</p>
        <HowCopyLink host={HOST} path={BIO.path} />
        <p className={styles.linkNote}>
          Opens inside the Instagram, TikTok and YouTube in-app browsers. Nothing to install.
        </p>
      </div>

      <figure className={styles.bioFigure} data-how-watch>
        <figcaption className="sr-only">
          Demo: Mira’s bio page. A fan picks Builders and Fitness Crew, then types the 6-digit code
          from their email to join.
        </figcaption>
        <div className={styles.bio} aria-hidden="true">
          <div className={styles.bioHead}>
            <span className={styles.bioAvatar}>{BIO.initials}</span>
            <span className={styles.bioWho}>
              <span className={styles.bioName}>{BIO.name}</span>
              <span className={styles.bioHandle}>
                @{BIO.handle} · {BIO.followers} followers
              </span>
            </span>
            <DemoChip className={styles.bioDemo} />
          </div>

          <div className={styles.platforms}>
            {BIO.platforms.map((p) => (
              <span key={p.platform} className={styles.platform}>
                {p.platform} <span className="tabular">{p.followers}</span>
              </span>
            ))}
          </div>

          <p className={styles.bioLabel}>Join a community</p>
          <div className={styles.tiles}>
            {JOIN_TILES.map(({ community, picked }) => {
              const Icon = ICONS[community.icon] ?? Users;
              return (
                <span
                  key={community.slug}
                  className={cn(styles.tile, TINT_CLASS[community.tint])}
                  data-how-tile={picked ? 'pick' : undefined}
                  data-on={picked ? '' : undefined}
                >
                  <span className={styles.tileIcon}>
                    <Icon strokeWidth={1.5} />
                    {picked ? (
                      <span className={styles.tileCheck}>
                        <Check strokeWidth={2.25} />
                      </span>
                    ) : null}
                  </span>
                  <span className={styles.tileText}>
                    <span className={styles.tileName}>{community.name}</span>
                    <span className={cn(styles.tileMeta, 'tabular')}>
                      {community.members} members
                    </span>
                  </span>
                </span>
              );
            })}
          </div>

          <p className={styles.bioLabel}>Enter the code from your email</p>
          <div className={styles.code} data-how-code data-on="">
            {JOIN_CODE.split('').map((digit, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed six-digit code, never reordered.
              <span key={index} className={styles.codeBox}>
                <span className={cn(styles.codeDigit, 'tabular')} data-how-digit data-on="">
                  {digit}
                </span>
              </span>
            ))}
            <span className={styles.codeOk} data-how-verified data-on="">
              <CircleCheck strokeWidth={1.5} />
            </span>
          </div>
        </div>
      </figure>
    </div>
  );
}

/* ---------- 02 Your AI briefs you ---------- */

export function BriefVisual() {
  return (
    <figure className={styles.brief} data-how-watch>
      <figcaption className="sr-only">
        Demo: Mira’s taste profile says she promotes fitness tools she would use herself and never
        promotes crypto or gambling. Arjun’s gym-log app scores 88 out of 100 against it, is marked
        as an AI pick, and shows the reason: {PITCH.reason}
      </figcaption>
      <div className={styles.briefStack} aria-hidden="true">
        <div className={styles.taste}>
          <div className={styles.cardHead}>
            <span className={styles.cardTitle}>Taste profile</span>
            <DemoChip className={styles.pushEnd} />
          </div>
          <dl className={styles.tasteList}>
            <div className={styles.tasteRow}>
              <dt>I promote</dt>
              <dd>
                <span className={styles.mark}>
                  <span className={styles.markBg} data-how-mark />
                  {TASTE.promote}
                </span>
              </dd>
            </div>
            <div className={styles.tasteRow}>
              <dt>I never promote</dt>
              <dd>{TASTE.never}</dd>
            </div>
          </dl>
        </div>

        <span className={styles.wire} data-how-wire />

        <div className={styles.pitch}>
          <div className={styles.pitchHead}>
            <span className={cn(styles.initials, styles.tintAquaTile)}>{PITCH.initials}</span>
            <span className={styles.pitchWho}>
              <span className={styles.pitchTitle}>{PITCH.title}</span>
              <span className={styles.pitchMeta}>
                {PITCH.from} · {PITCH.meta}
              </span>
            </span>
          </div>
          <div className={styles.pitchPills}>
            <span className={styles.fitPill}>
              <span className={cn(styles.fitNum, 'tabular')} data-how-fit>
                {PITCH.fit}
              </span>
              <span className={styles.fitTrack}>
                <span className={styles.fitBar} data-how-fitbar />
              </span>
            </span>
            <span className={styles.aiChip} data-how-late>
              <Sparkles strokeWidth={1.5} />
              AI pick
            </span>
          </div>
          <p className={styles.reason} data-how-late>
            <span className={styles.reasonLabel}>Why: </span>
            {PITCH.reason}
          </p>
        </div>
      </div>
    </figure>
  );
}

/* ---------- 03 Back what they build ---------- */

export function DraftCard() {
  return (
    <figure className={styles.draftFigure}>
      <figcaption className="sr-only">
        Demo: a draft for {DRAFT.platform} written in Mira’s voice, {DRAFT.count} of {DRAFT.limit}{' '}
        characters, with a short link. The showcase page is live.
      </figcaption>
      <div className={styles.draft} aria-hidden="true">
        <div className={styles.cardHead}>
          <span className={styles.cardTitle}>Draft for {DRAFT.platform}</span>
          <span className={styles.voice}>In your voice</span>
          <DemoChip className={styles.pushEnd} />
        </div>
        <p className={styles.draftText}>
          {DRAFT.text} <span className={styles.draftLink}>{DRAFT.link}</span>{' '}
          <span className={styles.draftTags}>{DRAFT.hashtags}</span>
          <span className={styles.caret} />
        </p>
        <div className={styles.draftFoot}>
          <span className={styles.livePill}>Live</span>
          <span className={styles.footText}>Showcase page</span>
          <span className={cn(styles.footCount, 'tabular')}>
            {DRAFT.count}/{DRAFT.limit}
          </span>
        </div>
      </div>
    </figure>
  );
}

export function ClicksDisc() {
  const max = Math.max(...CLICK_DAYS);
  return (
    <figure className={styles.disc} data-how-watch>
      <figcaption className="sr-only">
        Demo: the short link {DRAFT.link} counted {formatCount(CLICKS)} clicks in the last 7 days.
      </figcaption>
      <div className={styles.discInner} aria-hidden="true">
        <span className={cn(styles.shortLink, 'tabular')}>
          <Link2 strokeWidth={1.5} />
          {DRAFT.link.replace(`${HOST}/`, '/')}
        </span>
        <span className={cn(styles.count, 'tabular')} data-how-count>
          {formatCount(CLICKS)}
        </span>
        <span className={styles.countLabel}>clicks in 7 days</span>
        <span className={styles.bars}>
          {CLICK_DAYS.map((value, index) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: a fixed week of bars, never reordered.
              key={index}
              className={styles.bar}
              style={{ height: `${Math.round((value / max) * 100)}%` }}
              data-how-bar
            />
          ))}
        </span>
      </div>
    </figure>
  );
}
