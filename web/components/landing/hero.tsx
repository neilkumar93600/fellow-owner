import { ArrowUpRight } from 'lucide-react';
import { getImageProps } from 'next/image';
import { AvatarStack } from '@/components/shared/avatar-initials';
import { cn } from '@/lib/utils';
import styles from './hero.module.css';
import { HeroIntro } from './hero-intro';
import { HeroClaim, HeroStage } from './hero-product';
import { HERO_CARD, HERO_STATS, LIVE_CREW } from './hero-product-data';

/** Scenery only (no people): desktop fills the frame, phones get a right-side crop behind the phone. */
function sceneryProps() {
  const common = { alt: '', sizes: '(min-width: 1024px) 100vw, 92vw', quality: 75 };
  const desktop = getImageProps({
    ...common,
    src: '/creator/hero-scenery.webp',
    width: 2400,
    height: 1600,
  }).props;
  const mobile = getImageProps({
    ...common,
    src: '/creator/hero-scenery-mobile.webp',
    width: 1200,
    height: 1259,
  }).props;
  return { desktop: desktop.srcSet, mobile };
}

/**
 * Hero (spec §4b "Framed Golden Hour"): one rounded frame around a golden-hour landscape. On the left,
 * over a cream scrim: the page's only h1, the sub line, honest stats and the claim bar, the hero's one
 * control. On the right the product (hero-product.tsx), decorative and inert. Copy is server-rendered and
 * complete without JavaScript; the entrance, springs and drift are client enhancements.
 */
export function Hero() {
  const { desktop, mobile } = sceneryProps();
  return (
    <>
      <HeroIntro />
      <section id="hero" aria-labelledby="hero-title" className={styles.hero}>
        <div className={styles.frame}>
          <div className={styles.copy}>
            <p className={cn('glass-chip', styles.pill)}>
              <span className={styles.pillDot} aria-hidden="true" />
              The operating system for your fanbase
            </p>

            <h1 id="hero-title" className={cn('font-display', styles.title)}>
              <span className={styles.line}>
                <span className={cn(styles.lineInner, styles.line1)}>
                  Your fans have great ideas.
                </span>
              </span>{' '}
              <span className={styles.line}>
                <span className={cn(styles.lineInner, styles.line2)}>
                  Finally, a way to{' '}
                  <em className={styles.accent} data-text="hear them.">
                    hear them.
                  </em>
                </span>
              </span>
            </h1>

            <p className={cn('text-lead', styles.sub)}>
              One link in your bio gathers your followers into communities. AI finds the best ideas
              and people. You give them your spotlight.
            </p>
          </div>

          <div className={styles.claimWrap}>
            <HeroClaim />
          </div>

          <div className={styles.stageWrap}>
            <picture className={styles.photo} data-hero-last>
              <source media="(min-width: 1024px)" srcSet={desktop} />
              <img
                {...mobile}
                alt=""
                loading="eager"
                fetchPriority="high"
                className={styles.photoImg}
              />
            </picture>
            <HeroStage />
          </div>

          <ul className={styles.stats}>
            {HERO_STATS.map((stat) => (
              <li key={stat.strong}>
                {stat.before}
                <strong>{stat.strong}</strong>
                {stat.after}
              </li>
            ))}
          </ul>

          <div className={cn('glass', styles.card)}>
            <AvatarStack people={LIVE_CREW} />
            <p className={styles.cardText}>
              <span className={styles.cardKicker}>{HERO_CARD.kicker}</span>
              <span className={styles.cardLine}>{HERO_CARD.line}</span>
              <span className={styles.cardSub}>{HERO_CARD.sub}</span>
            </p>
            <span className={styles.cardArrow} aria-hidden="true">
              <ArrowUpRight size={18} strokeWidth={1.75} />
            </span>
          </div>

          <p className={styles.scroll} aria-hidden="true">
            <span className={styles.scrollMouse} />
            Scroll to explore
          </p>

          <div className={cn('grain', styles.grain)} aria-hidden="true" />
        </div>
      </section>
    </>
  );
}
