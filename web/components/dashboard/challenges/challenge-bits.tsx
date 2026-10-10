import type { ChallengeSummary, StudioCommunity } from '@fellow-owners/shared';
import { Clock, Lock } from 'lucide-react';
import { CommunityChip } from '@/components/shared/community-chip';
import { cn } from '@/components/ui/cn';
import { countdown } from './countdown-core.mjs';

/** Open: the time left (peach once under a day). Closed: a quiet "Closed". Words are ink on an aurora tint. */
export function CountdownPill({
  challenge,
  now,
}: {
  challenge: Pick<ChallengeSummary, 'status' | 'dueAt'>;
  now: number;
}) {
  const closed = challenge.status === 'closed';
  const left = countdown(challenge.dueAt, now);
  const Icon = closed ? Lock : Clock;
  return (
    <span
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-caption whitespace-nowrap text-ink',
        closed
          ? 'bg-white/75 ring-1 ring-ink/10 ring-inset'
          : left.urgent
            ? 'bg-aurora-peach'
            : 'bg-aurora-mint',
      )}
    >
      <Icon aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
      {closed ? 'Closed' : left.text}
    </span>
  );
}

/** The challenge's community as a chip, or "All communities" when it was posted to everyone. */
export function ChallengeCommunity({
  challenge,
  communities,
  className,
}: {
  challenge: Pick<ChallengeSummary, 'communityId' | 'communityName'>;
  communities: StudioCommunity[] | undefined;
  className?: string;
}) {
  const match = challenge.communityId
    ? communities?.find((community) => community.id === challenge.communityId)
    : null;
  if (match)
    return (
      <CommunityChip name={match.name} tint={match.tint} icon={match.icon} className={className} />
    );
  return (
    <CommunityChip
      name={challenge.communityName ?? 'All communities'}
      tint="white"
      icon={challenge.communityId ? 'users' : 'globe'}
      className={className}
    />
  );
}
