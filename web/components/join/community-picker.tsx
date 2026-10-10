import type { PublicCommunity } from '@fellow-owners/shared';
import { Check } from 'lucide-react';
import { CommunityCover } from '@/components/bio/community-cover';
import { AiChip } from '@/components/shared/ai-chip';
import { cn } from '@/components/ui/cn';
import { formatNumber, pluralize } from '@/lib/format';

export interface CommunityPickerProps {
  communities: PublicCommunity[];
  selected: readonly string[];
  onChange: (id: string, selected: boolean) => void;
  /** AI suggestions by community id: the reason line, in the fan's own words. */
  reasons: Readonly<Record<string, string>>;
}

/**
 * DESIGN.md Join room tiles: every room as a selectable frosted tile with its cover photo (a native
 * checkbox, so role checkbox and its checked state come for free), two columns from a 576px column and
 * one on phones. A selected tile gets a 2px ink border and a check; suggested tiles carry the
 * "AI suggested" chip and their reason. The whole tile is 44px or more.
 */
export function CommunityPicker({
  communities,
  selected,
  onChange,
  reasons,
}: CommunityPickerProps) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 text-small-strong text-ink">Rooms</legend>
      <div className="grid gap-4 @xl:grid-cols-2">
        {communities.map((community) => {
          const on = selected.includes(community.id);
          const nameId = `join-${community.slug}-name`;
          const reasonId = `join-${community.slug}-reason`;
          return (
            // A native checkbox carries the role and state; the label is the tile and wears its focus ring.
            <label
              key={community.id}
              className={cn(
                'glass group press relative flex cursor-pointer flex-col overflow-hidden border-2 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink',
                on ? 'border-ink' : 'border-transparent',
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={on}
                onChange={(event) => onChange(community.id, event.target.checked)}
                aria-labelledby={nameId}
                aria-describedby={reasons[community.id] ? reasonId : undefined}
              />
              <span className="relative block aspect-[16/7] w-full overflow-hidden">
                <CommunityCover
                  slug={community.slug}
                  name={community.name}
                  tint={community.tint}
                  icon={community.icon}
                  coverUrl={community.coverUrl}
                  sizes="(min-width: 576px) 380px, 100vw"
                />
                {on ? (
                  <span className="absolute top-3 right-3 grid size-7 place-items-center rounded-full bg-ink text-white">
                    <Check aria-hidden="true" strokeWidth={2} className="size-4" />
                  </span>
                ) : null}
              </span>
              <span className="flex flex-col gap-1.5 p-4">
                <span id={nameId} className="text-h2 text-ink">
                  {community.name}
                </span>
                <span className="text-small text-ink-soft">
                  <span className="tabular-nums">{formatNumber(community.memberCount)}</span>{' '}
                  {pluralize(community.memberCount, 'fan')}
                </span>
                {community.description ? (
                  <span className="line-clamp-2 text-body text-ink">{community.description}</span>
                ) : null}
                {reasons[community.id] ? (
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <AiChip kind="suggested" />
                    <span id={reasonId} className="text-small text-ink-soft">
                      {reasons[community.id]}
                    </span>
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
