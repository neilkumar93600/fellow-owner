'use client';

import type { PostDetail, TeamMember } from '@fellow-owners/shared';
import { useId } from 'react';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { StatusPill } from '@/components/shared/status-pill';
import { Button } from '@/components/ui/button';
import { useDecideTeamRole, useRequestTeamRole } from '@/hooks/queries/use-post';
import { formatNumber, pluralize } from '@/lib/format';
import { toastSuccess } from '@/lib/toast';

/**
 * A fan project's Open spots and The crew, inside the post card. A fan asks for one open spot at a time
 * ("Join as Designer" turns into Requested); the author sees how many asked for each role and every team
 * status, with Accept and Decline on each request. Others see accepted members only.
 */
export function TeamRoles({ post }: { post: PostDetail }) {
  const request = post.viewerTeam;
  const requestRole = useRequestTeamRole();
  const noteId = useId();
  const author = post.author.name.split(' ')[0];
  const team = post.isAuthor
    ? post.team
    : post.team.filter((member) => member.status === 'accepted');
  const more = post.teamSize - team.length;

  function join(role: string) {
    requestRole.mutate(
      { postId: post.id, role },
      { onSuccess: () => toastSuccess(`Request sent. ${author} decides who joins.`) },
    );
  }

  return (
    <>
      {post.roles.length ? (
        <section aria-labelledby="roles-title" className="mt-6 border-t border-ink/10 pt-6">
          <h2 id="roles-title" className="text-h2 text-ink">
            {post.roles.some((slot) => !slot.filled) ? 'Open spots' : 'Every spot is filled'}
          </h2>
          <ul className="mt-2 divide-y divide-ink/10">
            {[...post.roles]
              .sort((a, b) => Number(a.filled) - Number(b.filled))
              .map((slot) => (
                <li
                  key={slot.role}
                  className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-label text-ink">{slot.role}</p>
                    {slot.filled ? (
                      <p className="text-small text-ink-soft">
                        Filled by {slot.filledBy?.name ?? 'a fan'}
                      </p>
                    ) : null}
                  </div>
                  {slot.filled ? null : post.isAuthor ? (
                    <p className="text-small text-ink-soft">
                      <span className="tabular-nums">{formatNumber(slot.requestCount)}</span>{' '}
                      {pluralize(slot.requestCount, 'request')}
                    </p>
                  ) : request?.role === slot.role ? (
                    <StatusPill status={request.status} />
                  ) : (
                    <Button
                      variant="secondary"
                      className="h-11"
                      disabled={request !== null || requestRole.isPending}
                      loading={requestRole.isPending && requestRole.variables?.role === slot.role}
                      aria-describedby={request ? noteId : undefined}
                      onClick={() => join(slot.role)}
                    >
                      Join as {slot.role}
                    </Button>
                  )}
                </li>
              ))}
          </ul>
          <p id={noteId} aria-live="polite" className="text-small text-ink-soft not-empty:mt-2">
            {request && !post.isAuthor
              ? request.status === 'requested'
                ? `You asked to join as ${request.role}. ${author} decides, and you'll see the answer in My space.`
                : `You're on this crew as ${request.role}.`
              : null}
          </p>
        </section>
      ) : null}

      {team.length ? (
        <section aria-labelledby="team-title" className="mt-6 border-t border-ink/10 pt-6">
          <h2 id="team-title" className="text-h2 text-ink">
            The crew
          </h2>
          <ul className="mt-4 flex flex-col gap-4">
            {team.map((member) => (
              <li
                key={member.membershipId ?? member.name}
                className="flex flex-wrap items-center gap-3"
              >
                <AvatarInitials name={member.name} image={member.image} />
                <div className="min-w-40 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-label-strong text-ink">
                    {member.name}
                    {member.isLead ? (
                      <span className="inline-flex h-6 items-center rounded-full bg-white/70 px-2.5 text-caption text-ink">
                        Lead
                      </span>
                    ) : null}
                  </p>
                  {/* A lead's role is usually "Lead", which the chip already says. */}
                  <p className="truncate text-small text-ink-soft">
                    {member.isLead && member.role === 'Lead' ? member.headline : member.role}
                  </p>
                </div>
                {member.status === 'requested' && post.isAuthor && member.membershipId ? (
                  <RequestActions
                    postId={post.id}
                    member={member}
                    membershipId={member.membershipId}
                  />
                ) : member.status === 'accepted' ? null : (
                  <StatusPill status={member.status} />
                )}
              </li>
            ))}
          </ul>
          {more > 0 ? (
            <p className="mt-3 text-small text-ink-soft">
              and <span className="tabular-nums">{formatNumber(more)}</span> more
            </p>
          ) : null}
        </section>
      ) : null}
    </>
  );
}

/** The lead's Accept and Decline on a request. The crew and the open spots update from the answer. */
function RequestActions({
  postId,
  member,
  membershipId,
}: {
  postId: string;
  member: TeamMember;
  membershipId: string;
}) {
  const decide = useDecideTeamRole();

  function answer(status: 'accepted' | 'declined') {
    decide.mutate(
      { postId, membershipId, status },
      {
        onSuccess: () =>
          toastSuccess(
            status === 'accepted' ? `${member.name} joined the crew` : 'Request declined',
          ),
      },
    );
  }

  return (
    <div className="flex shrink-0 gap-2">
      {(['accepted', 'declined'] as const).map((status) => (
        <Button
          key={status}
          variant="secondary"
          className="h-11"
          disabled={decide.isPending}
          loading={decide.isPending && decide.variables?.status === status}
          onClick={() => answer(status)}
        >
          {status === 'accepted' ? 'Accept' : 'Decline'}
          <span className="sr-only">
            {' '}
            {member.name} as {member.role}
          </span>
        </Button>
      ))}
    </div>
  );
}
