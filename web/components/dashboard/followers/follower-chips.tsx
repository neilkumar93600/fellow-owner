import type { FollowerCommunity } from '@fellow-owners/shared';
import { CommunityChip } from '@/components/shared/community-chip';
import { cn } from '@/components/ui/cn';

/** A small lime "AI" tag after a community the AI tagged, so the creator can review it. */
export function AiMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded-full bg-aurora-mint px-1.5 text-caption text-ink',
        className,
      )}
    >
      <span aria-hidden="true">AI</span>
      <span className="sr-only">tagged by AI</span>
    </span>
  );
}

/** A follower's community chips, AI tags marked; with `max`, the rest fold into "+N". */
export function FollowerCommunityChips({
  communities,
  max,
}: {
  communities: FollowerCommunity[];
  max?: number;
}) {
  if (communities.length === 0) return <span className="text-ink-soft">Untagged</span>;
  const rest = max === undefined ? [] : communities.slice(max);
  return (
    <span className={cn('flex items-center gap-1.5', max === undefined && 'flex-wrap')}>
      {communities.slice(0, max).map((c) => (
        <span key={c.id} className="inline-flex min-w-0 items-center gap-1">
          <CommunityChip name={c.name} tint={c.tint} icon={c.icon} className="max-w-36" />
          {c.taggedBy === 'ai' ? <AiMark /> : null}
        </span>
      ))}
      {rest.length ? (
        <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-white/70 px-2.5 text-caption text-ink">
          <span aria-hidden="true">+{rest.length}</span>
          <span className="sr-only">
            and{' '}
            {rest.map((c) => `${c.name}${c.taggedBy === 'ai' ? ' (tagged by AI)' : ''}`).join(', ')}
          </span>
        </span>
      ) : null}
    </span>
  );
}
