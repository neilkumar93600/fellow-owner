import { ArrowUpRight, Check, Heart, MousePointerClick } from 'lucide-react';
import Link from 'next/link';
import { CreatorImage } from '@/components/shared/creator-image';
import { cn } from '@/lib/utils';
import {
  avatarTint,
  creator,
  DEMO,
  type DemoCrewMember,
  initials,
  type ShowcaseProject,
  showcase,
} from './demo-data';
import st from './showcase.module.css';
import { AfterMount, ShowcaseStage } from './showcase-motion';

/*
 * "Made by fans, credited by name" (round 4 spec section 2, "Showcase"): on the page background, the fan
 * projects a demo creator featured, as one slow marquee. Demo data, labelled as such. One card is a real
 * "Made it" page crop (title, Made by roles, clicks), the rest are flat tinted cards with a cover of the
 * made thing (a room cover or vlog still, lazy-loaded) and the crew's avatar stack on its bottom edge. Each card has its own width, so the strip reads as six
 * different things. Only a card with a live showcase page is a link.
 *
 * One row, so no project is ever on screen twice. The track holds three copies of the list and the middle
 * one is the real list: exposed to assistive tech and the keyboard, while the copies either side are
 * aria-hidden + inert echoes (no tab stops, no clicks: the real card is a few cards away). The echoes are
 * added after mount (AfterMount), so the server HTML lists each project once; until then an empty box of
 * the same width holds their place. The animation
 * keeps the middle copy's start inside the viewport, so any card can be brought to the centre when it takes focus
 * (showcase-motion.tsx). The row pauses on hover and focus-within, and with the Pause control. Reduced
 * motion: the middle copy alone, as a row that scrolls and snaps.
 */

/** Copies of the list in the track (an echo, the real list, an echo). */
const COPIES = 3;

/** Card widths in list order, so the strip is not a grid. */
const SIZES = ['lg', 'sm', 'md', 'lg', 'sm', 'md'] as const;

/** One list's width (cards plus a gap after each, as .group lays them out): an echo's reserved space. */
const LIST_WIDTH = `calc(${showcase
  .map((_, index) => `var(--card-${SIZES[index % SIZES.length]})`)
  .join(' + ')} + ${showcase.length} * var(--gap))`;

/** Card widths per size and breakpoint (showcase.module.css), as the cover image's `sizes`. */
const COVER_SIZES: Record<(typeof SIZES)[number], string> = {
  sm: '(min-width: 1800px) 300px, (min-width: 1200px) 288px, (min-width: 768px) 264px, 240px',
  md: '(min-width: 1800px) 360px, (min-width: 1200px) 340px, (min-width: 768px) 312px, 272px',
  lg: '(min-width: 1800px) 440px, (min-width: 1200px) 420px, (min-width: 768px) 372px, 312px',
};

/** Flat card tints, by position in the list. */
const TINTS = ['peach', 'lilac', 'sky', 'mint', 'lilac', 'peach'] as const;

/** Showcase pages that exist in the demo world, by card title. Cards without one render as plain cards. */
const SHOWCASE_SLUGS: Record<string, string> = {
  [DEMO.idea.title]: 'lisbon-on-60-a-day',
};

/** The crew photo for a demo fan, when there is one; other makers get initials. */
const FACES = new Map(DEMO.crew.map((member) => [member.name, member.avatar]));

export function ShowcaseStrip() {
  return (
    <section id="showcase" aria-labelledby="showcase-title" className={st.section}>
      <ShowcaseStage
        className={st.stage}
        headClassName={st.head}
        sideClassName={st.side}
        controlClassName={st.control}
        controlTextClassName={st.controlText}
        heading={
          <div className={st.titleWrap}>
            <h2 id="showcase-title" className={cn('text-section', st.title)}>
              Made by fans, credited by name
            </h2>
            <span className={st.badge}>Demo data</span>
          </div>
        }
        line={<p className={cn('text-lead', st.line)}>Built by fan crews.</p>}
      >
        <div className={st.rows}>
          <div className={st.row}>
            <div className={st.track} data-marquee-track data-copies={COPIES}>
              <EchoList />
              <ProjectList real />
              <EchoList />
            </div>
          </div>
        </div>
      </ShowcaseStage>
    </section>
  );
}

/** An echo list, added after mount; until then an empty box of the same width keeps the loop's geometry. */
function EchoList() {
  return (
    <AfterMount
      fallback={
        <div className={st.echo} style={{ width: LIST_WIDTH }} aria-hidden="true" data-copy="" />
      }
    >
      <ProjectList />
    </AfterMount>
  );
}

/** One list of the cards: the real one (named, reachable), or an aria-hidden + inert echo for the loop. */
function ProjectList({ real }: { real?: boolean }) {
  return (
    <ul
      // biome-ignore lint/a11y/noRedundantRoles: keeps list semantics when reduced motion sets display: contents (Safari drops them).
      role="list"
      className={st.group}
      aria-label={real ? 'Featured projects' : undefined}
      aria-hidden={real ? undefined : true}
      inert={!real}
      data-copy={real ? undefined : ''}
    >
      {showcase.map((project, index) => {
        const size = SIZES[index % SIZES.length] ?? 'md';
        return (
          <li key={project.title} className={st.item} data-size={size} data-marquee-item>
            <ProjectCard
              project={project}
              tint={TINTS[index % TINTS.length] ?? 'peach'}
              size={size}
            />
          </li>
        );
      })}
    </ul>
  );
}

/** A crew member's face (when there is a photo) or initials on a pastel tint. Decorative: names sit beside it. */
function Maker({ name, large }: { name: string; large?: boolean }) {
  const face = FACES.get(name);
  return (
    <span
      className={cn(st.avatar, large && st.avatarLg)}
      style={face ? undefined : { backgroundColor: avatarTint(name) }}
    >
      {face ? <CreatorImage name={face} alt="" fill sizes="56px" /> : initials(name)}
    </span>
  );
}

/** The card's title: a stretched link when the project has a live showcase page. */
function CardTitle({ title, slug }: { title: string; slug?: string }) {
  return (
    <h3 className={st.cardTitle}>
      {slug ? (
        <Link href={`/${creator.handle}/s/${slug}`} prefetch={false} className={st.cardLink}>
          {title}
        </Link>
      ) : (
        title
      )}
    </h3>
  );
}

function ProjectCard({
  project,
  tint,
  size,
}: {
  project: ShowcaseProject;
  tint: (typeof TINTS)[number];
  size: (typeof SIZES)[number];
}) {
  const slug = SHOWCASE_SLUGS[project.title];
  return project.title === DEMO.idea.title ? (
    <MadeItCard project={project} crew={DEMO.crew} slug={slug} />
  ) : (
    <FlatCard project={project} tint={tint} size={size} slug={slug} />
  );
}

/** The real "Made it" page, cropped: room and status, the title, Made by with roles, and the clicks. */
function MadeItCard({
  project,
  crew,
  slug,
}: {
  project: ShowcaseProject;
  crew: readonly DemoCrewMember[];
  slug?: string;
}) {
  return (
    <article className={st.card}>
      <div className={cn(st.cover, st.page)}>
        <div className={st.pageBand}>
          <span className={st.status}>
            <Check size={13} strokeWidth={2} aria-hidden="true" />
            Made it
          </span>
        </div>
        <div className={st.pageBody}>
          <CardTitle title={project.title} slug={slug} />
          <ul className={st.credits}>
            {crew.map((member) => (
              <li key={member.name}>
                <Maker name={member.name} large />
                <span className={st.creditText}>
                  <b>{member.name}</b>
                </span>
              </li>
            ))}
          </ul>
        </div>
        {slug ? (
          <span className={st.open} aria-hidden="true">
            <ArrowUpRight size={16} strokeWidth={1.5} />
          </span>
        ) : null}
      </div>
      <div className={st.foot}>
        <span className={st.team}>
          <MousePointerClick size={15} strokeWidth={1.75} aria-hidden="true" />
          <span className="tabular">{DEMO.clicks.total} clicks</span>
        </span>
        <Hearts count={project.hearts} />
      </div>
    </article>
  );
}

/** A flat tinted card: a cover of the thing the crew made, their avatar stack on its bottom edge. */
function FlatCard({
  project,
  tint,
  size,
  slug,
}: {
  project: ShowcaseProject;
  tint: (typeof TINTS)[number];
  size: (typeof SIZES)[number];
  slug?: string;
}) {
  const shown = project.crew.slice(0, 4);
  const more = project.team - shown.length;
  return (
    <article className={st.card}>
      <div className={cn(st.cover, st.flat)} data-tint={tint}>
        <div className={st.shot}>
          <CreatorImage name={project.cover} alt="" fill sizes={COVER_SIZES[size]} />
        </div>
        <span className={st.bigStack} aria-hidden="true">
          {shown.map((name) => (
            <Maker key={name} name={name} large />
          ))}
          {more > 0 ? (
            <span className={cn(st.avatar, st.avatarLg, st.avatarMore)}>+{more}</span>
          ) : null}
        </span>
        <CardTitle title={project.title} slug={slug} />
        {slug ? (
          <span className={st.open} aria-hidden="true">
            <ArrowUpRight size={16} strokeWidth={1.5} />
          </span>
        ) : null}
      </div>
      <div className={st.foot}>
        <span className={st.team}>
          <span className="tabular">Crew of {project.team}</span>
        </span>
        <Hearts count={project.hearts} />
      </div>
    </article>
  );
}

function Hearts({ count }: { count: number }) {
  return (
    <span className={st.signals}>
      <Heart size={14} strokeWidth={1.75} aria-hidden="true" />
      <b className="tabular">{count}</b>
      <span className="sr-only"> hearts</span>
    </span>
  );
}
