import { Code2, Link2 } from 'lucide-react';
import type { CSSProperties, RefObject } from 'react';
import { creator } from './demo-data';
import styles from './loop.module.css';
import { loopFeatured } from './loop-data';

const peak = Math.max(...loopFeatured.clicksByDay);

/**
 * The "Featured by Mira" card the loop lands on: the slab the clip lifts becomes the showcase page,
 * with its short link and a click count the scene counts up through `countRef`. Decorative (the Action
 * stage line says the same thing in text), so the scene renders it aria-hidden. Typeset in container
 * units, so it scales with whatever size the scene gives it. The bars grow with `--climb` (0 to 1), which
 * the scene sets alongside the count.
 */
export function LoopFeatured({ countRef }: { countRef?: RefObject<HTMLSpanElement | null> }) {
  const initials = creator.name
    .split(' ')
    .map((part) => part[0])
    .join('');
  return (
    <div className={styles.featured}>
      <div className={styles.featuredHead}>
        <span className={styles.featuredAvatar}>{initials}</span>
        <span className={styles.featuredWho}>
          <span className={styles.featuredBy}>Featured by {creator.firstName}</span>
          <span className={styles.featuredHandle}>@{creator.handle}</span>
        </span>
        <span className={styles.featuredDemo}>Demo</span>
      </div>

      <div className={styles.featuredBody}>
        <span className={styles.featuredChip}>
          <Code2 aria-hidden="true" strokeWidth={1.5} />
          {loopFeatured.community}
        </span>
        <span className={styles.featuredTitle}>{loopFeatured.title}</span>
        <span className={styles.featuredByline}>
          A team of {loopFeatured.team}, led by {loopFeatured.maker}
        </span>
      </div>

      <div className={styles.featuredTeam}>
        <span className={styles.featuredAvatars}>
          {loopFeatured.teamInitials.map((initials, index) => (
            <span key={initials} className={styles.featuredMember} data-tint={index % 4}>
              {initials}
            </span>
          ))}
        </span>
        <span className={styles.featuredSignals}>
          <span className={styles.featuredSignalsValue}>{loopFeatured.signals}</span> signals
        </span>
      </div>

      <div className={styles.featuredChart}>
        <span className={styles.featuredChartLabel}>Clicks, last 7 days</span>
        <span className={styles.featuredBars}>
          {loopFeatured.clicksByDay.map((value, index) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: a fixed seven-day series.
              key={index}
              className={styles.featuredBar}
              data-today={index === loopFeatured.clicksByDay.length - 1}
              style={
                {
                  '--h': `${Math.round((value / peak) * 100)}%`,
                  '--i': index,
                } as CSSProperties
              }
            />
          ))}
        </span>
      </div>

      <div className={styles.featuredFoot}>
        <span className={styles.featuredLink}>
          <Link2 aria-hidden="true" strokeWidth={1.5} />
          {loopFeatured.shortLink}
        </span>
        <span className={styles.featuredClicks}>
          <span ref={countRef} className={styles.featuredCount}>
            {loopFeatured.clicks.toLocaleString('en-US')}
          </span>
          <span className={styles.featuredCountLabel}>clicks</span>
        </span>
      </div>
    </div>
  );
}
