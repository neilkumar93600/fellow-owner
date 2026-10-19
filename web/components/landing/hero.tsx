import { getImageProps } from 'next/image';
import { cn } from '@/lib/utils';
import styles from './hero.module.css';
import { HeroIntro } from './hero-intro';
import { HeroClaim } from './hero-product';
import { TwinChat } from './twin-chat';

/** Art direction: the wide coast from 1024px, the square crop below. `priority` is deprecated in Next 16, so
 * the one <img> the browser picks is eager with a high fetch priority. */
const scenery = (() => {
  const common = { alt: '', sizes: '100vw' };
  const desktop = getImageProps({
    ...common,
    src: '/creator/hero-scenery.webp',
    width: 2400,
    height: 1600,
  });
  const mobile = getImageProps({
    ...common,
    src: '/creator/hero-scenery-mobile.webp',
    width: 1200,
    height: 1259,
  });
  return { desktop: desktop.props.srcSet, mobile: mobile.props };
})();

/**
 * Hero (Parchment Frost): a coastal landscape in one rounded frame, washed with parchment on the left so
 * the serif h1 reads, and fading into the canvas at the bottom. Left: eyebrow, h1, one line, the claim
 * form (the one Lake Blue button). Right: "Ask your AI twin", a demo chat with three question tabs.
 * Phones: words and claim first, then the chat full width. Copy is server-rendered and complete without
 * JavaScript.
 */
export function Hero() {
  return (
    <>
      <HeroIntro />
      <section id="hero" aria-labelledby="hero-title" className={styles.hero}>
        <div className={styles.frame}>
          <div className={styles.scenery} aria-hidden="true">
            <picture>
              <source media="(min-width: 1024px)" srcSet={scenery.desktop} />
              <img
                {...scenery.mobile}
                alt=""
                fetchPriority="high"
                loading="eager"
                className={styles.sceneryImg}
              />
            </picture>
            <span className={styles.wash} />
          </div>

          <div className={styles.copy}>
            <p className={cn('eyebrow', styles.pill)}>
              <span className={styles.pillDot} aria-hidden="true" />
              Fan rooms + your AI twin
            </p>

            <h1 id="hero-title" className={cn('font-display', styles.title)}>
              <span className={styles.line}>
                <span className={cn(styles.lineInner, styles.line1)}>
                  Your fans have great ideas.
                </span>
              </span>{' '}
              <span className={styles.line}>
                <span className={cn(styles.lineInner, styles.line2)}>
                  Finally, a way to <em className={styles.accent}>hear them.</em>
                </span>
              </span>
            </h1>

            <p className={cn('text-lead', styles.sub)}>
              One link in your bio gathers fans into rooms. Your AI twin reads every room and
              answers you with the few ideas and people worth your time.
            </p>

            <div className={styles.claimWrap}>
              <HeroClaim />
            </div>
          </div>

          <TwinChat />
        </div>
      </section>
    </>
  );
}
