import { type MySpace, POST_STATUS_LABELS } from '@fellow-owners/shared';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { AvatarStack } from '@/components/shared/avatar-initials';
import { CommunityChip } from '@/components/shared/community-chip';
import { EmptyState } from '@/components/shared/empty-state';
import { StatusPill } from '@/components/shared/status-pill';
import { formatNumber, pluralize } from '@/lib/format';
import { routes } from '@/lib/routes';

/** My crews: each fan project the fan leads or asked to join, their role and where the request stands. */
export function MyTeams({ handle, teams }: { handle: string; teams: MySpace['teams'] }) {
  if (!teams.length) {
    return (
      <EmptyState
        icon={Users}
        body="No crews yet. Open a fan project and tap Join as an open spot you can fill."
        className="glass min-h-64"
      />
    );
  }
  return (
    <ul className="flex flex-col gap-4">
      {teams.map(({ post, role, status, isLead }) => (
        <li key={post.id}>
          <article className="group min-w-0 glass p-5 transition-colors duration-150 ease-out-quart hover:bg-white">
            <div className="flex min-h-6 items-center justify-between gap-3">
              <CommunityChip
                name={post.community.name}
                tint={post.community.tint}
                icon={post.community.icon}
              />
              <StatusPill status={status} />
            </div>
            <h3 className="mt-3 line-clamp-2 text-h2 text-ink">
              <Link
                href={routes.fan.post(handle, post.id)}
                className="rounded-sm underline-offset-4 group-hover:underline"
              >
                {post.title}
              </Link>
            </h3>
            <p className="mt-1 text-body text-ink-soft">
              {isLead ? 'You lead this fan project.' : `Your role: ${role}.`}{' '}
              {POST_STATUS_LABELS[post.status]}.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <AvatarStack
                people={post.teamPreview.map((member) => ({
                  name: member.name,
                  image: member.image,
                }))}
                total={post.teamSize}
              />
              <p className="text-small text-ink-soft">
                <span className="tabular-nums">{formatNumber(post.teamSize)}</span>{' '}
                {pluralize(post.teamSize, 'person', 'people')} in the crew
              </p>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}
