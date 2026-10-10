import type { AiInsight, IdeaItem, PostCard } from '@fellow-owners/shared';
import { Megaphone, Pin } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { formatNumber } from '@/lib/format';
import { AiChip } from './ai-chip';
import { AvatarStack } from './avatar-initials';
import { CommunityChip } from './community-chip';
import { FitPill } from './fit-pill';

export interface IdeaCardProps {
  /** A fan's PostCard, or the creator's IdeaItem (adds the AI fit). */
  post: PostCard | IdeaItem;
  /** The post: its side panel URL on /dashboard, its page on fan screens. */
  href: string;
  /** creator: match label and the card's Spotlight. fan: Open only. */
  variant: 'creator' | 'fan';
  /** creator: Promote as a button (prefer promoteHref, a link to the composer). */
  onPromote?: () => void;
  promoteHref?: string;
  className?: string;
}

/** The AI's word on the idea: its fit (with the reason), or why there is none yet. */
function AiVerdict({ ai }: { ai: AiInsight }) {
  if (ai.status === 'pending') return <AiChip kind="reviewing" />;
  if (ai.status === 'failed') return <AiChip kind="not-analyzed" />;
  if (ai.fitScore == null || !ai.fitReason) return null;
  return <FitPill score={ai.fitScore} reason={ai.fitReason} />;
}

/**
 * DESIGN.md Idea card: soft frosted glass, radius 24, padding 20. Community chip, H2 title (two lines at most,
 * the link), one Body summary line in ink-muted, the team's avatars, the signal counts in Small ink-muted,
 * then Open. Creator screens add the match label and a glass Spotlight (coral stays the screen's one action). Hover
 * steps the glass to 80% white and underlines the title; nothing moves.
 */
export function IdeaCard({
  post,
  href,
  variant,
  onPromote,
  promoteHref,
  className,
}: IdeaCardProps) {
  const creator = variant === 'creator';
  const ai = 'ai' in post ? post.ai : null;
  const team = post.teamPreview.map((member) => ({ name: member.name, image: member.image }));

  return (
    <article
      className={cn(
        'glass group flex min-w-0 flex-col rounded-[24px] p-5 transition-colors duration-150 ease-out-quart hover:bg-white/80',
        className,
      )}
    >
      <div className="flex min-h-6 items-center justify-between gap-3">
        <CommunityChip
          name={post.community.name}
          tint={post.community.tint}
          icon={post.community.icon}
        />
        {creator && ai ? (
          <AiVerdict ai={ai} />
        ) : post.pinned && post.answerGroup ? (
          // An Answer Once answer (F32): pinned first in the feed, labelled quietly.
          <span className="inline-flex items-center gap-1.5 text-small text-ink-soft">
            <Pin aria-hidden="true" strokeWidth={1.5} className="size-4" />
            Pinned · answered for{' '}
            <span className="tabular-nums">{formatNumber(post.answerGroup.askedCount)}</span> people
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 line-clamp-2 text-h2 text-ink">
        <Link href={href} className="rounded-sm underline-offset-4 group-hover:underline">
          {post.title}
        </Link>
      </h3>
      <p className="mt-1 truncate text-body text-ink-muted">{post.excerpt}</p>

      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
        {team.length ? <AvatarStack people={team} total={post.teamSize} /> : null}
        <p className="text-small text-ink-muted">
          {formatNumber(post.useCount)} would use this · {formatNumber(post.buildCount)} want to
          help
        </p>
      </div>

      <div className="mt-auto flex flex-wrap gap-3 pt-5">
        <Link href={href} className={buttonVariants({ variant: 'secondary', surface: 'card' })}>
          Open<span className="sr-only">: {post.title}</span>
        </Link>
        {creator && promoteHref ? (
          <Link
            href={promoteHref}
            className={buttonVariants({ variant: 'secondary', surface: 'card' })}
          >
            <Megaphone aria-hidden="true" className="size-5" />
            Spotlight<span className="sr-only">: {post.title}</span>
          </Link>
        ) : null}
        {creator && !promoteHref && onPromote ? (
          <Button variant="secondary" surface="card" icon={<Megaphone />} onClick={onPromote}>
            Spotlight<span className="sr-only">: {post.title}</span>
          </Button>
        ) : null}
      </div>
    </article>
  );
}
