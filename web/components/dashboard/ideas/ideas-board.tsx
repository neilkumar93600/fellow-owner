import {
  type IdeaItem,
  POST_STATUS_LABELS,
  POST_STATUSES,
  type PostStatus,
} from '@fellow-owners/shared';
import Link from 'next/link';
import { AiChip } from '@/components/shared/ai-chip';
import { CommunityChip } from '@/components/shared/community-chip';
import { FitPill } from '@/components/shared/fit-pill';
import { StatusPill } from '@/components/shared/status-pill';
import { formatNumber, pluralize } from '@/lib/format';

export interface IdeasBoardProps {
  posts: IdeaItem[];
  /** The post's side panel URL (?item=). */
  hrefFor: (id: string) => string;
}

const EMPTY: Record<PostStatus, string> = {
  open: 'No open posts here.',
  forming_team: 'No teams forming yet.',
  building: 'Nothing being built yet.',
  launched: 'Nothing launched yet.',
};

/** The AI's word on a post: its fit (the reason rides in the tooltip), or why there is none yet. */
function Verdict({ post }: { post: IdeaItem }) {
  const { ai } = post;
  if (ai.status === 'pending') return <AiChip kind="reviewing" />;
  if (ai.status === 'failed') return <AiChip kind="not-analyzed" />;
  if (ai.fitScore == null || !ai.fitReason) return null;
  return <FitPill score={ai.fitScore} reason={ai.fitReason} />;
}

/**
 * A compact frosted idea card: community and fit, the title (the link, stretched over the card) and
 * the signal counts. Hover steps it to Pure White and underlines the title; nothing moves.
 */
function BoardCard({ post, href }: { post: IdeaItem; href: string }) {
  return (
    <article className="group relative flex flex-col gap-3 glass rounded-2xl p-4 transition-colors duration-150 ease-out-quart hover:bg-white/80">
      <div className="flex min-h-6 items-center justify-between gap-2">
        <CommunityChip
          name={post.community.name}
          tint={post.community.tint}
          icon={post.community.icon}
          className="min-w-0 shrink"
        />
        {/* Above the stretched link, so the fit tooltip still opens. */}
        <span className="relative z-10 shrink-0">
          <Verdict post={post} />
        </span>
      </div>
      <h3 className="line-clamp-3 text-label text-ink">
        <Link
          href={href}
          className="underline-offset-4 outline-none group-hover:underline after:absolute after:inset-0 after:rounded-2xl focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-ink"
        >
          {post.title}
        </Link>
      </h3>
      <p className="text-small text-ink-soft">
        {formatNumber(post.useCount)} would use · {formatNumber(post.buildCount)} would help build
      </p>
      {post.hidden ? <StatusPill status="hidden" className="self-start" /> : null}
    </article>
  );
}

/**
 * The Board view: four status columns (Open, Finding a crew, In the works, Made it) with ink heads on the
 * shell and compact cards. Below the 892px the four need, the board scrolls sideways; the 4px inset
 * keeps focus rings clear of the scroll box.
 */
export function IdeasBoard({ posts, hrefFor }: IdeasBoardProps) {
  return (
    <div className="scrollbar-band -m-1 p-1">
      <div className="grid grid-cols-[repeat(4,minmax(208px,1fr))] gap-5">
        {POST_STATUSES.map((status) => {
          const column = posts.filter((post) => post.status === status);
          const label = POST_STATUS_LABELS[status];
          return (
            <section
              key={status}
              aria-labelledby={`board-${status}`}
              className="flex min-w-0 flex-col gap-3"
            >
              <h2
                id={`board-${status}`}
                className="flex h-10 items-center gap-2 px-1 text-label-strong text-ink"
              >
                {label}
                <span className="text-small tabular-nums">
                  {formatNumber(column.length)}
                  <span className="sr-only"> {pluralize(column.length, 'post')}</span>
                </span>
              </h2>
              {column.length ? (
                <ul className="flex flex-col gap-3">
                  {column.map((post) => (
                    <li key={post.id}>
                      <BoardCard post={post} href={hrefFor(post.id)} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-1 text-small text-ink">{EMPTY[status]}</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
