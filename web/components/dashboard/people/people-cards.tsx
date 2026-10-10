import type { CommunityIcon, PersonRow } from '@fellow-owners/shared';
import { Eye, Sparkles } from 'lucide-react';
import type * as React from 'react';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { Button } from '@/components/ui/button';
import { formatNumber, formatRelative, pluralize } from '@/lib/format';
import { CommunityChips } from './people-table';

export interface PeopleCardsProps {
  rows: PersonRow[];
  icons: Record<string, CommunityIcon>;
  /** The page's clock, so relative dates hydrate the same on server and client. */
  now: number;
  empty: React.ReactNode;
  onOpen: (person: PersonRow) => void;
  onSpotlight: (person: PersonRow) => void;
}

/** The default Fans view: one glass card per fan with what they do here and two actions. */
export function PeopleCards({ rows, icons, now, empty, onOpen, onSpotlight }: PeopleCardsProps) {
  if (rows.length === 0) return <>{empty}</>;
  return (
    <ul className="grid grid-cols-1 gap-5 @2xl:grid-cols-2 @5xl:grid-cols-3">
      {rows.map((person) => {
        const c = person.contributions;
        return (
          <li key={person.membershipId} className="flex min-w-0">
            <article className="glass flex min-w-0 flex-1 flex-col gap-4 rounded-[24px] p-5">
              <div className="flex items-center gap-3">
                <AvatarInitials name={person.name} image={person.image} size={48} />
                <div className="min-w-0">
                  <h3 className="truncate text-label-strong text-ink">{person.name}</h3>
                  <p className="truncate text-small text-ink-soft">
                    {person.headline ?? `Joined ${formatRelative(person.joinedAt, now)}`}
                  </p>
                </div>
              </div>
              <CommunityChips communities={person.communities} icons={icons} max={2} />
              <p className="text-small text-ink-soft">
                <span className="tabular-nums">{formatNumber(c.signalsReceived)}</span>{' '}
                {pluralize(c.signalsReceived, 'signal')} ·{' '}
                <span className="tabular-nums">{formatNumber(c.posts)}</span>{' '}
                {pluralize(c.posts, 'idea')} ·{' '}
                <span className="tabular-nums">{formatNumber(c.comments)}</span>{' '}
                {pluralize(c.comments, 'comment')}
              </p>
              <div className="mt-auto flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  surface="glass"
                  icon={<Eye />}
                  onClick={() => onOpen(person)}
                >
                  View<span className="sr-only"> {person.name}</span>
                </Button>
                <Button
                  variant="secondary"
                  surface="glass"
                  icon={<Sparkles />}
                  onClick={() => onSpotlight(person)}
                >
                  Spotlight<span className="sr-only"> {person.name}</span>
                </Button>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
