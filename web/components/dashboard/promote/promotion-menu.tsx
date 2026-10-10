'use client';

import type { Promotion } from '@fellow-owners/shared';
import { Copy, EyeOff, MoreHorizontal, PenLine } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  Menu,
  MenuContent,
  MenuItem,
  MenuLinkItem,
  MenuSeparator,
  MenuTrigger,
} from '@/components/ui/menu';
import { usePromotionAction } from '@/hooks/queries/use-promotions';
import { appUrl } from '@/lib/env';
import { routes } from '@/lib/routes';
import { toastError, toastSuccess } from '@/lib/toast';

async function copyLink(p: Promotion) {
  if (!p.shortPath) return;
  try {
    await navigator.clipboard.writeText(appUrl(p.shortPath));
    toastSuccess('Link copied.');
  } catch (error) {
    toastError(error, { fallback: 'Could not copy. Open the composer and copy it there.' });
  }
}

/**
 * The "..." menu on a spotlight (a card or a table row): open the composer, copy its link, and, while
 * live, take it down behind a confirm. Owns its confirm dialog and the unpublish call.
 */
export function PromotionMenu({
  promotion,
  className,
}: {
  promotion: Promotion;
  className?: string;
}) {
  const action = usePromotionAction();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Menu>
        <MenuTrigger
          render={
            <Button
              variant="ghost"
              surface="white"
              className={className ?? 'text-ink-soft'}
              aria-label={`More actions for ${promotion.post.title}`}
            />
          }
        >
          <MoreHorizontal />
        </MenuTrigger>
        <MenuContent>
          <MenuLinkItem
            render={<Link href={routes.dashboard.promoteComposer(promotion.postId)} />}
            icon={<PenLine />}
          >
            Open composer
          </MenuLinkItem>
          <MenuItem
            icon={<Copy />}
            disabled={!promotion.shortPath}
            onClick={() => copyLink(promotion)}
          >
            Copy link
          </MenuItem>
          {promotion.state === 'live' ? (
            <>
              <MenuSeparator />
              <MenuItem destructive icon={<EyeOff />} onClick={() => setConfirmOpen(true)}>
                Take it down
              </MenuItem>
            </>
          ) : null}
        </MenuContent>
      </Menu>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Take down "${promotion.post.title}"?`}
        body="Its page comes down and the link says it is no longer featured. The people who opened it so far stay in your numbers."
        confirmLabel="Take it down"
        icon={<EyeOff />}
        onConfirm={() =>
          action.mutate(
            { id: promotion.id, action: { action: 'unpublish' } },
            {
              onSuccess: () =>
                toastSuccess('Taken down. Its link now says it is no longer featured.'),
            },
          )
        }
      />
    </>
  );
}
