import type { PersonRow } from '@fellow-owners/shared';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { GlassPanel } from '@/components/shared/glass-panel';

export interface RisingStripProps {
  /** Top rising fans this fortnight (PeoplePage.rising). */
  people: PersonRow[];
  onOpen: (person: PersonRow) => void;
}

/**
 * A glass strip of 48px avatar buttons, each with the name and the first community, opening that fan's
 * side panel. The row fills the panel on wide screens and scrolls sideways when ten no longer fit.
 */
export function RisingStrip({ people, onOpen }: RisingStripProps) {
  return (
    <GlassPanel as="section" aria-labelledby="rising-title" className="min-w-0 rounded-panel p-6">
      <h2 id="rising-title" className="text-h2 text-ink">
        Rising this fortnight
      </h2>
      <p className="mt-1 text-small text-ink-soft">
        Fans drawing the most signals, replies and crew joins over the last 14 days.
      </p>
      {people.length > 0 ? (
        // 4px inside the scroll box keeps the focus ring clear of its edges.
        <ul className="-mx-1 mt-3 grid auto-cols-[minmax(6rem,1fr)] grid-flow-col overflow-x-auto px-1 py-1">
          {people.map((person) => (
            <li key={person.membershipId} className="min-w-0">
              <button
                type="button"
                onClick={() => onOpen(person)}
                className="press flex min-h-11 w-full flex-col items-center gap-2 rounded-xl px-1 py-3 text-center transition-colors duration-150 ease-out-quart hover:bg-white/70"
              >
                <AvatarInitials name={person.name} image={person.image} size={48} />
                <span className="flex w-full min-w-0 flex-col">
                  <span className="truncate text-small-strong text-ink">{person.name}</span>
                  <span className="truncate text-small text-ink-soft">
                    {person.communities[0]?.name ?? 'New fan'}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-body text-ink">
          Nobody is rising yet. Signals and replies over the next two weeks put fans here.
        </p>
      )}
    </GlassPanel>
  );
}
