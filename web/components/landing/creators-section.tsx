import Image from 'next/image';
import { AvatarStack } from '@/components/shared/avatar-initials';
import { CREATOR_ASSETS, type CreatorAsset } from '@/lib/creator-assets';
import { cn } from '@/lib/utils';
import styles from './creators.module.css';
import { DemoButton } from './demo-button';
import { DEMO, showcase } from './demo-data';

/** Fare Pals, the one featured fan project (showcase[0]). */
const FEATURED = showcase[0]!;
/** Fare Pals' spotlight clicks in the seed (api/src/db/seed/data/promotions.json). */
const FARE_PALS_CLICKS = 94;
const FAN_FACES: CreatorAsset[] = ['fan-1', 'fan-2', 'fan-3', 'fan-4', 'fan-5'];
const THANKS = FEATURED.crew.map((name, index) => ({
  name,
  image: CREATOR_ASSETS[FAN_FACES[index % FAN_FACES.length]!].src,
}));

const PROMISES = [
  'Every pick shows why',
  'Fans are never scored in public',
  'Nothing posts without you',
] as const;

/** A photo that fills its positioned parent. Decorative: the words beside it carry the meaning. */
function Photo({ name, sizes }: { name: CreatorAsset; sizes: string }) {
  return (
    <Image src={CREATOR_ASSETS[name].src} alt="" fill sizes={sizes} className={styles.photo} />
  );
}

/**
 * For creators (landing task 14b): one glance at what a creator gets. A centred serif headline with an
 * inline product chip, one line, and a few real product cards tilted on grid paper. Server-rendered;
 * the float and the scroll parallax are CSS only and switch off under reduced motion.
 */
export function CreatorsSection() {
  return (
    <section id="creators" aria-labelledby="creators-title" className={styles.section}>
      <div className={styles.paper}>
        <div className={styles.stage}>
          <div className={styles.head}>
            <p className="eyebrow">For creators</p>
            <h2 id="creators-title" className={styles.title}>
              Your fans, sorted.{' '}
              <span className={styles.chip} aria-hidden="true">
                <Photo name="vlog-van-coast" sizes="200px" />
              </span>{' '}
              Your call.
            </h2>
            <p className={styles.lead}>
              Your AI twin briefs you in minutes and shows why behind every pick. Feature what fans
              build and credit every maker.
            </p>
          </div>

          <div className={styles.cards}>
            <div className={cn(styles.slot, styles.slotDecision)}>
              <article className={cn('glass', styles.card, styles.decision)}>
                <div className={styles.cover}>
                  <Photo name="vlog-lisbon" sizes="300px" />
                </div>
                <p className={styles.cardTitle}>{DEMO.idea.title}</p>
                <p className={styles.tag}>Strong match</p>
                <p className={styles.why}>
                  <span className={styles.whyLabel}>Why:</span> Matches “budget-honest travel”.{' '}
                  {DEMO.idea.use} fans would use it.
                </p>
              </article>
            </div>

            <div className={cn(styles.slot, styles.slotSpotlight)}>
              <article className={cn('glass', styles.card, styles.spotlight)}>
                <div className={styles.cover}>
                  <Photo name="vlog-hostel" sizes="320px" />
                  <span className={styles.featured}>Featured</span>
                </div>
                <p className={styles.cardTitle}>Fare Pals</p>
                <p className={styles.meta}>
                  {FARE_PALS_CLICKS} clicks · crew of {FEATURED.team}
                </p>
              </article>
            </div>

            <div className={cn(styles.slot, styles.slotThanks)}>
              <article className={cn('glass', styles.card, styles.thanks)}>
                <p className={styles.metaLabel}>Fans to thank</p>
                <AvatarStack people={THANKS} max={5} />
                <p className={styles.meta}>Credited by name</p>
              </article>
            </div>

            <div className={cn(styles.slot, styles.slotNote)}>
              <aside className={styles.note}>
                <p className={styles.metaLabel}>Why this pick</p>
                <p className={styles.noteText}>
                  Four roles filled. Every price dated and checked by a local.
                </p>
              </aside>
            </div>
          </div>

          <div className={styles.foot}>
            <ul className={styles.promises}>
              {PROMISES.map((promise) => (
                <li key={promise} className={cn('glass-chip', styles.promise)}>
                  {promise}
                </li>
              ))}
            </ul>
            <DemoButton as="creator">Try the creator demo</DemoButton>
            <p className={styles.demoLabel}>Demo data. Names are made up.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
