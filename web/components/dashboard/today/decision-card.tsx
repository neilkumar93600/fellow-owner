'use client';

import { Clock, Heart, MessageCircleReply, Sparkles } from 'lucide-react';
import { useIsPresent } from 'motion/react';
import Link from 'next/link';
import type * as React from 'react';
import { useId } from 'react';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { MatchLabel } from '@/components/shared/match-label';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import type { DecisionItem } from './decision-items';

const KIND_LABEL: Record<DecisionItem['kind'], string> = {
  pitch: 'Sent you an idea',
  post: 'Posted an idea',
  fan: 'Rising fan',
};

export interface DecisionCardProps {
  item: DecisionItem;
  /** Where Feature goes; null hides it (pitches). */
  featureHref: string | null;
  loved: boolean;
  /** Only ideas can be loved ("Loved by Mira" lives on a post); other cards hide Love. */
  canLove: boolean;
  onFeature: (item: DecisionItem) => void;
  onReply: (item: DecisionItem) => void;
  onLove: (item: DecisionItem) => void;
  onLater: (item: DecisionItem) => void;
  /** Called with the card once it mounts (the stack focuses it after a keyboard move). */
  cardRef?: React.Ref<HTMLElement>;
}

/** A plain left click; a modified click opens a new tab and leaves the card where it is. */
const plainClick = (event: React.MouseEvent) =>
  !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0);

/**
 * DESIGN.md Decision card: one frosted glass-strong card (28px) with the fan's face, name and room, the
 * idea in their words, the AI's "Why", the match label, and four actions. The one coral action is
 * Feature when the item can be featured, else Reply. The card itself is the stack's only tab stop
 * (roving tabindex); while it animates out it is inert, so focus never lands on a leaving card.
 */
export function DecisionCard({
  item,
  featureHref,
  loved,
  canLove,
  onFeature,
  onReply,
  onLove,
  onLater,
  cardRef,
}: DecisionCardProps) {
  const id = useId();
  const isPresent = useIsPresent();
  const replyPrimary = featureHref === null;

  return (
    <article
      ref={cardRef}
      tabIndex={isPresent ? 0 : -1}
      inert={!isPresent}
      aria-hidden={isPresent ? undefined : true}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-who`}
      className="glass-strong flex max-h-[calc(100svh-21rem)] min-h-[320px] flex-col rounded-[28px] p-5 sm:max-h-none sm:min-h-[360px] sm:p-7"
    >
      <div className="flex shrink-0 flex-wrap items-start gap-3">
        <AvatarInitials name={item.name} image={item.avatarUrl} size={48} />
        <div id={`${id}-who`} className="min-w-[10rem] flex-1">
          <p className="truncate text-label text-ink">{item.name}</p>
          <p className="truncate text-small text-ink-soft">
            {KIND_LABEL[item.kind]} · {item.context}
          </p>
        </div>
        <MatchLabel score={item.score} />
      </div>

      {/* On a phone the words give way (the box clips them) so the actions below always stay on screen. */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <h3
          id={`${id}-title`}
          className="mt-4 font-display text-[28px] leading-[1.1] text-ink sm:mt-5 sm:text-[32px]"
        >
          {item.title}
        </h3>
        {item.quote && item.quote !== item.title ? (
          <blockquote className="mt-3 line-clamp-3 text-body text-ink sm:line-clamp-4">
            &ldquo;{item.quote}&rdquo;
          </blockquote>
        ) : null}
        {item.reason ? (
          <p className="mt-3 text-small text-ink-soft">
            <span className="font-medium text-ink">Why:</span> {item.reason}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 pt-4 sm:pt-6">
        {featureHref ? (
          <Link
            href={featureHref}
            onClick={(event) => {
              if (plainClick(event)) onFeature(item);
            }}
            className={buttonVariants({ variant: 'primary', size: 'md' })}
          >
            <Sparkles aria-hidden className="size-4" />
            Feature
          </Link>
        ) : null}
        <Link
          href={item.href}
          aria-keyshortcuts="R"
          onClick={(event) => {
            if (!plainClick(event)) return;
            // A fan message is answered here; any other card opens in its own list.
            if (item.kind === 'pitch') event.preventDefault();
            onReply(item);
          }}
          className={buttonVariants({
            variant: replyPrimary ? 'primary' : 'secondary',
            size: 'md',
          })}
        >
          <MessageCircleReply aria-hidden className="size-4" />
          Reply in my voice
        </Link>
        {canLove ? (
          <Button
            variant="secondary"
            size="md"
            aria-pressed={loved}
            aria-keyshortcuts="L"
            onClick={() => onLove(item)}
            icon={<Heart aria-hidden className={cn(loved && 'fill-sunset text-sunset')} />}
          >
            {loved ? 'Loved' : 'Love'}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="md"
          surface="glass"
          icon={<Clock aria-hidden />}
          onClick={() => onLater(item)}
          className="text-ink-soft"
        >
          Later
        </Button>
      </div>
    </article>
  );
}
