import { cn } from '@/lib/utils';
import { DemoButton } from './demo-button';
import { avatarTint, initials, showcase } from './demo-data';
import st from './fans.module.css';

/**
 * For fans (landing brief 14c, after the Quotify header idea): one glance at what a fan gets. A centered
 * serif headline, tall fan quotes fanned in perspective at both edges, a slow strip of projects fan crews
 * made (credited by name), one line and one button. Server-rendered, no JavaScript: the strip is CSS only.
 * Demo data, labelled as such.
 */

interface FanQuote {
  text: string;
  name: string;
  tint: 'peach' | 'lilac' | 'mint' | 'sky' | 'gold';
}

// ponytail: demo quotes live here; move to demo-data.ts if another section needs them.
const LEFT: readonly FanQuote[] = [
  { text: 'I’m booking Lisbon with this next month.', name: 'Sana Iqbal', tint: 'peach' },
  { text: 'I posted my layover idea and had a crew by Friday.', name: 'Milo Adeyemi', tint: 'sky' },
];
const RIGHT: readonly FanQuote[] = [
  {
    text: 'Joining took about a minute. Then I had people to plan with.',
    name: 'Ama Owusu',
    tint: 'lilac',
  },
  { text: 'I finally know who else is planning the same trip.', name: 'Lara Haddad', tint: 'gold' },
];

/** Per-card pose, outermost card first on each side: [x, y, rotateZ]. */
const POSES = [
  ['0px', '44px', '-6deg'],
  ['150px', '-4px', '3deg'],
] as const;

function Fan({ quotes, side }: { quotes: readonly FanQuote[]; side: 'left' | 'right' }) {
  return (
    <ul
      className={cn(st.fan, side === 'left' ? st.fanLeft : st.fanRight)}
      aria-label="What fans say"
    >
      {quotes.map((q, i) => {
        const [x, y, rz] = POSES[i] ?? POSES[0];
        return (
          <li
            key={q.name}
            className={cn(st.quote, st[q.tint])}
            style={{ '--x': x, '--y': y, '--rz': rz } as React.CSSProperties}
          >
            <blockquote>
              <p className={st.quoteText}>“{q.text}”</p>
              <footer className={st.quoteBy}>
                <span
                  className={st.dot}
                  style={{ background: avatarTint(q.name) }}
                  aria-hidden="true"
                >
                  {initials(q.name)}
                </span>
                {q.name}
              </footer>
            </blockquote>
          </li>
        );
      })}
    </ul>
  );
}

const TINTS = ['peach', 'lilac', 'mint', 'sky', 'gold', 'peach', 'lilac'] as const;

/** "crew of 5", or both names for a pair. */
function byline(crew: readonly string[]): string {
  return crew.length === 2 ? `by ${crew[0]} and ${crew[1]}` : `crew of ${crew.length}`;
}

function Projects({ hidden }: { hidden?: boolean }) {
  return (
    <ul
      className={cn(st.copy, hidden && st.echo)}
      aria-hidden={hidden || undefined}
      aria-label={hidden ? undefined : 'Projects fan crews made, credited by name'}
    >
      {showcase.map((p, i) => (
        <li key={p.title} className={cn(st.project, st[TINTS[i % TINTS.length] ?? 'peach'])}>
          <h3 className={st.projectTitle}>{p.title}</h3>
          <p className={st.projectBy}>{byline(p.crew)}</p>
        </li>
      ))}
    </ul>
  );
}

export function FansSection() {
  return (
    <section id="fans" aria-labelledby="fans-title" className={st.section}>
      <div className={st.field}>
        <div className={st.top}>
          <Fan quotes={LEFT} side="left" />
          <Fan quotes={RIGHT} side="right" />
          <div className={st.center}>
            <p className="eyebrow">For fans</p>
            <h2 id="fans-title" className={cn('text-section', st.title)}>
              Fans get a door, not a DM.
            </h2>
            <p className={cn('text-lead', st.lead)}>
              Join a room in 60 seconds, share an idea, team up, and get credited by name when it’s
              featured.
            </p>
            <DemoButton as="fan">Try the fan demo</DemoButton>
            <p className={st.demoLabel}>Demo data. Names are made up.</p>
          </div>
        </div>

        <div className={st.strip}>
          <div className={st.track}>
            <Projects />
            <Projects hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
