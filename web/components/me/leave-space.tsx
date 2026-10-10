'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { leaveSpace } from '@/api/moderation';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import { routes } from '@/lib/routes';
import { toastError, toastSuccess } from '@/lib/toast';

/** "Leave this space" at the foot of My space: leaves every community, keeps your posts. */
export function LeaveSpace({ handle, creator }: { handle: string; creator: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function leave() {
    setBusy(true);
    try {
      await leaveSpace(handle);
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
