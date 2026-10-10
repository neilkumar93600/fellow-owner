import { INBOX_TAB_LABELS, type InboxItem, PITCH_TYPE_LABELS } from '@fellow-owners/shared';
import { ArchiveRestore } from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';
import { AiChip } from '@/components/shared/ai-chip';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { MatchLabel } from '@/components/shared/match-label';
import { StatusPill } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import { cn } from '@/components/ui/cn';
import { Skeleton } from '@/components/ui/skeleton';
import { formatRelative } from '@/lib/format';

export interface InboxCardsProps {
  rows: InboxItem[];
  /** The message whose side panel is open. */
  selectedId: string | null;
  /** The card's own URL (?item=), so the name link works in a new tab and as the keyboard path. */
  hrefFor: (item: InboxItem) => string;
  onOpen: (item: InboxItem) => void;
  onRetry: (item: InboxItem) => void;
  onRestore: (item: InboxItem) => void;
  /** One clock for server and client, so relative dates hydrate unchanged. */
  now: number;
  empty: React.ReactNode;
}

/** A plain left click opens the panel in place; a modified click opens the link's own tab. */
const plainClick = (event: React.MouseEvent) =>
  !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0);

/** The words on the card: what the fan wrote, else the AI's summary. A kept-out card says why instead. */
function cardQuote(item: InboxItem): string {
  return item.isFiltered
    ? (item.ai.summary ?? item.excerpt)
    : item.excerpt || item.ai.summary || item.subject;
}

/**
 * DESIGN.md Fan mail card list (the default view): one frosted card per message with the fan's face and
 * name, the kind of message, what they wrote, the AI's reason and a match label (words, never a number).
 * The name is the card's link (stretched over the card) and the keyboard path into the side panel. A
 * kept-out message says why and offers Restore; a message the AI could not read offers Retry.
 */
export function InboxCards({
  rows,
  selectedId,
  hrefFor,
  onOpen,
  onRetry,
  onRestore,
  now,
  empty,
}: InboxCardsProps) {
  if (rows.length === 0) {
    return <section aria-label="Fan mail">{empty}</section>;
  }
  return (
    <ul aria-label="Fan mail" className="flex flex-col gap-3">
      {rows.map((item) => {
        const selected = item.id === selectedId;
        const reason = item.ai.status === 'done' ? item.ai.fitReason : null;
        return (
          <li key={item.id}>
            <article
              aria-current={selected ? 'true' : undefined}
              className={cn(
                'glass-strong relative flex flex-col gap-3 rounded-[24px] p-4 transition-colors duration-150 ease-out-quart sm:p-5',
                'hover:bg-white/85',
                selected && 'bg-white/90 ring-2 ring-ink/70',
              )}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <AvatarInitials name={item.sender.name} image={item.sender.image} size={48} />
                <div className="min-w-[8rem] flex-1">
                  <p className="truncate text-label text-ink">
                    <Link
                      href={hrefFor(item)}
                      onClick={(event) => {
                        if (!plainClick(event)) return;
                        event.preventDefault();
                        onOpen(item);
                      }}
                      className="rounded-sm after:absolute after:inset-0 after:rounded-[24px] after:content-['']"
                    >
                      {item.sender.name}
                      <span className="sr-only">: {item.subject}</span>
                    </Link>
                  </p>
                  <p className="truncate text-small text-ink-soft">
                    {PITCH_TYPE_LABELS[item.type]} ·{' '}
                    <time dateTime={item.createdAt} suppressHydrationWarning>
                      {formatRelative(item.createdAt, now)}
                    </time>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.isFiltered ? (
                    <StatusPill status="filtered" label={INBOX_TAB_LABELS.filtered} />
                  ) : item.status !== 'new' ? (
                    <StatusPill status={item.status} />
                  ) : null}
                  {item.isFiltered ? null : <MatchLabel score={item.ai.fitScore} />}
                </div>
              </div>

              <p className="text-label-strong text-ink">{item.subject}</p>
              <p className="-mt-1.5 line-clamp-2 max-w-[68ch] text-body text-ink">
                {item.isFiltered ? (
                  <span className="font-medium">{INBOX_TAB_LABELS.filtered}: </span>
                ) : null}
                {cardQuote(item)}
              </p>

              {reason ? (
                <p className="text-small text-ink-soft">
                  <span className="font-medium text-ink">Why:</span> {reason}
                </p>
              ) : null}
              {item.ai.status === 'pending' ? <AiChip kind="reviewing" /> : null}
              {item.ai.status === 'failed' ? (
                <div className="relative z-10">
                  <AiChip kind="not-analyzed" onRetry={() => onRetry(item)} />
                </div>
              ) : null}
              {item.isFiltered ? (
                <div className="relative z-10">
                  <Button
                    variant="secondary"
                    size="md"
                    surface="white"
                    icon={<ArchiveRestore />}
                    aria-label={`Restore the message from ${item.sender.name}`}
                    onClick={() => onRestore(item)}
                  >
                    Restore
                  </Button>
                </div>
              ) : null}
            </article>
          </li>
        );
      })}
    </ul>
  );
}

/** The card list while it loads: four frosted cards of the same footprint. */
export function CardsSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="glass-strong flex flex-col gap-3 rounded-[24px] p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 rounded-full" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}
