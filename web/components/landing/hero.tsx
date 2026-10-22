import { getImageProps } from 'next/image';
import { preload } from 'react-dom';
import { cn } from '@/lib/utils';
import styles from './hero.module.css';
import { HeroIntro } from './hero-intro';
import { HeroClaim } from './hero-product';
import { TwinChat } from './twin-chat';

const DESKTOP = '(min-width: 1024px)';
const PHONE = '(max-width: 1023.98px)';
/** Phone variants: 384 is the image optimizer's nearest default to 390 (its widths are fixed in next.config). */
const PHONE_WIDTHS = [384, 640, 828];

/** The srcSet entries at these widths. */
function only(srcSet: string | undefined, widths: number[]) {
  return (srcSet ?? '')
    .split(', ')
    .filter((entry) => widths.some((w) => entry.endsWith(` ${w}w`)))
    .join(', ');
}

/**
 * Art direction: the wide coast from 1024px, the square crop below. The scenery is the LCP image, so the
 * one <img> the browser picks is eager, high priority and preloaded, and the intro never hides it.
 * Phones get 384/640/828 only: a 1200w+ file is wasted bytes behind the parchment wash. A sizes without
 * vw makes getImageProps list every configured width; the element itself says 100vw.
 */
const scenery = (() => {
  const desktop = getImageProps({
    alt: '',
    sizes: '100vw',
    src: '/creator/hero-scenery.webp',
    width: 2400,
    height: 1600,
  }).props;
  const mobile = getImageProps({
    alt: '',
    sizes: '384px',
    src: '/creator/hero-scenery-mobile.webp',
    width: 1200,
    height: 1259,
  }).props;
  const mobileSrcSet = only(mobile.srcSet, PHONE_WIDTHS);
  const mobileSrc = mobileSrcSet.split(', ').at(-1)?.split(' ')[0] ?? mobile.src;
  return {
    desktop: { src: desktop.src, srcSet: desktop.srcSet ?? '' },
    mobile: { ...mobile, src: mobileSrc, srcSet: mobileSrcSet, sizes: '100vw' },
  };
})();

/**
 * Hero (Parchment Frost): a coastal landscape in one rounded frame, washed with parchment on the left so
 * the serif h1 reads, and fading into the canvas at the bottom. Left: eyebrow, h1, one line, the claim
 * form (the one Lake Blue button). Right: "Ask your AI twin", an example chat with three question tabs.
 * Phones (below 768px): words and claim only; the chat is hidden. Copy is server-rendered and complete without
 * JavaScript.
 */
export function Hero() {
  // Preload hints in <head>, one per art-direction branch, so the image request starts with the HTML.
  preload(scenery.mobile.src, {
    as: 'image',
    imageSrcSet: scenery.mobile.srcSet,
    imageSizes: '100vw',
    fetchPriority: 'high',
    media: PHONE,
  });
  preload(scenery.desktop.src, {
    as: 'image',
    imageSrcSet: scenery.desktop.srcSet,
    imageSizes: '100vw',
    fetchPriority: 'high',
    media: DESKTOP,
  });

  return (
    <>
      <HeroIntro />
      <section id="hero" aria-labelledby="hero-title" className={styles.hero}>
        <div className={styles.frame}>
          {/* Inline, because CSS modules hash view-transition-name. Morphs into the auth panel on /start. */}
          <div
            className={styles.scenery}
            style={{ viewTransitionName: 'fo-scenery' }}
            aria-hidden="true"
          >
            <picture>
              <source media={DESKTOP} srcSet={scenery.desktop.srcSet} sizes="100vw" />
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
