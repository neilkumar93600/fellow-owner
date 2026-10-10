'use client';

import { ChevronLeft, ChevronRight, PartyPopper } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type * as React from 'react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { Skeleton } from '@/components/ui/skeleton';
import { useInboxAction } from '@/hooks/queries/use-inbox';
import { routes } from '@/lib/routes';
import { toastError, toastSuccess } from '@/lib/toast';
import { DecisionCard } from './decision-card';
import { type DecisionItem, featureHref } from './decision-items';
import { ReplySheet } from './reply-sheet';
import { useLovePost } from './use-love-post';

const SPRING = { type: 'spring', stiffness: 380, damping: 34 } as const;

/** Exit direction: -1 leaves left (Later, next), 1 leaves right (Feature, previous). */
type Direction = -1 | 1;

/** Keys typed into a field are the field's, never the stack's. */
function isTyping(target: EventTarget): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest('input, textarea, select, [contenteditable]') !== null
  );
}

/**
 * DESIGN.md Decision stack (Today). One card at a time with the next one peeking 12px below at 96%
 * scale. Left and Right (or the chevrons) move through the stack, L loves the top card (ideas only; the
 * mutation is optimistic and rolls back on a failure), R opens its reply (a fan message opens the inline
 * reply sheet with "Draft in my voice"; any other card opens in its list). Later is session-local. Only the top card is a tab stop; after a move focus follows to the new top card, and the polite
 * "Card 2 of 5" line announces where you are. Later and Feature take the card off the stack (left and
 * right); once it is empty, "You're all caught up".
 */
export function DecisionStack({ items }: { items: DecisionItem[] }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const love = useLovePost();
  const inboxAction = useInboxAction();
  // Later (and Feature, and a sent reply) take a card off the stack for this visit only.
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set());
  // What the creator toggled this visit, over what the item came with (item.lovedAt).
  const [lovedNow, setLovedNow] = useState<ReadonlyMap<string, boolean>>(() => new Map());
  const [lovePending, setLovePending] = useState<ReadonlySet<string>>(() => new Set());
  const [replyItem, setReplyItem] = useState<DecisionItem | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<Direction>(-1);
  // The card (or the empty state) to focus once it mounts: set by moves, not by data refreshes.
  const focusTarget = useRef<string | null>(null);

  const visible = items.filter((item) => !done.has(item.id));
  const current = Math.max(0, Math.min(index, visible.length - 1));
  const top = visible[current];
  const hasPeek = current < visible.length - 1;

  const focusOnMount = (key: string) => (el: HTMLElement | null) => {
    if (el && focusTarget.current === key) {
      focusTarget.current = null;
      el.focus();
    }
  };

  const move = (delta: -1 | 1) => {
    const next = current + delta;
    if (next < 0 || next >= visible.length) return;
    setDirection(delta === 1 ? -1 : 1);
    focusTarget.current = visible[next].id;
    setIndex(next);
  };

  /** Off the stack: the card after it (or before it, at the end) takes its place and the focus. */
  const dismiss = (item: DecisionItem, towards: Direction) => {
    const rest = visible.filter((i) => i.id !== item.id);
    focusTarget.current = rest[Math.min(current, rest.length - 1)]?.id ?? 'empty';
    setDirection(towards);
    setDone((prev) => new Set(prev).add(item.id));
    setIndex(Math.min(current, Math.max(rest.length - 1, 0)));
  };

  const isLoved = (item: DecisionItem) => lovedNow.get(item.id) ?? item.lovedAt !== null;

  const toggleLove = (item: DecisionItem) => {
    // Only ideas carry "Loved by Mira"; one request per card at a time, so presses never race.
    if (item.kind !== 'post' || lovePending.has(item.id)) return;
    const next = !isLoved(item);
    const show = (value: boolean) => setLovedNow((prev) => new Map(prev).set(item.id, value));
    const settle = () =>
      setLovePending((prev) => {
        const rest = new Set(prev);
        rest.delete(item.id);
        return rest;
      });
    show(next);
    setLovePending((prev) => new Set(prev).add(item.id));
    love.mutate(
      { id: item.refId, loved: next },
      {
        onError: (error) => {
          show(!next);
          toastError(error, { retry: () => toggleLove(item) });
        },
        onSettled: settle,
      },
    );
  };

  const openReply = (item: DecisionItem) => {
    if (item.kind !== 'pitch') {
      router.push(item.href);
      return;
    }
    setReplyItem(item);
    setReplyOpen(true);
  };

  const sendReply = (item: DecisionItem, reply: string) =>
    inboxAction.mutate(
      { id: item.refId, action: { action: 'reply', reply } },
      {
        onSuccess: () => {
          toastSuccess(`Reply sent to ${item.name.split(' ')[0]}.`);
          setReplyOpen(false);
          // The card is answered: off the stack, the next one takes its place.
          if (visible.some((i) => i.id === item.id)) dismiss(item, 1);
        },
      },
    );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!top || event.altKey || event.ctrlKey || event.metaKey || isTyping(event.target)) return;
    const key = event.key.toLowerCase();
    if (key === 'arrowright') move(1);
    else if (key === 'arrowleft') move(-1);
    else if (key === 'l' && top.kind === 'post') toggleLove(top);
    else if (key === 'r' && top.href.startsWith('/')) openReply(top);
    else return;
    event.preventDefault();
  };

  if (!top) {
    return (
      <section
        aria-label="Decisions"
        tabIndex={-1}
        ref={focusOnMount('empty')}
        className="glass-strong flex min-h-[360px] flex-col items-center justify-center gap-3 p-8 text-center outline-none"
      >
        <PartyPopper aria-hidden className="size-8 text-ink-soft" strokeWidth={1.5} />
        <h2 className="font-display text-[32px] leading-tight text-ink">
          You&rsquo;re all caught up
        </h2>
        <p className="max-w-sm text-body text-ink-soft">
          New fan mail lands here as it comes in. Browse everything your fans sent in the meantime.
        </p>
        <Link
          href={routes.dashboard.inbox()}
          className={buttonVariants({ variant: 'secondary', size: 'md', surface: 'glass' })}
        >
          Open fan mail
        </Link>
      </section>
    );
  }

  return (
    <>
      <section aria-label="Decisions" onKeyDown={onKeyDown}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p aria-live="polite" aria-atomic="true" className="text-small text-ink-soft">
            Card {current + 1} of {visible.length}
          </p>
          <div className="flex items-center gap-1">
            <p className="mr-2 hidden text-small text-ink-soft lg:block">
              <kbd className="font-sans">&larr;</kbd> <kbd className="font-sans">&rarr;</kbd> to
              move · <kbd className="font-sans">L</kbd> love · <kbd className="font-sans">R</kbd>{' '}
              reply
            </p>
            <Button
              variant="ghost"
              surface="glass"
              aria-label="Previous card"
              disabled={current === 0}
              onClick={() => move(-1)}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              surface="glass"
              aria-label="Next card"
              disabled={current >= visible.length - 1}
              onClick={() => move(1)}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>

        <div className="relative pb-3">
          {hasPeek ? (
            <div
              aria-hidden="true"
              className="glass absolute inset-x-0 top-3 bottom-0 origin-bottom scale-x-[0.96] rounded-[28px]"
            />
          ) : null}
          <AnimatePresence initial={false} mode="popLayout" custom={direction}>
            <motion.div
              key={top.id}
              custom={direction}
              variants={{
                enter: reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 },
                center: { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0 },
                exit: (dir: Direction) =>
                  reduceMotion ? { opacity: 0 } : { opacity: 0, x: dir * 160, rotate: dir * 4 },
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={reduceMotion ? { duration: 0.15 } : SPRING}
              className="relative"
            >
              <DecisionCard
                item={top}
                featureHref={featureHref(top)}
                loved={isLoved(top)}
                canLove={top.kind === 'post'}
                cardRef={focusOnMount(top.id)}
                onFeature={(item) => dismiss(item, 1)}
                onReply={(item) => {
                  // A fan message opens the reply sheet (the link's own navigation is cancelled by the
                  // card); any other card follows its link to the item in its list.
                  if (item.kind === 'pitch') openReply(item);
                }}
                onLove={toggleLove}
                onLater={(item) => dismiss(item, -1)}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
      {replyItem ? (
        <ReplySheet
          item={replyItem}
          open={replyOpen}
          onOpenChange={setReplyOpen}
          onSend={sendReply}
        />
      ) : null}
    </>
  );
}

/** The stack while its sources load: the same 360px card footprint. */
export function DecisionStackSkeleton() {
  return (
    <div aria-hidden="true">
      <Skeleton className="mb-3 h-10 w-40 rounded-full" />
      <div className="glass-strong flex min-h-[360px] flex-col gap-4 rounded-[28px] p-7">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="mt-2 h-8 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="mt-auto flex gap-2">
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-10 w-44 rounded-full" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}
