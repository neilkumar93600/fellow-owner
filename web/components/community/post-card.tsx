import { POST_TYPE_LABELS, type PostCard } from '@fellow-owners/shared';
import { MessageCircle, Trophy } from 'lucide-react';
import Link from 'next/link';
import { LovedBadge } from '@/components/post/loved-badge';
import { AvatarInitials, AvatarStack } from '@/components/shared/avatar-initials';
import { CommunityChip } from '@/components/shared/community-chip';
import { StatusPill } from '@/components/shared/status-pill';
import { cn } from '@/components/ui/cn';
import { formatNumber } from '@/lib/format';

export interface FanPostCardProps {
  post: PostCard;
  href: string;
  /** The creator's first name, for "Loved by Mira". */
  creator: string;
  /** Show the community chip (My space lists posts from every room; a room's own feed does not). */
  showCommunity?: boolean;
  className?: string;
}

/**
 * A fan post as a frosted card: badges (Loved by Mira, challenge entry, status), the title as the card's one
 * link, a two-line summary, the open spots, then the author, the crew and the signals. The whole card
 * is the target (an ::after on the title link); hover lifts the glass.
 */
export function FanPostCard({
  post,
  href,
  creator,
  showCommunity = false,
  className,
}: FanPostCardProps) {
  const team = post.teamPreview.map((member) => ({ name: member.name, image: member.image }));
  const spots = post.openRoles.slice(0, 3);
  return (
    <article
      className={cn(
        'group press glass relative flex min-w-0 flex-col gap-3 p-5 transition-colors duration-150 ease-out-quart hover:bg-white/80',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {showCommunity ? (
          <CommunityChip
            name={post.community.name}
            tint={post.community.tint}
            icon={post.community.icon}
          />
        ) : (
          <span className="text-small text-ink-soft">{POST_TYPE_LABELS[post.type]}</span>
        )}
        {post.lovedAt ? <LovedBadge creator={creator} /> : null}
        {post.challenge ? (
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-aurora-lilac px-3 text-caption text-ink">
            <Trophy aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
            Challenge entry
          </span>
        ) : null}
        <StatusPill status={post.status} className="ml-auto" />
      </div>

      <h3 className="line-clamp-2 text-h2 text-ink">
        <Link
          href={href}
          className="rounded-sm underline-offset-4 outline-none group-hover:underline after:absolute after:inset-0 after:rounded-panel focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ink"
        >
          {post.title}
        </Link>
      </h3>
      <p className="line-clamp-2 text-body text-ink">{post.excerpt}</p>

      {spots.length ? (
        <ul aria-label="Open spots" className="flex flex-wrap gap-1.5">
          {spots.map((role) => (
            <li
              key={role}
              className="inline-flex h-6 items-center rounded-full bg-white/70 px-2.5 text-caption text-ink ring-1 ring-ink/10 ring-inset"
            >
              {role}
            </li>
          ))}
          {post.openRoles.length > spots.length ? (
            <li className="inline-flex h-6 items-center px-1 text-caption text-ink-soft">
              +{post.openRoles.length - spots.length} open
            </li>
          ) : null}
        </ul>
      ) : null}

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex min-w-0 items-center gap-2">
          <AvatarInitials name={post.author.name} image={post.author.image} size={28} />
          <span className="truncate text-small text-ink">{post.author.name}</span>
        </span>
        {team.length > 1 ? <AvatarStack people={team} total={post.teamSize} /> : null}
        <p className="text-small text-ink-soft">
          <span className="tabular-nums">{formatNumber(post.useCount)}</span> would use this ·{' '}
          <span className="tabular-nums">{formatNumber(post.buildCount)}</span> want in
        </p>
        {post.commentCount > 0 ? (
          <p className="inline-flex items-center gap-1 text-small text-ink-soft">
            <MessageCircle aria-hidden="true" strokeWidth={1.5} className="size-4" />
            <span className="tabular-nums">{formatNumber(post.commentCount)}</span>
            <span className="sr-only">comments</span>
          </p>
        ) : null}
      </div>
    </article>
  );
}
