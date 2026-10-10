import type { FanSpotlight } from '@fellow-owners/shared';
import { Sparkles } from 'lucide-react';
import { AvatarInitials } from '@/components/shared/avatar-initials';

/**
 * "Fans of the week": the creator's latest shout-outs (at most six, newest first), each a frosted card
 * with the fan's face, name, room and the note she approved. A side-scrolling row on phones, a grid from
 * a 576px column. Hidden while there are none (a new space, or an API that does not send them yet).
 */
export function FansOfTheWeek({
  firstName,
  spotlights,
}: {
  firstName: string;
  spotlights: FanSpotlight[] | undefined;
}) {
  if (!spotlights?.length) return null;
  return (
    <section aria-labelledby="bio-fans" className="flex flex-col gap-4">
      <h2 id="bio-fans" className="font-display text-[2rem] leading-[1.15] text-ink">
        Fans of the week
      </h2>
      <ul className="-mx-4 scrollbar-band flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 @xl:mx-0 @xl:grid @xl:grid-cols-2 @xl:overflow-visible @xl:px-0 @xl:pb-0">
        {spotlights.map((fan) => (
          <li key={fan.membershipId} className="flex w-[82%] shrink-0 snap-start @xl:w-auto">
            <figure className="glass-strong flex w-full flex-col gap-3 p-5">
              <figcaption className="flex items-center gap-3">
                <AvatarInitials name={fan.name} image={fan.avatarUrl} size={40} />
                <div className="min-w-0">
                  <p className="truncate text-label-strong text-ink">{fan.name}</p>
                  {fan.communityName ? (
                    <p className="truncate text-small text-ink-soft">{fan.communityName}</p>
                  ) : null}
                </div>
                <Sparkles
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="ml-auto size-5 shrink-0 text-coral"
                />
              </figcaption>
              <blockquote className="line-clamp-5 text-body text-ink">{fan.note}</blockquote>
              <p className="text-caption text-ink-soft">Spotlight from {firstName}</p>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
