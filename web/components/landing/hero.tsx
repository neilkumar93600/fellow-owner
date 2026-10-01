import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DemoButton } from './demo-button';
import styles from './hero.module.css';
import { HeroField } from './hero-field';
import { HeroIntro } from './hero-intro';

/**
 * Immersive hero (landing brief v2, part 2): the page's only h1, on the reference shell with its radial blur,
 * over a canvas of follower spheres that gather into community clusters. Copy is server-rendered and complete
 * without JavaScript; the entrance, the canvas and the scroll hand-off are client enhancements.
 */
export function Hero() {
  return (
    <>
      <HeroIntro />
      <section id="hero" aria-labelledby="hero-title" className={styles.hero}>
        <div className={styles.stage}>
          <div className={styles.blurs} aria-hidden="true" />
          <HeroField />

          <div className={styles.content} data-hero-content>
            <a href="#demo" className={styles.pill} data-hero-measure>
              <span className={styles.pillChip}>Demo</span> <span>Meet Mira’s fanbase</span>
              <ArrowRight
                aria-hidden="true"
                size={16}
                strokeWidth={1.5}
                className={styles.pillArrow}
              />
            </a>

            <h1 id="hero-title" className={cn('text-hero', styles.title)}>
              <span className={styles.line} data-hero-measure>
                <span className={cn(styles.lineInner, styles.line1)}>Turn followers</span>
              </span>{' '}
              <span className={styles.line} data-hero-measure>
                <span className={cn(styles.lineInner, styles.line2)}>into fellow owners.</span>
              </span>
            </h1>

            <p className={cn('text-lead', styles.sub)} data-hero-measure>
              One link in your bio sorts your audience into communities, surfaces the ideas and
              people worth your time, and lets you back what they build.
            </p>

            <div className={styles.ctas} data-hero-measure>
              <DemoButton as="creator" className={cn(styles.cta, styles.cta1)} />
              <DemoButton as="fan" className={cn(styles.cta, styles.cta2)} />
              <Link
                href="/login?returnTo=/onboarding"
                className={cn(styles.textLink, styles.cta, styles.cta3)}
                data-hero-last
              >
                Start your space
                <ArrowRight
                  aria-hidden="true"
                  size={16}
                  strokeWidth={1.5}
                  className={styles.pillArrow}
                />
              </Link>
            </div>
          </div>

          <div className={styles.cue} aria-hidden="true" data-hero-cue>
            <span>Scroll</span>
            <span className={styles.cueTrack} />
          </div>
        </div>
      </section>
    </>
  );
}
