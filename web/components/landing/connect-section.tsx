import {
  Beef,
  Bell,
  CookingPot,
  Heart,
  type LucideIcon,
  Salad,
  Sandwich,
  Soup,
  Sparkles,
  Star,
  Timer,
  Utensils,
} from 'lucide-react';
import type * as React from 'react';
import { CreatorImage } from '@/components/shared/creator-image';
import { MatchLabel } from '@/components/shared/match-label';
import type { CreatorAsset } from '@/lib/creator-assets';
import { cn } from '@/lib/utils';
import styles from './connect.module.css';
import { DEMO, type DemoCrewMember } from './demo-data';
import { RevealGroup, RevealItem } from './reveal';
import { SectionHeading } from './section-heading';

/**
 * New ways to connect (round 4 spec section 2, "Connect"): the creator tools, Challenges as its own block
 * (brief, entry grid, AI shortlist with reasons), then what fans get. Each tile holds a tiny picture of the
 * real UI. The pictures are decoration (aria-hidden): the tile's title and line carry the meaning. The only
 * motion is a short run of typing dots, which stops by itself. Names and numbers come from DEMO.
 */

const [, ines, maya] = DEMO.crew as [
  DemoCrewMember,
  DemoCrewMember,
  DemoCrewMember,
  DemoCrewMember,
];

type Tile = { id: string; title: string; line: string; snippet: React.ReactNode };

const CREATOR_TILES: Tile[] = [
  {
    id: 'voice',
    title: 'Reply in my voice',
    line: 'Drafts that sound like you.',
    snippet: (
      <>
        <p className={cn(styles.bubble, styles.bubbleIn)}>
          <b>{ines.firstName}</b> Walk Porto with me?
        </p>
        <p className={cn(styles.bubble, styles.bubbleOut)}>
          Yes! Send me the dates
          <span className={styles.dots}>
            <i />
            <i />
            <i />
          </span>
        </p>
        <span className={styles.pillBtn}>
          <Sparkles size={14} strokeWidth={1.75} />
          Draft
        </span>
      </>
    ),
  },
  {
    id: 'want',
    title: 'What fans want',
    line: 'Repeated asks become ideas.',
    snippet: (
      <>
        <p className={styles.snipLabel}>
          <Sparkles size={13} strokeWidth={1.75} />
          Content ideas
        </p>
        <p className={styles.wantRow}>
          <span className={styles.wantName}>Porto on $60 a day</span>
          <b className="tabular">64 asks</b>
        </p>
        <span className={styles.bar}>
          <span style={{ width: '88%' }} />
        </span>
        <p className={styles.wantRow}>
          <span className={styles.wantName}>A film-photo walk in Lisbon</span>
          <b className="tabular">41 asks</b>
        </p>
        <span className={styles.bar}>
          <span style={{ width: '62%' }} />
        </span>
        <span className={styles.pillBtn}>Make it</span>
      </>
    ),
  },
];

const FAN_TILES: Tile[] = [
  {
    id: 'loved',
    title: 'A heart from you',
    line: 'Heart a post you love.',
    snippet: (
      <>
        <p className={styles.snipTitle}>{DEMO.idea.title}</p>
        <p className={styles.snipMeta}>
          {DEMO.idea.author} · {DEMO.idea.community}
        </p>
        <span className={styles.loved}>
          <Heart size={14} strokeWidth={2} fill="currentColor" />
          Loved by {DEMO.creator.firstName}
        </span>
      </>
    ),
  },
  {
    id: 'made-it',
    title: 'Your idea made it',
    line: 'Featured crews get credited.',
    snippet: (
      <>
        <p className={styles.notice}>
          <span className={styles.noticeIcon}>
            <Bell size={14} strokeWidth={1.75} />
          </span>
          <span>
            <b>{DEMO.idea.title}</b> was featured
          </span>
        </p>
        <ul className={styles.credits}>
          {DEMO.crew.map((member) => (
            <li key={member.name}>
              <span>{member.role}</span> {member.firstName}
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: 'spotlight',
    title: 'Fan spotlight',
    line: 'Rising fans get a shout-out.',
    snippet: (
      <>
        <p className={styles.snipMeta}>
          <Star size={13} strokeWidth={1.75} /> Fans of the week
        </p>
        <p className={styles.shout}>
          <span className={styles.face}>
            <CreatorImage name={maya.avatar} alt="" fill sizes="28px" />
          </span>
          <span>
            “{maya.firstName} shot Lisbon at golden hour, with exactly where to stand for each
            photo.”
          </span>
        </p>
      </>
    ),
  },
];

function TileGrid({ tiles, columns }: { tiles: Tile[]; columns: 2 | 3 }) {
  return (
    <RevealGroup as="ul" className={cn(styles.grid, columns === 2 && styles.gridTwo)}>
      {tiles.map((tile) => (
        <RevealItem as="li" key={tile.id} className={cn('glass', styles.tile)}>
          <h4 className={styles.tileTitle}>{tile.title}</h4>
          <p className={styles.tileLine}>{tile.line}</p>
          <div className={styles.snippet} aria-hidden="true">
            {tile.snippet}
          </div>
        </RevealItem>
      ))}
    </RevealGroup>
  );
}

/* ---------- Challenges: its own block ---------- */

/** Mirrors the seeded open challenge in Food Finds (api seed FOOD_CHALLENGE): six entries, a $10 cap. */
const FOOD_ROOM = DEMO.rooms.find((room) => room.slug === 'food-finds')?.name ?? 'Food Finds';

const CHALLENGE = {
  title: 'Best $10 meal in your city',
  body: 'Where is it, and what did it cost?',
  daysLeft: 5,
} as const;

type Entry = {
  title: string;
  price: string;
  face: CreatorAsset;
  Icon: LucideIcon;
  tint: 'peach' | 'lilac' | 'sky' | 'mint';
};

const ENTRIES: Entry[] = [
  { title: 'Tacos, Austin', price: '$9.75', face: 'fan-1', Icon: Beef, tint: 'peach' },
  { title: 'Pho, Houston', price: '$9.50', face: 'fan-2', Icon: Soup, tint: 'sky' },
  {
    title: 'Plate lunch, Honolulu',
    price: '$10',
    face: 'fan-3',
    Icon: Utensils,
    tint: 'lilac',
  },
  { title: 'Jollof rice, Atlanta', price: '$8', face: 'fan-4', Icon: CookingPot, tint: 'mint' },
  {
    title: 'Noodles, Flushing',
    price: '$8.50',
    face: 'fan-5',
    Icon: Salad,
    tint: 'peach',
  },
  {
    title: 'Comida corrida, CDMX',
    price: '$5',
    face: 'fan-6',
    Icon: Sandwich,
    tint: 'sky',
  },
];

/** The AI's top three: entry index, match score (shown as words) and the reason it gives. */
const SHORTLIST: { entry: number; score: number; why: string }[] = [
  {
    entry: 4,
    score: 91,
    why: 'Names the price, place and best hour.',
  },
  {
    entry: 3,
    score: 86,
    why: 'The owner’s story is the “why”.',
  },
  {
    entry: 5,
    score: 72,
    why: 'Cheapest of six, easy directions.',
  },
];

function ChallengeBlock() {
  return (
    <RevealGroup as="div" className={styles.challenge}>
      <RevealItem as="div" className={cn('glass', styles.challengePanel)}>
        <div className={styles.challengeHead}>
          <h3 id="connect-challenges" className={styles.challengeTitle}>
            Challenges
          </h3>
          <p className={styles.challengeLine}>Fans enter, the AI shortlists three, you pick.</p>
        </div>

        <div className={styles.challengeBody} aria-hidden="true">
          <div className={styles.step}>
            <p className={styles.stepLabel}>
              <span>1</span> Your brief
            </p>
            <div className={cn(styles.snippet, styles.brief)}>
              <p className={styles.snipRow}>
                <span className={styles.chip}>{FOOD_ROOM}</span>
                <span className={styles.chip}>
                  <Timer size={13} strokeWidth={1.75} />
                  {CHALLENGE.daysLeft} days left
                </span>
              </p>
              <p className={styles.briefTitle}>{CHALLENGE.title}</p>
              <p className={styles.briefBody}>{CHALLENGE.body}</p>
              <span className={styles.pillBtn}>
                <Sparkles size={14} strokeWidth={1.75} />
                Get the shortlist
              </span>
            </div>
          </div>

          <div className={styles.step}>
            <p className={styles.stepLabel}>
              <span>2</span> Fans enter
            </p>
            <ul className={cn(styles.snippet, styles.entries)}>
              {ENTRIES.map(({ title, price, face, Icon, tint }) => (
                <li key={title} className={cn(styles.entry, styles[`tint_${tint}`])}>
                  <span className={styles.entryTop}>
                    <Icon size={16} strokeWidth={1.75} />
                    <span className={styles.faceSm}>
                      <CreatorImage name={face} alt="" fill sizes="24px" />
                    </span>
                  </span>
                  <span className={styles.entryTitle}>{title}</span>
                  <b className={cn('tabular', styles.entryPrice)}>{price}</b>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.step}>
            <p className={styles.stepLabel}>
              <span>3</span> AI shortlist
            </p>
            <ol className={cn(styles.snippet, styles.picks)}>
              {SHORTLIST.map(({ entry, score, why }, index) => {
                const picked = ENTRIES[entry];
                if (!picked) return null;
                return (
                  <li key={picked.title} className={styles.pick}>
                    <span className={styles.rank}>{index + 1}</span>
                    <span className={styles.pickBody}>
                      <span className={styles.pickTop}>
                        <b>{picked.title}</b>
                        <MatchLabel score={score} />
                      </span>
                      <span className={styles.why}>
                        <b>Why:</b> {why}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </RevealItem>
    </RevealGroup>
  );
}

export function ConnectSection() {
  return (
    <section id="connect" aria-labelledby="connect-title" className={styles.section}>
      <div className={styles.inner}>
        <SectionHeading
          id="connect-title"
          eyebrow="New ways to connect"
          title="Closer to your fans, in small moments."
          lead="Your AI twin drafts. You decide."
        />
        <p className={styles.demoNote}>Demo data: all made up.</p>

        <h3 className={styles.groupLabel}>For you</h3>
        <TileGrid tiles={CREATOR_TILES} columns={2} />

        <ChallengeBlock />

        <h3 className={styles.groupLabel}>For fans</h3>
        <TileGrid tiles={FAN_TILES} columns={3} />
      </div>
    </section>
  );
}
