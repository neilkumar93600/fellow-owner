'use client';

import { ArrowRight, Star } from 'lucide-react';
import { useId, useState } from 'react';
import {
  normalizeUsernameInput,
  type UsernameStatus,
  useUsernameStatus,
} from '@/components/auth/username-field';
import { CommunityGrid } from '@/components/bio/community-grid';
import { CreatorHeader } from '@/components/bio/creator-header';
import { DecisionCard } from '@/components/dashboard/today/decision-card';
import { AvatarStack } from '@/components/shared/avatar-initials';
import { CreatorImage } from '@/components/shared/creator-image';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { DEMO } from './demo-data';
import { BrowserFrame, PhoneFrame } from './device-frames';
import styles from './hero.module.css';
import { HeroLayer, HeroMotion } from './hero-chips';
import {
  CALLOUTS,
  CHIPS,
  CREDIT_CHIP,
  HERO_ROOMS,
  HERO_URL,
  LIVE_CREW,
  LIVE_DECISION,
  LIVE_SPACE,
  MIRA_CHIP,
  pct,
  STAGE,
} from './hero-product-data';

const noop = () => {};
const at = ([x, y]: readonly [number, number]) => ({ left: pct(x, STAGE.w), top: pct(y, STAGE.h) });

/** An elbow from the label to the target: across first, then up or down. */
function leader(from: readonly [number, number], to: readonly [number, number]) {
  return `M${from[0]} ${from[1]} V${to[1]} H${to[0]}`;
}

/**
 * The product stage (spec §4b): the creator's Today in a tilted browser with a real DecisionCard, the
 * fan's /mira bio in a phone, three leader-line callouts and the demo-creator chip. Decorative: inert and
 * aria-hidden, so none of the real components' buttons are tab stops. On phones only the phone shows.
 */
export function HeroStage() {
  return (
    <HeroMotion>
      <div className={styles.stage} inert aria-hidden="true">
        <HeroLayer depth={-10} order={0} className={styles.browser}>
          <BrowserFrame url={HERO_URL} tilt={-2} designWidth={760} scale={0.71}>
            <div className="flex flex-col gap-5 p-7">
              <div>
                <p className="font-display text-[2.5rem] leading-none text-ink">
                  Good morning, {DEMO.creator.firstName}
                </p>
                <p className="mt-2 text-body text-ink-soft">5 things need you</p>
              </div>
              <DecisionCard
                item={LIVE_DECISION}
                featureHref="#"
                loved={false}
                canLove
                onFeature={noop}
                onReply={noop}
                onLove={noop}
                onLater={noop}
              />
            </div>
          </BrowserFrame>
        </HeroLayer>

        <HeroLayer depth={8} order={1} className={styles.phone}>
          <PhoneFrame designWidth={340} scale={0.62}>
            {/* Scrolled past the cover, as a fan would be: the name, then the rooms. */}
            <div className="-mt-[236px] flex flex-col gap-6 pb-6 @container">
              <CreatorHeader space={LIVE_SPACE} cta={{ href: '#', label: 'Join a room' }} />
              <div className="px-4">
                <CommunityGrid handle={LIVE_SPACE.handle} communities={HERO_ROOMS} joinedIds={[]} />
              </div>
            </div>
          </PhoneFrame>
        </HeroLayer>

        <svg
          className={styles.leaders}
          viewBox={`0 0 ${STAGE.w} ${STAGE.h}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {CALLOUTS.map((callout, index) => (
            <g key={callout.id} className={styles.leader}>
              <path
                d={leader(callout.at, callout.to)}
                pathLength={1}
                vectorEffect="non-scaling-stroke"
                style={{ animationDelay: `${1.05 + index * 0.14}s` }}
              />
              <circle
                cx={callout.to[0]}
                cy={callout.to[1]}
                r={3.5}
                style={{ animationDelay: `${1.5 + index * 0.14}s` }}
              />
            </g>
          ))}
        </svg>

        <HeroLayer depth={22} order={3} className={styles.anchor} style={at(CHIPS.crew)}>
          <span className={cn('glass-chip', styles.chipPill, styles.chipOnly)}>
            <AvatarStack people={LIVE_CREW} />
          </span>
        </HeroLayer>

        <HeroLayer depth={-16} order={4} className={styles.anchor} style={at(CHIPS.credit)}>
          <span className={cn('glass-chip', styles.chipPill)}>
            <span className={cn(styles.chipIcon, 'bg-ink text-white')}>
              <Star size={13} strokeWidth={2} fill="currentColor" />
            </span>
            {CREDIT_CHIP.title}
            <span className="text-ink-soft">· {CREDIT_CHIP.by}</span>
          </span>
        </HeroLayer>

        {CALLOUTS.map((callout, index) => (
          <HeroLayer
            key={callout.id}
            depth={index % 2 ? 14 : -14}
            order={5 + index}
            className={cn(styles.anchor, styles.callout)}
            style={at(callout.at)}
          >
            <span className={cn('glass-chip', styles.calloutLabel)}>{callout.label}</span>
          </HeroLayer>
        ))}

        <HeroLayer depth={-12} order={2} className={styles.miraAnchor}>
          <span className={cn('glass-chip', styles.chipPill, styles.miraChip)}>
            <span className={styles.miraAvatar}>
              <CreatorImage name="mira-portrait" alt="" fill sizes="28px" className="object-top" />
            </span>
            {MIRA_CHIP}
          </span>
        </HeroLayer>
      </div>
    </HeroMotion>
  );
}

function statusText(status: UsernameStatus, suggestions: string[]): string {
  switch (status.state) {
    case 'idle':
      return 'Pick the link fans will use. You can leave it empty and choose later.';
    case 'invalid':
      return status.message;
    case 'checking':
      return `Checking ${status.username}…`;
    case 'available':
      return `fellowowners.app/${status.username} is free.`;
    case 'taken':
      return suggestions.length
        ? `Taken: try ${suggestions.join(', ')}.`
        : 'That link is taken. Try another.';
    case 'unavailable':
      return 'Could not check right now. You can still continue.';
  }
}

/**
 * The hero's one control (owner rule: one button): a plain GET form to /start with the handle. /start
 * picks the next step on the server and passes a valid handle on to pre-fill sign-up; an empty handle is
 * fine. Availability is checked live as a hint only (debounced, cached, polite).
 */
export function HeroClaim() {
  const id = useId();
  const [handle, setHandle] = useState('');
  const { status, suggestions } = useUsernameStatus(handle);
  const text = statusText(status, suggestions);
  const tone =
    status.state === 'available'
      ? 'ok'
      : status.state === 'taken' || status.state === 'invalid'
        ? 'bad'
        : 'idle';

  return (
    <form action={routes.start()} method="get" className={cn('glass-strong', styles.claim)}>
      <label htmlFor={`${id}-handle`} className={styles.claimLabel}>
        Claim your link
      </label>
      <div className={styles.claimRow}>
        <div className={styles.claimField}>
          <span className={styles.claimPrefix} aria-hidden="true">
            fellowowners.app/
          </span>
          <input
            id={`${id}-handle`}
            name="handle"
            value={handle}
            onChange={(event) => setHandle(normalizeUsernameInput(event.target.value))}
            placeholder="yourname"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            maxLength={30}
            aria-describedby={`${id}-status`}
            className={styles.claimInput}
          />
        </div>
        <RainbowButton type="submit" size="lg" data-hero-cta className={styles.claimButton}>
          Get started
          <ArrowRight aria-hidden="true" size={16} />
        </RainbowButton>
      </div>
      <p id={`${id}-status`} className={styles.claimStatus} data-tone={tone}>
        {text}
      </p>
      {/* Settled verdicts only, so "Checking…" never chases each keystroke. */}
      <p aria-live="polite" className="sr-only">
        {status.state === 'idle' || status.state === 'checking' ? '' : text}
      </p>
    </form>
  );
}
