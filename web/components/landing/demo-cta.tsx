import type * as React from 'react';
import { cn } from '@/lib/utils';
import st from './cta.module.css';
import { CtaStage } from './cta-motion';
import { DemoButton } from './demo-button';
import { creator, fan, judgePath } from './demo-data';

/*
 * Demo CTA (landing brief v2, part 10): a big lime field inset with shell corners. The judge path from
 * 03-app-flow J7 runs as a timeline: numbered stops on a line, horizontal from 1024px and stacked below.
 * Stops 1 to 5 are Mira's dashboard; the dashed segment marks the switch to the fan side for stop 6.
 *
 * Five clay orbs float in the top-right space; they are decoration only (aria-hidden). CtaStage pauses
 * their bob off-screen, plays the entrances, and leans them toward the mouse on desktop.
 */

type OrbTone = 'purple' | 'white' | 'aqua' | 'peach';

/** Back to front: each orb's cast shadow falls on the ones listed before it. */
const ORBS: { id: string; tone: OrbTone; slot: string; delay: number }[] = [
  { id: 'orb-purple', tone: 'purple', slot: st.oPurple, delay: 120 },
  { id: 'orb-dot', tone: 'purple', slot: st.oDot, delay: 420 },
  { id: 'orb-white', tone: 'white', slot: st.oWhite, delay: 260 },
  { id: 'orb-peach', tone: 'peach', slot: st.oPeach, delay: 200 },
  { id: 'orb-aqua', tone: 'aqua', slot: st.oAqua, delay: 340 },
];

const TONE: Record<OrbTone, string> = {
  purple: st.ballPurple,
  white: st.ballWhite,
  aqua: st.ballAqua,
  peach: st.ballPeach,
};

/** The role you play at each stop: Mira for the dashboard, Arjun for the join. */
const GROUPS: Record<number, { name: string; initials: string; tone: string }> = {
  0: { name: `As ${creator.firstName}`, initials: 'MK', tone: st.avLavender },
  5: { name: `As ${fan.firstName}`, initials: 'AM', tone: st.avPeach },
};

const TOTAL_SECONDS = judgePath.reduce((sum, stop) => sum + stop.seconds, 0);

function clock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function delay(ms: number) {
  return { '--d': `${ms}ms` } as React.CSSProperties;
}

export function DemoCta() {
  return (
    <section id="demo" aria-labelledby="demo-title" className={st.section}>
      <CtaStage lean className={st.field}>
        <div className={st.inner}>
          <div className={st.head}>
            <div className={st.orbs} aria-hidden="true" data-cta-lean="">
              {ORBS.map((orb) => (
                <span
                  key={orb.id}
                  className={cn(st.orb, orb.slot)}
                  data-cta-reveal="orb"
                  style={delay(orb.delay)}
                >
                  <span className={st.lean}>
                    <span className={st.bob}>
                      <span className={cn(st.ball, TONE[orb.tone])} />
                    </span>
                  </span>
                </span>
              ))}
            </div>

            <p className={cn('eyebrow', st.eyebrow)} data-cta-reveal="rise">
              Try it
            </p>
            <h2 id="demo-title" className={st.title} data-cta-reveal="lines">
              <span className={st.line}>
                <span className={st.lineInner}>See it in three</span>
              </span>{' '}
              <span className={st.line}>
                <span className={cn(st.lineInner, st.lineLate)}>minutes.</span>
              </span>
            </h2>
            <p className={cn('text-lead', st.lead)} data-cta-reveal="rise" style={delay(160)}>
              <span className={st.leadLine}>
                No sign-up. Enter as {creator.firstName}, the creator, or as {fan.firstName}, a fan.
              </span>{' '}
              <span className={st.leadLine}>The demo resets every night.</span>
            </p>
            <div className={st.actions} data-cta-reveal="rise" style={delay(240)}>
              <DemoButton as="creator" className={st.btn} />
              <DemoButton as="fan" variant="secondary" className={st.btn} />
            </div>
          </div>

          <div className={st.path} data-cta-reveal="path">
            <div className={st.pathHead}>
              <h3 className={st.pathTitle}>The three-minute path</h3>
              <p className={st.pathNote}>
                Six stops in order. Start as {creator.firstName}, finish as a fan.
              </p>
            </div>

            <div className={st.track}>
              <ol className={st.stops}>
                {judgePath.map((stop, i) => {
                  const group = GROUPS[i];
                  return (
                    <li
                      key={stop.step}
                      className={st.stop}
                      style={{ '--i': i } as React.CSSProperties}
                      data-group={group ? '' : undefined}
                      data-switch={GROUPS[i + 1] ? '' : undefined}
                    >
                      {group ? (
                        <span className={st.group} aria-hidden="true">
                          <span className={cn(st.av, group.tone)}>{group.initials}</span>
                          {group.name}
                        </span>
                      ) : null}
                      <span className={st.dot} aria-hidden="true">
                        {i + 1}
                      </span>
                      <div className={st.stopBody}>
                        <p className={st.stopName}>
                          {stop.step}
                          <span className={st.secs}>
                            <span aria-hidden="true">{stop.seconds}s</span>
                            <span className="sr-only">, {stop.seconds} seconds</span>
                          </span>
                        </p>
                        <p className={st.stopDetail}>{stop.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <p className={st.finish}>
                <span className={st.finishLabel}>Total</span>
                <span className="tabular">{clock(TOTAL_SECONDS)}</span>
              </p>
            </div>
          </div>
        </div>
      </CtaStage>
    </section>
  );
}
