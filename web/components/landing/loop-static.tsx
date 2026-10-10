import { Check, Heart, Play } from 'lucide-react';
import { CreatorImage } from '@/components/shared/creator-image';
import { COMMUNITY_ICON, cardTint, TINT_STYLES } from '@/components/shared/tint';
import type { CreatorAsset } from '@/lib/creator-assets';
import { cn } from '@/lib/utils';
import { BrowserFrame } from './device-frames';
import styles from './loop.module.css';
import {
  type StoryStepId,
  storyCommunities,
  storyCrew,
  storyDisclosure,
  storyFeatured,
  storyFollowers,
  storyIdea,
  storySteps,
} from './loop-data';
import { LIVE_URLS } from './loop-live-data';

const peak = Math.max(...storyFeatured.clicksByDay);

function Avatar({ name, className }: { name: CreatorAsset; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative block flex-none overflow-hidden rounded-full ring-2 ring-white',
        className,
      )}
    >
      <CreatorImage name={name} alt="" fill sizes="40px" />
    </span>
  );
}

/**
 * The small piece of product each step shows: the follower split, the six rooms, the fan's idea, the
 * crew and the featured guide. Shared by the pinned scene and the static stack, so both say the same thing.
 */
export function StoryVisual({ id }: { id: StoryStepId }) {
  switch (id) {
    case 'followers':
      return (
        <div>
          <p className="tabular font-display text-[4rem] leading-none text-ink">
            {storyFollowers.total}
          </p>
          <div aria-hidden="true" className={styles.split}>
            {storyFollowers.platforms.map((platform, index) => (
              <span key={platform.name} data-tone={index} style={{ flexGrow: platform.share }} />
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-small text-ink-soft">
            {storyFollowers.platforms.map((platform, index) => (
              <li key={platform.name} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={styles.dot} data-tone={index} />
                {platform.name}{' '}
                <span className="tabular font-medium text-ink">{platform.count}</span>
              </li>
            ))}
          </ul>
        </div>
      );

    case 'communities':
      return (
        <ul className="grid grid-cols-2 gap-2">
          {storyCommunities.map((community) => {
            const Icon = COMMUNITY_ICON[community.icon];
            return (
              <li
                key={community.name}
                className="flex min-w-0 items-center gap-2.5 rounded-2xl bg-white/70 p-2"
              >
                <span
                  className={cn(
                    'grid size-8 flex-none place-items-center rounded-xl text-ink',
                    TINT_STYLES[cardTint(community.tint)].tile,
                  )}
                >
                  <Icon aria-hidden="true" size={16} strokeWidth={1.5} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-caption text-ink">{community.name}</span>
                  <span className="tabular block text-caption font-normal text-ink-soft">
                    {community.fans} fans
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      );

    case 'idea':
      return (
        <div className="rounded-[20px] bg-white/75 p-4">
          <div className="flex items-center gap-2.5">
            <Avatar name={storyIdea.avatar} className="size-8" />
            <span className="text-small text-ink-soft">
              <span className="font-medium text-ink">{storyIdea.author}</span> in{' '}
              {storyIdea.community}
            </span>
          </div>
          <p className="mt-3 font-display text-[1.875rem] leading-[1.05] text-ink">
            {storyIdea.title}
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {storyIdea.prices.map((price) => (
              <li
                key={price}
                className="tabular rounded-full bg-aurora-peach px-2.5 py-1 text-caption text-ink"
              >
                {price}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-small text-ink-soft">
            <span className="tabular font-medium text-ink">{storyIdea.use}</span> “I’d use this” ·{' '}
            <span className="tabular font-medium text-ink">{storyIdea.join}</span> “Count me in”
          </p>
        </div>
      );

    case 'crew':
      return (
        <ul className="flex flex-col gap-1.5">
          {storyCrew.map((member) => (
            <li
              key={member.role}
              className="flex items-center gap-3 rounded-2xl bg-white/70 py-2 pr-3 pl-2"
            >
              <Avatar name={member.avatar} className="size-9" />
              <span className="min-w-0 flex-1">
                <span className="block text-small font-medium text-ink">{member.name}</span>
                <span className="block text-caption font-normal text-ink-soft">{member.role}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-caption text-success">
                <Check aria-hidden="true" size={14} strokeWidth={2} />
                Filled
              </span>
            </li>
          ))}
        </ul>
      );

    case 'featured':
      return (
        <div className="flex flex-col gap-3">
          <div className="relative aspect-[16/9] overflow-hidden rounded-[20px]">
            <CreatorImage
              name="vlog-lisbon"
              alt="Still from the featured Lisbon vlog"
              fill
              sizes="(min-width: 768px) 400px, 90vw"
            />
            <span className={styles.play} aria-hidden="true">
              <Play size={18} strokeWidth={1.5} fill="currentColor" />
            </span>
            <span className="glass-chip absolute top-2.5 left-2.5 inline-flex h-7 items-center gap-1.5 bg-white/85 px-3 text-caption text-ink">
              <Heart aria-hidden="true" size={13} strokeWidth={2} className="text-coral" />
              Featured in Sunday’s vlog
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-caption font-normal text-ink-soft">Made by</p>
              <div aria-hidden="true" className="mt-1 flex -space-x-2">
                {storyCrew.map((member) => (
                  <Avatar key={member.role} name={member.avatar} className="size-8" />
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="tabular text-[1.75rem] leading-none font-semibold tracking-[-0.02em] text-ink">
                {storyFeatured.clicks.toLocaleString('en-US')}
              </p>
              <p className="mt-1 text-caption font-normal text-ink-soft">clicks since featured</p>
            </div>
          </div>
          <div aria-hidden="true" className={styles.bars}>
            {storyFeatured.clicksByDay.map((value, index) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: a fixed daily series.
                key={index}
                style={{ height: `${Math.round((value / peak) * 100)}%` }}
              />
            ))}
          </div>
          <p className="text-caption font-normal text-ink-soft">
            {storyCrew.map((member) => `${member.name.split(' ')[0]} (${member.role})`).join(', ')}
          </p>
        </div>
      );
  }
}

/**
 * How it works without motion: the five steps stacked, each with its copy and the product screen it
 * happens on. Shown for prefers-reduced-motion (CSS) and without JavaScript (the noscript style in
 * loop-section.tsx).
 */
export function LoopStatic() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-20 pb-24 md:px-8 md:pt-28 md:pb-32">
      <div className="max-w-[40rem]">
        <p className="glass-chip inline-flex h-8 items-center px-3.5 text-caption text-ink">
          Example: a travel creator (demo)
        </p>
        <h2 className="mt-5 font-display text-[2.75rem] leading-[1.02] text-ink md:text-[4rem]">
          How it works: <em>from follower to featured</em>
        </h2>
      </div>

      <ol className="mt-12 flex flex-col gap-4 md:mt-16 md:gap-6">
        {storySteps.map((step, index) => (
          <li
            key={step.id}
            className="glass-strong grid items-center gap-5 p-2 pb-6 md:grid-cols-12 md:gap-8 md:p-3"
          >
            <BrowserFrame
              url={LIVE_URLS[index] ?? LIVE_URLS[0]}
              className={cn('md:col-span-6', index % 2 === 1 && 'md:order-2')}
              screenClassName="grid aspect-auto min-h-72 place-items-center bg-[linear-gradient(135deg,#fff4ec,#f4effc_55%,#eef6fc)] p-5 md:p-8"
            >
              <div className="w-full max-w-[420px]">
                <StoryVisual id={step.id} />
              </div>
            </BrowserFrame>
            <div className={cn('px-4 md:col-span-6 md:px-6', index % 2 === 1 && 'md:order-1')}>
              <p className="text-caption text-ink-soft">
                {String(index + 1).padStart(2, '0')} / 05 · {step.name}
              </p>
              <h3 className="mt-2 font-display text-[2.25rem] leading-[1.05] text-ink">
                {step.title}
              </h3>
              <p className="mt-3 max-w-[38ch] text-body text-ink-soft">{step.line}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="mt-4 px-2 text-small text-ink-soft">{storyDisclosure}</p>
    </div>
  );
}
