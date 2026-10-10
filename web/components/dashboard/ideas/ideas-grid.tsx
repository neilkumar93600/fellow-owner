import type { IdeaItem } from '@fellow-owners/shared';
import { Heart, Megaphone } from 'lucide-react';
import Link from 'next/link';
import { AiChip } from '@/components/shared/ai-chip';
import { CommunityChip } from '@/components/shared/community-chip';
import { MatchLabel } from '@/components/shared/match-label';
import { StatusPill } from '@/components/shared/status-pill';
import { COMMUNITY_ICON, cardTint, TINT_STYLES } from '@/components/shared/tint';
import { buttonVariants } from '@/components/ui/button-variants';
import { formatNumber } from '@/lib/format';
import { routes } from '@/lib/routes';

export interface IdeasGridProps {
  posts: IdeaItem[];
  /** The post's side panel URL (?item=). */
  hrefFor: (id: string) => string;
}

function IdeaTile({ post, href }: { post: IdeaItem; href: string }) {
  const styles = TINT_STYLES[cardTint(post.community.tint)];
  const Icon = COMMUNITY_ICON[post.community.icon];
  const { ai } = post;
  return (
    <article className="glass group flex min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] transition-colors duration-150 ease-out-quart hover:bg-white/80">
      {/* Cover tint: the community's aurora colour with its icon, the Loved badge on the corner. */}
      <div className={`relative flex h-20 items-center px-5 ${styles.tile}`}>
        <Icon aria-hidden="true" strokeWidth={1.5} className={`size-8 ${styles.icon}`} />
        {post.lovedAt ? (
          <span className="glass-chip absolute top-3 right-3 inline-flex h-7 items-center gap-1.5 px-3 text-caption text-ink">
            <Heart aria-hidden="true" className="size-3.5 fill-sunset text-sunset" />
            Loved
          </span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex min-h-7 flex-wrap items-center justify-between gap-2">
          <CommunityChip
            name={post.community.name}
            tint={post.community.tint}
            icon={post.community.icon}
            className="min-w-0 shrink"
          />
          {ai.status === 'pending' ? (
            <AiChip kind="reviewing" />
          ) : ai.status === 'failed' ? (
            <AiChip kind="not-analyzed" />
          ) : (
            <MatchLabel score={ai.fitScore} />
          )}
        </div>
        <h3 className="mt-3 line-clamp-2 text-h2 text-ink">
          <Link href={href} className="rounded-sm underline-offset-4 group-hover:underline">
            {post.title}
          </Link>
        </h3>
        <p className="mt-1 truncate text-body text-ink-soft">{post.excerpt}</p>
        <p className="mt-4 text-small text-ink-soft">
          <span className="tabular-nums">{formatNumber(post.useCount)}</span> would use this ·{' '}
          <span className="tabular-nums">{formatNumber(post.buildCount)}</span> count me in
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
          <Link href={href} className={buttonVariants({ variant: 'secondary', surface: 'glass' })}>
            Open<span className="sr-only">: {post.title}</span>
          </Link>
          {post.hidden ? null : (
            <Link
              href={routes.dashboard.promoteComposer(post.id)}
              className={buttonVariants({ variant: 'ghost', surface: 'glass' })}
            >
              <Megaphone aria-hidden="true" className="size-5" />
              Spotlight<span className="sr-only">: {post.title}</span>
            </Link>
          )}
          <StatusPill status={post.hidden ? 'hidden' : post.status} className="ml-auto" />
        </div>
      </div>
    </article>
  );
}

/**
 * The Ranked view: idea cards in a card grid, one column, two from a 512px content width, three from
 * 896px. Words only for the fit (MatchLabel); the number lives in the post side panel.
 */
export function IdeasGrid({ posts, hrefFor }: IdeasGridProps) {
  return (
    <ul className="grid grid-cols-1 gap-5 @lg:grid-cols-2 @4xl:grid-cols-3">
      {posts.map((post) => (
        <li key={post.id} className="flex min-w-0">
          <IdeaTile post={post} href={hrefFor(post.id)} />
        </li>
      ))}
    </ul>
  );
}
