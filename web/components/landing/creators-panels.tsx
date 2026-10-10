import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Heart,
  MessageCircle,
  RotateCw,
  Search,
  Sparkles,
  Star,
  TrendingUp,
} from 'lucide-react';
import type * as React from 'react';
import { CreatorImage } from '@/components/shared/creator-image';
import { MatchLabel } from '@/components/shared/match-label';
import { cn } from '@/lib/utils';
import layout from './creators.module.css';
import {
  CLICKS_BY_DAY,
  CLICKS_TODAY,
  CREDITS,
  DRAFT,
  FAN_MAIL_ROWS,
  FAN_MAIL_TABS,
  type FanMailRow,
  FILTERED_COUNT,
  NEXT_CARD,
  PLATFORM_TABS,
  PREVIEW,
  SHOWCASE_PAGE,
  TODAY_CARD,
  TODAY_PULSE,
} from './creators-data';
import { CreatorsClicks } from './creators-motion';
import styles from './creators-panels.module.css';
import { avatarTint, creator, initials, promoteDraft } from './demo-data';

/*
 * Three real screens from the creator studio, rebuilt in HTML in the Golden Hour Frost look: the decision-card
 * Today, the fan mail as cards, and the Spotlight composer. They are pictures of the product: nothing inside
 * is focusable, and every value is demo data. Match is always a label, never a number.
 */

const ICON = { strokeWidth: 1.5, 'aria-hidden': true } as const;

/* ---------- Atoms ---------- */

function Avatar({ name, size = 'md' }: { name: string; size?: 'md' | 'lg' }) {
  return (
    <span
      className={cn(styles.avatar, size === 'lg' && styles.avatarLg)}
      style={{ backgroundColor: avatarTint(name) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

/** Mira's round photo, for the header tray. */
function MiraFace() {
  return (
    <span className={styles.miraFace} aria-hidden="true">
      <CreatorImage name="mira-portrait" alt="" fill sizes="32px" />
    </span>
  );
}

/** Fake button: looks like the app's control, is not a control (the panel is a picture). */
function Fake({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={className}>{children}</span>;
}

/** The app's top strip, cropped: the title, a line under it, and the Demo tray. */
function ScreenHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className={layout.screenHead}>
      <div className={layout.screenTitles}>
        <p className={layout.screenTitle}>{title}</p>
        <p className={layout.screenSub}>{subtitle}</p>
      </div>
      <div className={layout.tray}>
        <span className={layout.demoTag}>Demo</span>
        <MiraFace />
      </div>
    </div>
  );
}

/* ---------- (a) Today: the decision card ---------- */

export function TodayScreen() {
  return (
    <div className={layout.screen}>
      <ScreenHeader
        title={`Good morning, ${creator.firstName}`}
        subtitle="5 things need you · about 6 min"
      />

      <div className={styles.today}>
        <div className={styles.stack}>
          <div className={styles.peek} aria-hidden="true">
            <span className={styles.peekName}>{NEXT_CARD.name}</span>
          </div>
          <article className={styles.decision} data-depth={5}>
            <div className={styles.decisionTop}>
              <span className={styles.facePhoto} aria-hidden="true">
                <CreatorImage name={TODAY_CARD.photo} alt="" fill sizes="48px" />
              </span>
              <span className={styles.who}>
                <span className={styles.whoName}>{TODAY_CARD.name}</span>
                <span className={styles.whoMeta}>{TODAY_CARD.context}</span>
              </span>
              <span data-depth={8}>
                <MatchLabel score={TODAY_CARD.score} />
              </span>
            </div>
            <p className={styles.quote}>{TODAY_CARD.quote}</p>
            <p className={styles.why}>
              <Sparkles size={14} {...ICON} />
              <span>
                Why: <em>{TODAY_CARD.reason}</em>
              </span>
            </p>
            <div className={styles.actions}>
              <Fake className={styles.btnPrimary}>Feature</Fake>
              <Fake className={styles.btnGlass}>
                <Sparkles size={15} {...ICON} />
                Reply in my voice
              </Fake>
              <Fake className={styles.btnGlass}>
                <Heart size={15} {...ICON} />
                Love
              </Fake>
              <Fake className={styles.btnGhost}>Later</Fake>
            </div>
          </article>
        </div>

        <div className={styles.side}>
          <p className={styles.pulse} data-depth={4}>
            <TrendingUp size={16} {...ICON} />
            {TODAY_PULSE}
          </p>
          <div className={styles.thanks} data-depth={6}>
            <p className={styles.thanksLabel}>Fans to thank</p>
            <span className={styles.thanksRow}>
              <Avatar name="Sana Iqbal" />
              <span className={styles.thanksText}>
                <span className={styles.whoName}>Sana Iqbal</span>
                <span className={styles.whoMeta}>Rising in Solo Travelers</span>
              </span>
              <Fake className={styles.btnMini}>
                <Star size={13} {...ICON} />
                Spotlight
              </Fake>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- (b) Fan mail ---------- */

function MailCard({ row, hover }: { row: FanMailRow; hover?: boolean }) {
  return (
    <li className={cn(styles.mail, hover && styles.mailHover)}>
      <Avatar name={row.from} size="lg" />
      <span className={styles.mailBody}>
        <span className={styles.mailTop}>
          <span className={styles.whoName}>{row.from}</span>
          <span className={styles.typePill}>{row.type}</span>
        </span>
        <span className={styles.mailQuote}>{row.quote}</span>
        <span className={styles.mailWhy}>Why: {row.reason}</span>
      </span>
      <MatchLabel score={row.score} className={styles.mailMatch} />
    </li>
  );
}

export function FanMailScreen() {
  return (
    <div className={layout.screen}>
      <ScreenHeader
        title="Fan mail"
        subtitle="The best of your DMs, with why each one stood out."
      />

      <div className={styles.tabBar}>
        {FAN_MAIL_TABS.map((tab) => (
          <span
            key={tab.label}
            className={cn(
              styles.tab,
              'active' in tab && styles.tabActive,
              'wideOnly' in tab && styles.tabWide,
            )}
          >
            {tab.label}
          </span>
        ))}
        <span className={cn(styles.tab, styles.tabFiltered)} data-depth={6}>
          Filtered
          <span className={cn(styles.tabCount, 'tabular')}>{FILTERED_COUNT}</span>
        </span>
      </div>

      <div className={styles.toolbar}>
        <p className={styles.toolbarText}>
          <span className="tabular">10</span> messages worth a look
        </p>
        <Fake className={styles.searchSquare}>
          <Search size={17} {...ICON} />
          <span className="sr-only">Search</span>
        </Fake>
      </div>

      <ul className={styles.mailList} aria-label="Demo fan mail, best matches first">
        {FAN_MAIL_ROWS.map((row, index) => (
          <MailCard key={row.id} row={row} hover={index === 0} />
        ))}
      </ul>
    </div>
  );
}

/* ---------- (c) Spotlight composer ---------- */

export function SpotlightScreen() {
  const maxDay = Math.max(...CLICKS_BY_DAY);
  return (
    <div className={layout.screen}>
      <ScreenHeader title="Spotlight" subtitle={`${PREVIEW.title}, by Priya`} />

      <div className={styles.composer}>
        <div className={styles.compose}>
          <div className={cn(styles.tabBar, styles.tabBarTight)}>
            {PLATFORM_TABS.map((platform, index) => (
              <span key={platform} className={cn(styles.tab, index === 0 && styles.tabActive)}>
                {platform}
              </span>
            ))}
          </div>

          <div className={styles.draft}>
            <div className={styles.draftTop}>
              <p className={styles.draftTitle}>Draft for Instagram</p>
              <p className={styles.draftVoice}>
                <Sparkles size={13} {...ICON} />
                In my voice
              </p>
            </div>
            <div className={styles.draftField}>
              <p>
                {DRAFT.text} <span className={styles.draftLink}>{DRAFT.link}</span>
              </p>
              <p className={styles.draftTags}>
                {DRAFT.hashtags}
                <span className={styles.caret} aria-hidden="true" />
              </p>
            </div>
            <div className={styles.draftFoot}>
              <span className={styles.saved}>
                <Check size={14} {...ICON} />
                Saved
              </span>
              <span className={cn(styles.charCount, 'tabular')}>
                {DRAFT.count}/{DRAFT.limit}
                <span className="sr-only"> characters</span>
              </span>
            </div>
          </div>

          <div className={styles.showcaseRow} data-depth={5}>
            <span className={styles.showcaseTile}>
              <Globe size={18} {...ICON} />
            </span>
            <span className={styles.showcaseBody}>
              <span className={styles.showcaseTitle}>Made it page</span>
              <span className={styles.showcasePath}>{SHOWCASE_PAGE.path}</span>
            </span>
            <span className={styles.livePill}>{SHOWCASE_PAGE.status}</span>
          </div>
        </div>

        <div className={styles.order}>
          <div className={styles.preview} data-depth={6}>
            <span className={styles.previewThumb}>
              <CreatorImage name="vlog-lisbon" alt="" fill sizes="96px" />
            </span>
            <span className={styles.previewBody}>
              <span className={styles.previewTitle}>{PREVIEW.title}</span>
              <span className={styles.previewMeta}>{PREVIEW.meta}</span>
            </span>
          </div>

          <div className={styles.credits}>
            <p className={styles.orderLabel}>Made by</p>
            <ul className={styles.creditList}>
              {CREDITS.map((credit) => (
                <li key={credit.role} className={styles.credit}>
                  <Avatar name={credit.name} />
                  <span className={styles.creditText}>
                    <span className={styles.creditName}>{credit.name}</span>
                    <span className={styles.creditRole}>{credit.role}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.linkField}>
            <span className={cn(styles.linkText, 'tabular')}>{promoteDraft.shortLink}</span>
            <Fake className={styles.btnGhostSm}>
              <Copy size={16} {...ICON} />
              <span className="sr-only">Copy link</span>
            </Fake>
          </div>

          <div className={styles.clicks}>
            <span className={styles.clicksText}>
              <span className={styles.orderLabel}>Clicks</span>
              <CreatorsClicks value={promoteDraft.clicks} className={styles.clicksValue} />
              <span className={styles.clicksTrend}>
                <TrendingUp size={14} {...ICON} />
                <span className="tabular">+{CLICKS_TODAY} today</span>
              </span>
            </span>
            <span className={styles.bars} aria-hidden="true">
              {CLICKS_BY_DAY.map((day, index) => (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed seven-day series
                  key={index}
                  className={cn(styles.bar, index === CLICKS_BY_DAY.length - 1 && styles.barToday)}
                  style={{ transform: `scaleY(${day / maxDay})` }}
                />
              ))}
            </span>
          </div>

          <Fake className={styles.btnPrimaryWide}>Publish</Fake>
          <span className={styles.orderRow}>
            <Fake className={styles.btnGlass}>
              <RotateCw size={15} {...ICON} />
              Redraft
            </Fake>
            <Fake className={styles.btnGlass}>
              <ExternalLink size={15} {...ICON} />
              Open in Instagram
            </Fake>
            <Fake className={styles.btnGlass}>
              <MessageCircle size={15} {...ICON} />
              Tell the crew
            </Fake>
          </span>
        </div>
      </div>
    </div>
  );
}
