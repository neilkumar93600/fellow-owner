import type { PostCredit, Showcase } from '@fellow-owners/shared';
import Link from 'next/link';
import { GlassPanel } from '@/components/shared/glass-panel';
import { buttonVariants } from '@/components/ui/button-variants';
import { formatNumber } from '@/lib/format';
import { routes } from '@/lib/routes';
import { ShowcaseHero } from './showcase-hero';
import { ShowcaseTeam } from './showcase-team';

export interface ShowcaseViewProps {
  showcase: Showcase;
  /** The absolute URL of this page, for Copy link. */
  shareUrl: string;
}

/**
 * "Made by": the API's credits when it sends them, else the author ("Started it") then the accepted
 * crew with their roles, so the block reads the same either way.
 */
export function creditsFor({ credits, post, team }: Showcase): PostCredit[] {
  if (credits) return credits;
  if (!post) return [];
  return [
    {
      name: post.author.name,
      role: 'Started it',
      avatarUrl: post.author.image ?? null,
    },
    ...team
      .filter((member) => member.name !== post.author.name)
      .map((member) => ({
        name: member.name,
        role: member.role,
        avatarUrl: member.image ?? null,
      })),
  ];
}

/**
 * The public showcase (/{handle}/s/{slug}): the cover hero, then two frosted cards, About (summary at
 * 68ch, open spots, signals) and Made by (the crew with their roles, and links). Once the creator
 * unpublishes it, the page says "No longer featured" and keeps the Join action.
 */
export function ShowcaseView({ showcase, shareUrl }: ShowcaseViewProps) {
  const { space, promotion, post } = showcase;
  const first = space.displayName.split(' ')[0];

  if (!promotion.live || !post) {
    return (
      <GlassPanel strength="strong" className="flex flex-col items-start gap-4 p-6">
        <h1 className="font-display text-[2rem] leading-[1.15] text-ink">No longer featured</h1>
        <p className="max-w-[68ch] text-body text-ink">
          {first} isn’t featuring this one anymore. Join the space to see what fans are making now.
        </p>
        <Link href={routes.fan.join(space.handle)} className={buttonVariants()}>
          Join {first}’s space
        </Link>
      </GlassPanel>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <ShowcaseHero space={space} promotion={promotion} post={post} shareUrl={shareUrl} />
      <div className="flex flex-col gap-5">
        <section aria-labelledby="showcase-about" className="glass p-6">
          <h2 id="showcase-about" className="text-h2 text-ink">
            About this one
          </h2>
          <p className="mt-3 max-w-[68ch] text-body whitespace-pre-line text-ink">{post.body}</p>
          {post.openRoles.length > 0 ? (
            <>
              <h3 className="mt-6 text-label text-ink">Open spots</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {post.openRoles.map((role) => (
                  <li
                    key={role}
                    className="inline-flex h-8 items-center rounded-full bg-white/70 px-3 text-small text-ink"
                  >
                    {role}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <p className="mt-6 text-small text-ink-soft">
            {formatNumber(post.useCount)} would use this · {formatNumber(post.buildCount)} counted
            themselves in
          </p>
        </section>
        <ShowcaseTeam credits={creditsFor(showcase)} links={post.links} />
      </div>
    </div>
  );
}
