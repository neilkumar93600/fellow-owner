import { CommunityChip } from '@/components/shared/community-chip';
import { CreatorImage } from '@/components/shared/creator-image';
import { COMMUNITY_ICON, cardTint, TINT_STYLES } from '@/components/shared/tint';
import { getSpacePage } from '@/lib/server-api';
import { cx } from './auth-classes';
import { AuthPanelLine } from './auth-switch';

/** The seeded demo creator (api seed); the panel shows her space as the example. */
const DEMO_HANDLE = 'mira';

/** The demo bio page, or null when it is not seeded or the API is down: the panel then drops its demo bits. */
async function demoSpace() {
  try {
    return await getSpacePage(DEMO_HANDLE);
  } catch {
    return null;
  }
}

/**
 * The right half of the auth frame, from 1024px: Mira's photo fills it (hidden below 1024px, so phones
 * never load it), inset 8px with radius 24, as tall as the frame. Words never sit on the picture: a glass
 * demo pill top left, and a frosted caption card at the bottom with the headline, this screen's line and
 * the demo space's communities as chips. Static, no entrance. A server component that reads the demo
 * space from the API.
 */
export async function AuthPanel() {
  const spacePage = await demoSpace();
  const space = spacePage?.space;
  return (
    <section
      aria-label="About Fellow Owners"
      className="relative hidden min-w-0 overflow-hidden rounded-2xl lg:block"
    >
      <CreatorImage name="auth-art" alt="" fill sizes="50vw" className="object-[72%_45%]" />
      {spacePage && space ? (
        <p className="absolute top-4 left-4 flex items-center gap-3 glass-chip py-2 pr-5 pl-2">
          <span aria-hidden className="flex -space-x-2">
            {spacePage.communities.slice(0, 3).map((community) => {
              const Icon = COMMUNITY_ICON[community.icon];
              const tint = TINT_STYLES[cardTint(community.tint)];
              return (
                <span
                  key={community.id}
                  className={cx(
                    'grid size-8 place-items-center rounded-full ring-2 ring-card-strong',
                    tint.tile,
                    tint.icon,
                  )}
                >
                  <Icon size={16} strokeWidth={1.5} />
                </span>
              );
            })}
          </span>
          <span className="flex flex-col">
            <span className="text-small-strong text-ink">Demo: {space.displayName}’s space</span>
            <span className="text-small text-ink-soft">
              {space.memberCount.toLocaleString('en-US')} fans in {spacePage.communities.length}{' '}
              communities
            </span>
          </span>
        </p>
      ) : null}
      <div className="absolute inset-x-4 bottom-4 mx-auto max-w-[32rem] glass-strong !rounded-[1.25rem] p-5 xl:inset-x-6 xl:bottom-6 xl:p-6">
        <p className="text-h1 text-balance text-ink xl:text-display">
          Turn followers into fellow owners.
        </p>
        <AuthPanelLine className="mt-2 text-body text-pretty text-ink-soft" />
        {spacePage ? (
          <ul aria-label="Communities in the demo space" className="mt-4 flex flex-wrap gap-2">
            {spacePage.communities.map((community) => (
              <li key={community.id}>
                <CommunityChip
                  name={community.name}
                  tint={community.tint}
                  icon={community.icon}
                  className="h-8 px-3"
                />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
