import type { LinkItem, PostCredit } from '@fellow-owners/shared';
import { ExternalLink } from 'lucide-react';
import { AvatarInitials } from '@/components/shared/avatar-initials';

/**
 * The showcase's "Made by" block: everyone who made it, the person who started it first, each with a 40px
 * avatar, their name and the role they filled, on hairline dividers, then the project's links (44px
 * rows). A frosted card, ink words.
 */
export function ShowcaseTeam({ credits, links }: { credits: PostCredit[]; links: LinkItem[] }) {
  return (
    <section aria-labelledby="showcase-team" className="glass p-6">
      <h2 id="showcase-team" className="text-h2 text-ink">
        Made by
      </h2>
      {credits.length === 0 ? (
        <p className="mt-3 text-body text-ink">No one has joined the crew yet.</p>
      ) : (
        <ul className="mt-2 flex flex-col">
          {credits.map((credit) => (
            <li
              key={`${credit.name}-${credit.role}`}
              className="flex items-center gap-3 border-b border-ink/10 py-3 last:border-b-0"
            >
              <AvatarInitials name={credit.name} image={credit.avatarUrl} size={40} />
              <div className="flex min-w-0 flex-col">
                <p className="text-label text-ink">{credit.name}</p>
                <p className="text-small text-ink-soft">{credit.role}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {links.length > 0 ? (
        <>
          <h3 className="mt-6 text-label text-ink">Links</h3>
          <ul className="mt-1 flex flex-col">
            {links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="-mx-3 inline-flex h-11 max-w-full press items-center gap-2 rounded-full px-3 text-body text-ink underline-offset-4 hover:bg-white/80 hover:underline"
                >
                  <ExternalLink aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0" />
                  <span className="truncate">{link.label}</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
