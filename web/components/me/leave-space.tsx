'use client';

import type { ViewerMembership } from '@fellow-owners/shared';
import { useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { feedKeys } from '@/hooks/queries/use-feed';
import { meKeys } from '@/hooks/queries/use-me';
import { spacePageKeys } from '@/hooks/queries/use-space-page';
import { membershipKeys } from '@/hooks/use-membership';
import { leaveSpace } from '@/lib/api/moderation';
import { routes } from '@/lib/routes';
import { toastError, toastSuccess } from '@/lib/toast';

/** "Leave this space" at the foot of My space: leaves every community, keeps your posts. */
export function LeaveSpace({ handle, creator }: { handle: string; creator: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function leave() {
    setBusy(true);
    try {
      await leaveSpace(handle);
      // Membership and My space are no longer true; the bio page, feeds and Join must not paint from them.
      queryClient.setQueryData<ViewerMembership>(membershipKeys.detail(handle), (old) => ({
        signedIn: true,
        isOwner: old?.isOwner ?? false,
        membership: null,
      }));
      queryClient.removeQueries({ queryKey: meKeys.detail(handle) });
      for (const queryKey of [spacePageKeys.detail(handle), feedKeys.space(handle)]) {
        void queryClient.invalidateQueries({ queryKey });
      }
      toastSuccess(`You left ${creator}'s space`);
      router.push(routes.fan.space(handle));
    } catch (error) {
      toastError(error);
      setBusy(false);
    }
  }

  return (
    <div className="flex justify-center">
      <Button
        variant="ghost"
        size="md"
        icon={<LogOut />}
        loading={busy}
        onClick={() => setOpen(true)}
      >
        Leave this space
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Leave ${creator}'s space?`}
        body="You leave all its communities. Your posts stay."
        confirmLabel="Leave space"
        icon={<LogOut />}
        onConfirm={() => void leave()}
      />
    </div>
  );
}
