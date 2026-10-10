'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { CommunityChip } from '@/components/shared/community-chip';
import { useSimilar } from '@/hooks/queries/use-similar';
import { routes } from '@/lib/routes';

export interface SimilarSectionProps {
  postId: string;
  /** `member` reads /api/posts/:id/similar, `studio` reads the owner route. */
  scope: 'member' | 'studio';
}

/**
 * Similar ideas and people who could help (F17). Quiet by design: nothing renders while it
 * loads, if it fails, or when nothing in the space is close enough to this post.
 */
export function SimilarSection({ postId, scope }: SimilarSectionProps) {
  const { handle } = useParams<{ handle?: string }>();
  const { data } = useSimilar(postId, scope);
  if (!data || (data.posts.length === 0 && data.people.length === 0)) return null;

  const studio = scope === 'studio';
  const postHref = (id: string) =>
    studio ? routes.dashboard.ideas({ item: id }) : routes.fan.post(handle ?? '', id);

  return (
    <section
      aria-label="Related to this post"
      className={
        studio
          ? 'flex flex-col gap-4 border-line border-t pt-5'
          : 'glass-strong flex min-w-0 flex-col gap-5 p-6 sm:p-8'
      }
    >
      {data.posts.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className={studio ? 'text-small-strong text-ink' : 'text-h2 text-ink'}>
            Similar ideas
          </h3>
          <ul className="flex flex-col gap-3">
            {data.posts.map((post) => (
              <li key={post.id} className="flex min-w-0 flex-col gap-1.5">
                <CommunityChip
                  name={post.community.name}
                  tint={post.community.tint}
                  icon={post.community.icon}
                  className="self-start"
                />
                <Link
                  href={postHref(post.id)}
                  className="rounded-sm text-label text-ink underline-offset-4 hover:underline"
                >
                  {post.title}
                </Link>
                <p className="line-clamp-2 text-small text-ink-muted">{post.excerpt}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.people.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h3 className={studio ? 'text-small-strong text-ink' : 'text-h2 text-ink'}>
            People who could help
          </h3>
          <ul className="flex flex-col gap-3">
            {data.people.map((person) => (
              <li key={person.membershipId} className="flex min-w-0 items-center gap-3">
                <AvatarInitials name={person.member.name} image={person.member.image} size={40} />
                <div className="min-w-0">
                  <p className="truncate text-label text-ink">{person.member.name}</p>
                  <p className="truncate text-small text-ink-muted">{person.reason}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
