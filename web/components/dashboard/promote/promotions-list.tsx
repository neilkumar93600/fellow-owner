'use client';

import type { CommunityIcon, Promotion } from '@fellow-owners/shared';
import Link from 'next/link';
import { CommunityChip } from '@/components/shared/community-chip';
import { CreatorImage } from '@/components/shared/creator-image';
import { GlassPanel } from '@/components/shared/glass-panel';
import { StatusPill } from '@/components/shared/status-pill';
import { CREATOR_ASSETS, type CreatorAsset } from '@/lib/creator-assets';
import { formatNumber, pluralize } from '@/lib/format';
import { routes } from '@/lib/routes';
import { PromotionMenu } from './promotion-menu';
import {
  dateLine,
  draftedFor,
  PromotionsEmpty,
  type PromotionsTab,
  TAB_STATE,
} from './promotions-table';

/** The community's cover photo when one was generated for its slug (the six demo rooms), else none. */
function coverFor(slug: string): CreatorAsset | null {
  const name = `cover-${slug}` as CreatorAsset;
  return name in CREATOR_ASSETS ? name : null;
}

/** "2.4K people opened it": the click count in a sentence, honest about drafts and take-downs. */
export function openedSentence(p: Promotion): string {
  const n = formatNumber(p.clickCount);
  const people = `${n} ${pluralize(p.clickCount, 'person', 'people')}`;
  if (p.state === 'draft') return 'Not live yet. Finish the drafts, then publish.';
  if (p.clickCount === 0)
    return p.state === 'live' ? 'No one has opened it yet.' : 'No one opened it.';
  return `${people} ${p.state === 'live' ? 'opened it' : 'opened it while it was live'}`;
}

export interface PromotionsListProps {
  items: Promotion[];
  tab: PromotionsTab;
  icons: Record<string, CommunityIcon>;
  now: number;
}

/**
 * DESIGN.md Spotlight list (the default view): one frosted card per promotion with the community's
 * cover photo, the idea (the card's link, stretched), its status, how many people opened it, and the
 * "..." menu. The Table toggle keeps the old rows.
 */
export function PromotionsList({ items, tab, icons, now }: PromotionsListProps) {
  const state = TAB_STATE[tab];
  const rows = state ? items.filter((p) => p.state === state) : items;
  if (rows.length === 0) {
    return (
      <GlassPanel strength="strong" className="rounded-panel">
        <PromotionsEmpty tab={tab} />
      </GlassPanel>
    );
  }

  return (
    <ul className="grid gap-4">
      {rows.map((p) => {
        const cover = coverFor(p.post.community.slug);
        return (
          <li key={p.id}>
            <GlassPanel
              as="article"
              className="group relative flex items-stretch gap-4 rounded-[24px] p-4 transition-colors duration-150 ease-out-quart hover:bg-white/80 sm:p-5"
            >
              {cover ? (
                <div
                  aria-hidden="true"
                  className="relative hidden w-32 shrink-0 overflow-hidden rounded-2xl sm:block"
                >
                  <CreatorImage name={cover} alt="" fill sizes="128px" />
                </div>
              ) : null}
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CommunityChip
                    name={p.post.community.name}
                    tint={p.post.community.tint}
                    icon={icons[p.post.community.slug] ?? 'users'}
                    className="max-w-48"
                  />
                  <StatusPill status={p.state} />
                </div>
                <h3 className="line-clamp-2 text-h2 text-ink">
                  <Link
                    href={routes.dashboard.promoteComposer(p.postId)}
                    className="rounded-sm underline-offset-4 group-hover:underline after:absolute after:inset-0 after:rounded-[24px]"
                  >
                    {p.post.title}
                  </Link>
                </h3>
                <p className="text-body text-ink">{openedSentence(p)}</p>
                <p className="text-small text-ink-soft">
                  Drafted for {draftedFor(p)} · {dateLine(p, now)}
                </p>
              </div>
              <div className="relative z-10 shrink-0 self-start">
                <PromotionMenu promotion={p} />
              </div>
            </GlassPanel>
          </li>
        );
      })}
    </ul>
  );
}
