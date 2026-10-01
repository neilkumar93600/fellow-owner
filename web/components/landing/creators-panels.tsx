import {
  Check,
  ChevronDown,
  Code2,
  Copy,
  ExternalLink,
  Globe,
  Handshake,
  Lightbulb,
  RotateCw,
  Search,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  TrendingUp,
  Users,
} from 'lucide-react';
import type * as React from 'react';
import { cn } from '@/lib/utils';
import styles from './creators.module.css';
import {
  avatarTint,
  CLICKS_BY_DAY,
  CLICKS_TODAY,
  DRAFT,
  FILTERED_COUNT,
  formatNumber,
  INBOX_ROWS,
  INBOX_TABS,
  type InboxRow,
  initials,
  OPEN_PITCHES,
  PLATFORM_TABS,
  PREVIEW,
  SHOWCASE_PAGE,
} from './creators-data';
import { CreatorsClicks } from './creators-motion';
import { briefing, creator, promoteDraft, stats } from './demo-data';

/*
 * Three real screens from the creator dashboard, rebuilt in HTML with the reference look (04 §5).
 * They are pictures of the product: nothing inside is focusable, and every value is demo data.
 */

const ICON = { strokeWidth: 1.5, 'aria-hidden': true } as const;

/* ---------- Atoms ---------- */

function AiChip() {
  return (
    <span className={styles.aiChip}>
      <Sparkles size={13} {...ICON} />
      AI pick
    </span>
  );
}

/** Fit pill (04 §5): number plus a tiny bar, banded 0-39 / 40-69 / 70-100. */
function FitPill({ fit }: { fit: number }) {
  const band = fit >= 70 ? styles.fitHigh : fit >= 40 ? styles.fitMid : styles.fitLow;
  return (
    <span className={cn(styles.fit, band)}>
      <span className="sr-only">Fit </span>
      <span className="tabular">{fit}</span>
      <span className={styles.fitBar} aria-hidden="true">
        <span style={{ transform: `scaleX(${fit / 100})` }} />
      </span>
    </span>
  );
}

function Avatar({ name, size = 28 }: { name: string; size?: 28 | 32 }) {
  return (
    <span
      className={cn(styles.avatar, size === 32 && styles.avatarLg)}
      style={{ backgroundColor: avatarTint(name) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

function StatusPill({ status }: { status: InboxRow['status'] }) {
  return (
    <span className={cn(styles.status, status === 'new' ? styles.statusNew : styles.statusShort)}>
      {status === 'new' ? 'New' : 'Shortlisted'}
    </span>
  );
}

/** Fake button: looks like the app's control, is not a control (the panel is a picture). */
function Fake({ className, children }: { className?: string; children: React.ReactNode }) {
  return <span className={className}>{children}</span>;
}

/** The app header (reference "Welcome, Josiah"), cropped: title, subtitle, and a glass tray. */
function ScreenHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className={styles.screenHead}>
      <div className={styles.screenTitles}>
        <p className={styles.screenTitle}>{title}</p>
        <p className={styles.screenSub}>{subtitle}</p>
      </div>
      <div className={styles.tray}>
        <span className={styles.demoTag}>Demo</span>
        <Avatar name={creator.name} size={32} />
      </div>
    </div>
  );
}

/* ---------- (a) Today: the AI briefing ---------- */

const STAT_ICONS = [Users, Lightbulb, Handshake] as const;
const STAT_TINT = {
  peach: { card: styles.tintPeach, tile: styles.tilePeach },
  lavender: { card: styles.tintLavender, tile: styles.tileLavender },
  aqua: { card: styles.tintAqua, tile: styles.tileAqua },
} as const;

export function BriefingScreen() {
  return (
    <div className={styles.screen}>
      <ScreenHeader
        title={`Good morning, ${creator.firstName}`}
        subtitle="Here is what your AI found overnight."
      />

      <div className={styles.brief}>
        <div className={styles.briefTop}>
          <p className={styles.cardTitle}>Your AI briefing</p>
          <p className={styles.cardMeta}>
            <span className="tabular">Today, 8:02</span>
          </p>
        </div>
        <p className={styles.briefHeadline}>{briefing.headline}</p>

        <ul className={styles.highlights}>
          {briefing.highlights.map((item, index) => (
            <li key={item.title} className={styles.highlight}>
              <span className={styles.hlChip} data-depth={index === 0 ? 6 : 4}>
                <AiChip />
              </span>
              <p className={styles.hlTitle}>{item.title}</p>
              <span className={styles.hlFit} data-depth={index === 0 ? 8 : 5}>
                {item.fit !== null ? (
                  <FitPill fit={item.fit} />
                ) : (
                  <span className={styles.risingPill}>Rising</span>
                )}
              </span>
              <p className={styles.hlWhy}>{item.why}</p>
            </li>
          ))}
        </ul>

        <div className={styles.briefFoot}>
          <Fake className={styles.btnSecondary}>
            <RotateCw size={16} {...ICON} />
            Regenerate
          </Fake>
          <span className={styles.feedback}>
            <span className={styles.feedbackLabel}>Useful?</span>
            <Fake className={styles.btnGhost}>
              <ThumbsUp size={18} {...ICON} />
              <span className="sr-only">Thumbs up</span>
            </Fake>
            <Fake className={styles.btnGhost}>
              <ThumbsDown size={18} {...ICON} />
              <span className="sr-only">Thumbs down</span>
            </Fake>
          </span>
        </div>
      </div>

      <ul className={styles.stats}>
        {stats.map((stat, index) => {
          const Icon = STAT_ICONS[index] ?? Users;
          const tint = STAT_TINT[stat.tint];
          return (
            <li key={stat.label} className={cn(styles.stat, tint.card)} data-depth={4 + index * 2}>
              <span className={cn(styles.statTile, tint.tile)}>
                <Icon size={20} {...ICON} />
              </span>
              <span className={styles.statBody}>
                <span className={cn(styles.statValue, 'tabular')}>{formatNumber(stat.value)}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </span>
              <span className={styles.statTrend}>
                <TrendingUp size={14} {...ICON} />
                <span className="tabular">{stat.trend}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------- (b) Inbox ---------- */

export function InboxScreen() {
  return (
    <div className={styles.screen}>
      <ScreenHeader title="Inbox" subtitle="Every pitch, sorted by fit, with the reason." />

      <div className={styles.tabBar}>
        {INBOX_TABS.map((tab) => (
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
          <span className="tabular">{OPEN_PITCHES}</span> open pitches
        </p>
        <span className={styles.toolbarRight}>
          <Fake className={styles.searchSquare}>
            <Search size={18} {...ICON} />
            <span className="sr-only">Search</span>
          </Fake>
          <Fake className={styles.dropdown}>
            Sort: Fit
            <ChevronDown size={16} {...ICON} />
          </Fake>
        </span>
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <caption className="sr-only">Demo inbox, highest fit first</caption>
          <thead>
            <tr className={styles.headRow}>
              <th scope="col">From</th>
              <th scope="col" className={styles.colType}>
                Type
              </th>
              <th scope="col">AI summary</th>
              <th scope="col">Fit</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {INBOX_ROWS.map((row, index) => (
              <tr key={row.id} className={cn(styles.row, index === 0 && styles.rowHover)}>
                <td>
                  <span className={styles.from}>
                    <Avatar name={row.from} />
                    <span className={styles.fromName}>{row.from}</span>
                  </span>
                </td>
                <td className={styles.colType}>
                  <span className={styles.typePill}>{row.type}</span>
                </td>
                <td className={styles.summary}>{row.summary}</td>
                <td>
                  <span data-depth={index === 0 ? 6 : undefined} className={styles.depthInline}>
                    <FitPill fit={row.fit} />
                  </span>
                </td>
                <td>
                  <StatusPill status={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Narrow screens: the table collapses to cards (brief §6, Mobile). */}
        <ul className={styles.rowCards} aria-label="Demo inbox, highest fit first">
          {INBOX_ROWS.map((row, index) => (
            <li key={row.id} className={cn(styles.rowCard, index === 0 && styles.rowHover)}>
              <span className={styles.rowCardTop}>
                <span className={styles.from}>
                  <Avatar name={row.from} />
                  <span className={styles.fromName}>{row.from}</span>
                </span>
                <FitPill fit={row.fit} />
              </span>
              <span className={styles.rowCardSummary}>{row.summary}</span>
              <span className={styles.rowCardMeta}>
                <span className={styles.typePill}>{row.type}</span>
                <StatusPill status={row.status} />
              </span>
            </li>
          ))}
        </ul>

        <span className={styles.cursor} data-depth={10} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path
              d="M5 3.5 19 11l-6.2 1.6L10 19z"
              fill="var(--ink)"
              stroke="#fff"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </div>
  );
}

/* ---------- (c) Promote composer ---------- */

export function PromoteScreen() {
  const maxDay = Math.max(...CLICKS_BY_DAY);
  return (
    <div className={styles.screen}>
      <ScreenHeader title="Promote" subtitle={`${PREVIEW.title}, by Arjun`} />

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
              <p className={styles.cardTitleSm}>Draft for X</p>
              <p className={styles.cardMeta}>In your voice</p>
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
              <span className={styles.showcaseTitle}>Showcase page</span>
              <span className={styles.showcasePath}>{SHOWCASE_PAGE.path}</span>
            </span>
            <span className={styles.livePill}>{SHOWCASE_PAGE.status}</span>
          </div>
        </div>

        <div className={styles.order}>
          <p className={styles.orderLabel}>Preview</p>
          <div className={styles.preview} data-depth={6}>
            <span className={styles.previewTile}>
              <Code2 size={18} {...ICON} />
            </span>
            <span className={styles.previewBody}>
              <span className={styles.previewTitle}>{PREVIEW.title}</span>
              <span className={styles.previewMeta}>{PREVIEW.meta}</span>
            </span>
            <span className={styles.featured}>Featured by {creator.firstName}</span>
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

          <Fake className={styles.btnPrimary}>Publish</Fake>
          <span className={styles.orderRow}>
            <Fake className={styles.btnSecondarySm}>
              <Copy size={16} {...ICON} />
              Copy
            </Fake>
            <Fake className={styles.btnSecondarySm}>
              <ExternalLink size={16} {...ICON} />
              Open in X
            </Fake>
          </span>
        </div>
      </div>
    </div>
  );
}
