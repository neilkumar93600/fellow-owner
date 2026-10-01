import {
  ArrowRight,
  Check,
  Code2,
  Copy,
  Dumbbell,
  Filter,
  Leaf,
  LineChart,
  Link2,
  Lock,
  type LucideIcon,
  Music,
  PenTool,
  Plus,
  Sparkles,
  Timer,
  Users,
} from 'lucide-react';
import type * as React from 'react';
import { cn } from '@/lib/utils';
import { communities, creator, showcase } from './demo-data';
import st from './features.module.css';
import {
  avatarTint,
  CLICKS_PEAK,
  CLICKS_TOTAL,
  clock,
  DEMO_ROLES,
  formatNumber,
  type IconName,
  initials,
  PITCH_DRAFT,
  PITCH_SELECTED,
  PITCH_TYPES,
  SHORT_LINK,
  SPARK,
  TASTE,
  TEAM,
  TINT_COLORS,
  TRIAGE,
} from './features-data';
import { FeaturesStage } from './features-motion';

/*
 * Features bento (landing brief v2, part 8): an aqua field holding seven tiles of different sizes, each
 * with a small piece of the real product drawn in HTML. The mini screens are pictures (role="img" with a
 * text label): nothing inside them is focusable. Three tiles carry a CSS 3D object.
 *
 * Desktop (1200+): 12 columns. Bio link 6x2; Triage and Taste 3x1; Try it 6x1 beside the bio link;
 * Teams, Pitches and Links 4x1. Tablet (640+): 2 columns, the bio link spanning two rows. Phone: 1 column.
 *
 * Lime stays out of the bento's large surfaces: it belongs to the #demo field two sections down, so the
 * one-click demo tile shows the demo picker on a deeper aqua instead of a second set of Enter buttons.
 */

const ICON = { strokeWidth: 1.5, 'aria-hidden': true } as const;

const COMMUNITY_ICONS: Partial<Record<IconName, LucideIcon>> = {
  'code-2': Code2,
  'pen-tool': PenTool,
  'line-chart': LineChart,
  music: Music,
  dumbbell: Dumbbell,
  leaf: Leaf,
};

export function FeaturesGrid() {
  return (
    <section id="features" aria-labelledby="features-title" className={st.section}>
      <div className={st.field}>
        <FeaturesStage className={st.inner}>
          <header className={st.head}>
            <div className={st.headMain} data-reveal>
              <p className="eyebrow">Features</p>
              <h2 id="features-title" className={cn('text-section', st.title)}>
                Everything the loop needs.
              </h2>
            </div>
            <div className={st.headSide} data-reveal style={{ '--d': 80 } as React.CSSProperties}>
              <p className={cn('text-lead', st.lead)}>
                Built for the few minutes a day you give it, and the phone your fans are already
                holding.
              </p>
              <p className={st.demoNote}>
                <span className={st.demoChip}>Demo</span>
                Every screen below is Mira’s demo space.
              </p>
            </div>
          </header>

          <ul className={st.grid}>
            <Cell className={st.cBio} delay={0}>
              <BioTile />
            </Cell>
            <Cell className={st.cTriage} delay={80}>
              <TriageTile />
            </Cell>
            <Cell className={st.cTaste} delay={160}>
              <TasteTile />
            </Cell>
            <Cell className={st.cTry} delay={80}>
              <TryTile />
            </Cell>
            <Cell className={st.cTeams} delay={0}>
              <TeamsTile />
            </Cell>
            <Cell className={st.cPitch} delay={80}>
              <PitchTile />
            </Cell>
            <Cell className={st.cLinks} delay={160}>
              <LinksTile />
            </Cell>
          </ul>
        </FeaturesStage>
      </div>
    </section>
  );
}

/* ---------- Layout atoms ---------- */

function Cell({
  className,
  delay,
  children,
}: {
  className: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <li
      className={cn(st.cell, className)}
      data-reveal
      style={{ '--d': delay } as React.CSSProperties}
    >
      {children}
    </li>
  );
}

function Tile({
  tint = 'white',
  size = 'sm',
  title,
  body,
  className,
  children,
}: {
  tint?: 'white' | 'lavender' | 'peach' | 'aqua';
  size?: 'sm' | 'lg';
  title: string;
  body: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn(st.tile, className)} data-tint={tint}>
      <div className={st.tileHead}>
        <h3 className={size === 'lg' ? st.tileTitleLg : st.tileTitle}>{title}</h3>
        <p className={size === 'lg' ? st.tileBodyLg : st.tileBody}>{body}</p>
      </div>
      {children}
    </div>
  );
}

function Avatar({ name, size = 28 }: { name: string; size?: 24 | 28 | 48 }) {
  return (
    <span
      className={cn(st.avatar, size === 24 && st.avatarSm, size === 48 && st.avatarLg)}
      style={{ backgroundColor: avatarTint(name) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

function AiChip() {
  return (
    <span className={st.aiChip}>
      <Sparkles size={12} {...ICON} />
      AI pick
    </span>
  );
}

/** Fit pill (04 §5): number plus a tiny bar, banded 0-39 / 40-69 / 70-100. */
function FitPill({ fit }: { fit: number }) {
  const band = fit >= 70 ? st.fitHigh : fit >= 40 ? st.fitMid : st.fitLow;
  return (
    <span className={cn(st.fit, band)}>
      <span className="tabular">{fit}</span>
      <span className={st.fitBar} aria-hidden="true">
        <span style={{ '--fit': fit / 100 } as React.CSSProperties} />
      </span>
    </span>
  );
}

/* ---------- Decorative CSS 3D objects ---------- */

function Cube({ tone, className }: { tone: 'violet' | 'lime'; className?: string }) {
  return (
    <span className={cn(st.object, className)} aria-hidden="true">
      <span className={st.bob}>
        <span className={cn(st.cube, tone === 'lime' ? st.cubeLime : st.cubeViolet)}>
          <span className={st.faceFront} />
          <span className={st.faceBack} />
          <span className={st.faceRight} />
          <span className={st.faceLeft} />
          <span className={st.faceTop} />
          <span className={st.faceBottom} />
        </span>
      </span>
      <span className={st.groundShadow} />
    </span>
  );
}

function Orb({ tone, className }: { tone: 'lavender' | 'aqua'; className?: string }) {
  return (
    <span className={cn(st.object, className)} aria-hidden="true">
      <span className={cn(st.bob, st.bobSlow)}>
        <span className={cn(st.orb, tone === 'aqua' ? st.orbAqua : st.orbLavender)} />
      </span>
    </span>
  );
}

/* ---------- 1. A bio link with a door ---------- */

function BioTile() {
  return (
    <Tile
      size="lg"
      className={st.tBio}
      title="A bio link with a door"
      body="Your one link opens a home, not a list: communities to join, ideas to back, and a proper way to pitch you."
    >
      <div className={st.bioStage}>
        <Orb tone="lavender" className={st.bioOrb} />
        <BioFrame />
      </div>
    </Tile>
  );
}

function BioFrame() {
  const featured = showcase[0]!;
  const featuredCommunity = communities.find((c) => c.name === featured.community);
  const FeaturedIcon = (featuredCommunity && COMMUNITY_ICONS[featuredCommunity.icon]) ?? Users;
  return (
    <div
      className={st.bioFrame}
      role="img"
      aria-label={`Demo bio page for ${creator.name}: six communities to join, a project featured by ${creator.firstName}, and a Send ${creator.firstName} a pitch button.`}
    >
      <div className={st.bioBar}>
        <span className={st.url}>
          <Lock size={12} {...ICON} />
          fellowowners.app/{creator.handle}
        </span>
      </div>
      <div className={st.bioBody}>
        <div className={st.bioProfile}>
          <div className={st.bioWho}>
            <Avatar name={creator.name} size={48} />
            <span>
              <span className={st.bioName}>{creator.name}</span>
              <span className={st.bioHandle}>@{creator.handle}</span>
            </span>
          </div>
          <span className={st.bioLine}>{creator.bio}</span>
          <span className={st.platforms}>
            {creator.platforms.map((p) => (
              <span key={p.platform} className={st.platform}>
                {p.platform}
                <b className="tabular">{p.followers}</b>
              </span>
            ))}
          </span>
          <span className={st.bioFeatured}>
            <span className={st.bioLabel}>Featured by {creator.firstName}</span>
            <span className={st.featuredRow}>
              <span
                className={st.featuredIcon}
                style={{ '--tile': TINT_COLORS[featured.tint].tile } as React.CSSProperties}
              >
                <FeaturedIcon size={14} {...ICON} />
              </span>
              <span className={st.featuredText}>
                <span className={st.featuredTitle}>{featured.title}</span>
                <span className={cn(st.featuredMeta, 'tabular')}>
                  {featured.community} · team of {featured.team}
                </span>
              </span>
            </span>
          </span>
          <span className={st.pitchPill}>
            Send {creator.firstName} a pitch
            <span className={st.pitchArrow}>
              <ArrowRight size={14} {...ICON} />
            </span>
          </span>
        </div>
        <div className={st.bioJoin}>
          <span className={st.bioLabel}>Join a community</span>
          <span className={st.bioGrid}>
            {communities.map((c, i) => {
              const Icon = COMMUNITY_ICONS[c.icon] ?? Users;
              const tint = TINT_COLORS[c.tint];
              return (
                <span
                  key={c.slug}
                  className={st.community}
                  style={{ '--bg': tint.bg, '--tile': tint.tile, '--i': i } as React.CSSProperties}
                >
                  <span className={st.communityIcon}>
                    <Icon size={15} {...ICON} />
                  </span>
                  <span className={st.communityText}>
                    <span className={st.communityName}>{c.name}</span>
                    <span className={cn(st.communityMeta, 'tabular')}>{c.members} members</span>
                  </span>
                </span>
              );
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ---------- 2. Triage with reasons ---------- */

function TriageTile() {
  return (
    <Tile
      title="Triage with reasons"
      body="Every pitch is scored against your taste, with the line that explains the score."
    >
      <div
        className={st.frame}
        role="img"
        aria-label={`Demo inbox item: ${TRIAGE.from}, a ${TRIAGE.type.toLowerCase()} pitch, marked AI pick with fit ${TRIAGE.fit}. Reason: ${TRIAGE.reason} ${TRIAGE.filtered} spam messages filtered.`}
      >
        <span className={st.triageTop}>
          <AiChip />
          <FitPill fit={TRIAGE.fit} />
        </span>
        <span className={st.triageWho}>
          {TRIAGE.from}
          <span className={st.typeTag}>{TRIAGE.type}</span>
        </span>
        <span className={st.reason}>{TRIAGE.reason}</span>
        <span className={st.frameFoot}>
          <span className={st.filteredChip}>
            <Filter size={12} {...ICON} />
            <span className="tabular">{TRIAGE.filtered}</span> filtered
          </span>
          <span className={st.footNote}>Spam, out of sight</span>
        </span>
      </div>
    </Tile>
  );
}

/* ---------- 3. Your taste, in your words ---------- */

function TasteTile() {
  let n = 0;
  return (
    <Tile
      tint="lavender"
      title="Your taste, in your words"
      body="Say what you’d promote and what you never would. The AI scores against exactly that."
    >
      <div
        className={st.frame}
        role="img"
        aria-label="Demo taste profile. Promote: fitness tools I’d use myself, paid build-in-public collabs; merch drops switched off. Never: follower growth schemes."
      >
        {TASTE.map((group) => (
          <span key={group.group} className={st.tasteGroup}>
            <span className={st.tasteLabel}>{group.group}</span>
            {group.lines.map((line) => {
              const i = n++;
              return (
                <span key={line.text} className={st.tasteLine}>
                  <span className={st.tasteText}>{line.text}</span>
                  <span
                    className={st.toggle}
                    data-on={line.on || undefined}
                    style={{ '--i': i } as React.CSSProperties}
                  >
                    <span className={st.knob} />
                  </span>
                </span>
              );
            })}
          </span>
        ))}
      </div>
    </Tile>
  );
}

/* ---------- 7. Try it in one click ---------- */

/**
 * The one-click demo as a feature, not a call to action: a picture of the demo picker (two roles and the
 * three-minute clock). The real Enter buttons live in the hero, the nav and the lime #demo field.
 */
function TryTile() {
  const total = DEMO_ROLES.reduce((sum, role) => sum + role.seconds, 0);
  return (
    <div className={cn(st.tile, st.tTry)} data-tint="aqua">
      <Cube tone="violet" className={st.tryCube} />
      <Orb tone="lavender" className={st.tryOrb} />
      <div className={st.tryText}>
        <h3 className={st.tileTitleLg}>Try it in one click</h3>
        <p className={st.tileBodyLg}>
          Enter as {creator.firstName} to see her dashboard, or as a fan to join her communities. No
          sign-up; the demo resets every night.
        </p>
      </div>
      <div
        className={cn(st.frame, st.pickFrame)}
        role="img"
        aria-label={`Demo picker. ${DEMO_ROLES.map((r) => `${r.name}, ${r.role}: ${r.detail}, ${clock(r.seconds)}`).join('. ')}. The whole path takes ${clock(total)}.`}
      >
        <span className={st.pickHead}>
          <span className={st.pickLabel}>Who do you want to be?</span>
          <span className={cn(st.timer, 'tabular')}>
            <Timer size={13} {...ICON} />
            {clock(total)}
          </span>
        </span>
        <span className={st.picks}>
          {DEMO_ROLES.map((r, i) => (
            <span
              key={r.role}
              className={st.pick}
              data-selected={i === 0 || undefined}
              style={{ '--bg': TINT_COLORS[r.tint].bg } as React.CSSProperties}
            >
              <Avatar name={r.name} />
              <span className={st.pickText}>
                <span className={st.pickName}>
                  {r.firstName} · {r.role}
                </span>
                <span className={st.pickMeta}>{r.detail}</span>
              </span>
              <span className={cn(st.pickTime, 'tabular')}>{clock(r.seconds)}</span>
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}

/* ---------- 4. Teams on projects ---------- */

function TeamsTile() {
  const filled = TEAM.roles.length;
  return (
    <Tile
      tint="peach"
      className={st.tTeams}
      title="Teams on projects"
      body="Fans join a project by role, so you see who is building, not just who is talking."
    >
      <Cube tone="lime" className={st.teamsCube} />
      <div
        className={st.frame}
        role="img"
        aria-label={`Demo project ${TEAM.project}: ${filled} of ${filled + 1} roles filled (${TEAM.roles.map((r) => `${r.role}, ${r.name}`).join('; ')}). The ${TEAM.open.role} role is open.`}
      >
        <span className={st.teamHead}>
          <span className={st.teamTitle}>{TEAM.project}</span>
          <span className={cn(st.teamCount, 'tabular')}>
            {filled} of {filled + 1}
          </span>
        </span>
        <span className={st.roles}>
          {TEAM.roles.map((r) => (
            <span key={r.role} className={st.role}>
              <Avatar name={r.name} size={24} />
              <span className={st.roleName}>{r.name}</span>
              <span className={st.roleTag}>{r.role}</span>
            </span>
          ))}
          <span className={cn(st.role, st.roleOpen)}>
            <span className={st.swap}>
              <span className={st.swapOpen}>
                <span className={st.openRing}>
                  <Plus size={12} {...ICON} />
                </span>
                <span className={st.roleName}>{TEAM.open.role}</span>
                <span className={st.openTag}>Open</span>
              </span>
              <span className={st.swapFilled}>
                <Avatar name={TEAM.open.applicant} size={24} />
                <span className={st.roleName}>{TEAM.open.applicant}</span>
                <span className={st.requestedTag}>Requested</span>
              </span>
            </span>
          </span>
        </span>
      </div>
    </Tile>
  );
}

/* ---------- 5. Pitches, not DMs ---------- */

function PitchTile() {
  return (
    <Tile
      title="Pitches, not DMs"
      body="Fans say what they are sending, so a press request never drowns in fan mail."
    >
      <div
        className={st.frame}
        role="img"
        aria-label={`Demo pitch form. Type: ${PITCH_TYPES.join(', ')}; ${PITCH_SELECTED} selected. Draft: ${PITCH_DRAFT}`}
      >
        <span className={st.fieldLabel}>What are you sending?</span>
        <span className={st.chips}>
          {PITCH_TYPES.map((type) => (
            <span
              key={type}
              className={st.chip}
              data-selected={type === PITCH_SELECTED || undefined}
            >
              {type === PITCH_SELECTED ? (
                <span className={st.chipCheck}>
                  <Check size={13} strokeWidth={2} aria-hidden="true" />
                </span>
              ) : null}
              {type}
            </span>
          ))}
        </span>
        <span className={st.input}>
          <span className={st.inputText}>{PITCH_DRAFT}</span>
          <span className={cn(st.inputCount, 'tabular')}>{PITCH_DRAFT.length}/280</span>
        </span>
      </div>
    </Tile>
  );
}

/* ---------- 6. Showcase pages and tracked links ---------- */

function LinksTile() {
  return (
    <Tile
      title="Showcase pages and tracked links"
      body="Back a project and it gets a public page and a short link that counts every click."
      className={st.tLinks}
    >
      <div
        className={st.frame}
        role="img"
        aria-label={`Demo short link ${SHORT_LINK}: ${formatNumber(CLICKS_TOTAL)} clicks in 14 days, ${CLICKS_PEAK} of them on the day ${creator.firstName} posted.`}
      >
        <span className={st.linkRow}>
          <span className={st.linkIcon}>
            <Link2 size={14} {...ICON} />
          </span>
          <span className={st.linkText}>{SHORT_LINK}</span>
          <span className={st.linkCopy}>
            <Copy size={13} {...ICON} />
          </span>
        </span>
        <span className={st.clicksRow}>
          <span className={cn(st.clicks, 'tabular')} data-count-to={CLICKS_TOTAL}>
            {formatNumber(CLICKS_TOTAL)}
          </span>
          <span className={st.clicksLabel}>clicks in 14 days</span>
        </span>
        <span className={st.spark}>
          <svg
            className={st.sparkSvg}
            viewBox={`0 0 ${SPARK.W} ${SPARK.H}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path className={st.sparkArea} d={SPARK.area} />
            <path className={st.sparkLine} d={SPARK.line} vectorEffect="non-scaling-stroke" />
          </svg>
          <span
            className={st.sparkPeak}
            style={{ left: `${SPARK.peak.x}%`, top: `${SPARK.peak.y}%` }}
          >
            <span className={st.sparkTip}>
              <span className="tabular">{CLICKS_PEAK}</span> the day {creator.firstName} posted
            </span>
          </span>
          <span
            className={st.sparkEnd}
            style={{ left: `${SPARK.end.x}%`, top: `${SPARK.end.y}%` }}
          />
        </span>
      </div>
    </Tile>
  );
}
