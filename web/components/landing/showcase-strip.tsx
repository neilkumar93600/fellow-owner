import {
  ArrowUpRight,
  Code2,
  Dumbbell,
  Leaf,
  LineChart,
  type LucideIcon,
  Music,
  PenTool,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';
import { cn } from '@/lib/utils';
import { communities, creator, showcase } from './demo-data';
import { avatarTint, initials, TINT_COLORS } from './features-data';
import st from './showcase.module.css';
import { ShowcaseStage } from './showcase-motion';
import { ProjectVisual, projectSize } from './showcase-visuals';

/*
 * Showcase strip (landing brief v2, part 9): on the page background, the projects Mira's community built
 * and she promoted, as one slow marquee. Demo data, labelled as such. Each card shows a small picture of
 * the project (showcase-visuals.tsx) and has its own width, so the strip reads as eight different things.
 *
 * One row, so no project is ever on screen twice. The track holds three copies of the list and the middle
 * one is the real list: exposed to assistive tech and the keyboard, while the copies either side are
 * aria-hidden echoes (links out of the tab order, still clickable). The animation keeps the middle copy's
 * start inside the viewport, so any card can be brought to the centre when it takes focus
 * (showcase-motion.tsx). The row pauses on hover and focus-within, and with the Pause control. Reduced
 * motion: the middle copy alone, as a row that scrolls and snaps.
 */

type Project = (typeof showcase)[number];

/** Copies of the list in the track (about 2,900px each at desktop); the middle one is the real list. */
const COPIES = 3;
const REAL_COPY = 1;

const ICONS: Record<string, LucideIcon> = {
  'code-2': Code2,
  'pen-tool': PenTool,
  'line-chart': LineChart,
  music: Music,
  dumbbell: Dumbbell,
  leaf: Leaf,
};

/** The people on each project's team, in join order (demo names). */
const TEAMS: Record<string, string[]> = {
  'Gym-log app for creators': ['Arjun Mehta', 'Priya Nair', 'Leo Brandt', 'Sana Iqbal'],
  'Thumbnail kit for small channels': ['Maya Chen', 'Noor Haddad', 'Tomás Rivera'],
  'Saturday code club for kids': [
    'Kofi Mensah',
    'Ama Owusu',
    'Ben Carter',
    'Ines Duarte',
    'Raj Patel',
    'Lena Fischer',
  ],
  'Lo-fi pack for study streams': ['Yuki Sato', 'Omar Farouk'],
  '12-week strength plan, open source': [
    'Sana Iqbal',
    'Marcus Lee',
    'Elif Kaya',
    'Jonas Berg',
    'Hana Kim',
  ],
  'Creator revenue calculator': ['Leah Okafor', 'Dev Kapoor', 'Chloe Martin'],
  'Habit tracker widget': ['Arjun Mehta', 'Chloe Martin'],
  'Community-run park cleanup map': [
    'Ana Ruiz',
    'Kofi Mensah',
    'Ines Duarte',
    'Ben Carter',
    'Lena Fischer',
    'Omar Farouk',
    'Ama Owusu',
  ],
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

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
              Featured by {creator.firstName}
            </h2>
            <span className={st.badge}>Demo data</span>
          </div>
        }
        line={
          <p className={cn('text-lead', st.line)}>
            Projects her community built, promoted with one click.
          </p>
        }
      >
        <div className={st.rows}>
          <div className={st.row}>
            <div className={st.track} data-marquee-track data-copies={COPIES}>
              {Array.from({ length: COPIES }, (_, copy) => {
                const real = copy === REAL_COPY;
                return (
                  <ul
                    // biome-ignore lint/suspicious/noArrayIndexKey: copies are identical and fixed in number.
                    key={copy}
                    // biome-ignore lint/a11y/noRedundantRoles: keeps list semantics when reduced motion sets display: contents (Safari drops them).
                    role="list"
                    className={st.group}
                    aria-label={real ? 'Featured projects' : undefined}
                    aria-hidden={real ? undefined : true}
                    data-copy={real ? undefined : ''}
                  >
                    {showcase.map((project) => (
                      <li
                        key={project.title}
                        className={st.item}
                        data-size={projectSize(project.title)}
                        data-marquee-item
                      >
                        <ProjectCard project={project} echo={!real} />
                      </li>
                    ))}
                  </ul>
                );
              })}
            </div>
          </div>
        </div>
      </ShowcaseStage>
    </section>
  );
}

/** echo: a visual copy (aria-hidden by its list). Still clickable, but out of the tab order. */
function ProjectCard({ project, echo }: { project: Project; echo: boolean }) {
  const community = communities.find((c) => c.name === project.community);
  const Icon = (community && ICONS[community.icon]) ?? Users;
  const tint = TINT_COLORS[project.tint];
  const team = TEAMS[project.title] ?? [];
  const shown = team.slice(0, 3);
  const more = project.team - shown.length;

  return (
    <article
      className={st.card}
      data-tint={project.tint}
      style={{ '--bg': tint.bg, '--tile': tint.tile } as React.CSSProperties}
    >
      <div className={st.cover}>
        <div className={st.coverTop}>
          <span className={st.community}>
            <span className={st.communityIcon}>
              <Icon size={13} strokeWidth={1.5} aria-hidden="true" />
            </span>
            {project.community}
          </span>
        </div>
        <ProjectVisual title={project.title} />
        <h3 className={st.cardTitle}>
          <Link
            href={`/${creator.handle}/s/${slugify(project.title)}`}
            prefetch={false}
            tabIndex={echo ? -1 : undefined}
            className={st.cardLink}
          >
            {project.title}
          </Link>
        </h3>
        <span className={st.open} aria-hidden="true">
          <ArrowUpRight size={16} strokeWidth={1.5} />
        </span>
      </div>
      <div className={st.foot}>
        <span className={st.team}>
          <span className={st.stack} aria-hidden="true">
            {shown.map((name) => (
              <span key={name} className={st.avatar} style={{ backgroundColor: avatarTint(name) }}>
                {initials(name)}
              </span>
            ))}
            {more > 0 ? <span className={cn(st.avatar, st.avatarMore)}>+{more}</span> : null}
          </span>
          <span className="tabular">Team of {project.team}</span>
        </span>
        <span className={st.signals}>
          <b className="tabular">{project.signals}</b> signals
        </span>
      </div>
    </article>
  );
}
