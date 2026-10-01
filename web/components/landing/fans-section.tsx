import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import st from './fans.module.css';
import { FAN_STEPS } from './fans-data';
import { BioScreen, FanScreen, FeedScreen, JoinScreen, ProjectScreen } from './fans-screens';
import { FansStage } from './fans-stage';
import { Reveal } from './reveal';

const SCREENS = {
  bio: BioScreen,
  join: JoinScreen,
  feed: FeedScreen,
  team: ProjectScreen,
} as const;

// Without JavaScript: the phone-width caption shows one step at a time with nothing to switch it, so list
// them all; and the heading's reveal never runs, so show it.
const NO_SCRIPT_CSS =
  '#fans [data-fans-head] [style]{opacity:1!important;transform:none!important}@media (max-width:767.98px){[data-fans-steps]>li{grid-area:auto!important;opacity:1!important}[data-fans-steps]{row-gap:20px}}';

/**
 * For fans (landing brief v2, part 6): a peach field where a 3D phone turns as you scroll and steps through
 * Mira's bio page, the 60-second join, an idea in the feed and a project's open role.
 *
 * The heading, the step list and all four screens are server-rendered, so the section reads without
 * JavaScript. FansStage pins the stage on wide screens, syncs the swipe row on phones, and turns the steps
 * into tabs under reduced motion.
 */
export function FansSection() {
  return (
    <section id="fans" aria-labelledby="fans-title" className={st.section}>
      <div className={st.field}>
        <div className={st.inner}>
          <header className={st.head} data-fans-head>
            <Reveal className={st.headMain}>
              <p className="eyebrow">For fans</p>
              <h2 id="fans-title" className={cn('text-section', st.title)}>
                <span className={st.titleLine}>Fans get a door,</span>{' '}
                <span className={st.titleLine}>not a DM.</span>
              </h2>
            </Reveal>
            <Reveal className={st.headSide} delay={0.08}>
              <p className={cn('text-lead', st.lead)}>
                Your bio link opens a home for them: communities that fit, a feed of ideas, teams to
                join, and a pitch form you actually read.
              </p>
            </Reveal>
          </header>
        </div>

        <FansStage
          screens={FAN_STEPS.map((step) => {
            const Body = SCREENS[step.id];
            return (
              <FanScreen key={step.id} step={step}>
                <Body />
              </FanScreen>
            );
          })}
          label={
            <p className={st.demoLabel}>
              <span className={st.demoChip}>Demo</span>
              Mira’s space, as a fan sees it
            </p>
          }
          callout={
            <p className={st.calloutText}>
              <span className={st.calloutTile} aria-hidden="true">
                <Timer size={22} strokeWidth={1.5} />
              </span>
              <span>
                <strong className={st.calloutStrong}>Joining takes under a minute.</strong> It works
                inside Instagram, TikTok and YouTube.
              </span>
            </p>
          }
        />
        <noscript>
          <style>{NO_SCRIPT_CSS}</style>
        </noscript>
      </div>
    </section>
  );
}
