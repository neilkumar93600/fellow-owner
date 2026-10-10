import type { CreatePitchInput, MySpace } from '@fellow-owners/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { withdrawPitch } from '@/api/pitches';
import { createPitch } from '@/api/spaces';
import { readSession, writeSession } from '@/components/auth/auth-storage';
import { meKeys } from '@/hooks/queries/use-me';
import { membershipKeys } from '@/hooks/use-membership';
import { toastError } from '@/lib/toast';

// The sender's pitches are read through useMe (MySpace.pitches); this file only writes.

/** Mutation keys, for useIsMutating. */
export const pitchKeys = {
  all: ['pitches'] as const,
  send: (handle: string) => [...pitchKeys.all, 'send', handle] as const,
  withdraw: () => [...pitchKeys.all, 'withdraw'] as const,
};

/** The type of useSendPitch mutation. */
export type SendPitchMutation = ReturnType<typeof useSendPitch>;

/** The pitch form's values while it is being written. */
export type PitchDraft = Partial<CreatePitchInput>;

function draftKey(handle: string): string {
  return `fo:pitch-draft:${handle}`;
}

/** The unsent pitch to this space, or null. sessionStorage, so it survives a sign-in round trip. */
export function loadPitchDraft(handle: string): PitchDraft | null {
  const raw = readSession(draftKey(handle));
  if (!raw) return null;
  try {
    const draft: unknown = JSON.parse(raw);
    return draft !== null && typeof draft === 'object' ? (draft as PitchDraft) : null;
  } catch {
    return null;
  }
}

export function savePitchDraft(handle: string, draft: PitchDraft): void {
  writeSession(draftKey(handle), JSON.stringify(draft));
}

export function clearPitchDraft(handle: string): void {
  writeSession(draftKey(handle), null);
}

/**
 * Sends a pitch. The values stay saved as the draft until the API accepts them, so a failed send or
 * a sign-in redirect loses nothing. Errors (fields, the 429 daily cap message) stay inline: no toast.
 */
export function useSendPitch(handle: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: pitchKeys.send(handle),
    mutationFn: (input: CreatePitchInput) => createPitch(handle, input),
    onMutate: (input) => savePitchDraft(handle, input),
    onSuccess: () => {
      clearPitchDraft(handle);
      // My space lists the pitch, and a first pitch also creates the membership.
      void queryClient.invalidateQueries({ queryKey: meKeys.detail(handle) });
      void queryClient.invalidateQueries({ queryKey: membershipKeys.detail(handle) });
    },
  });
}

/** Withdraws a pitch while it is new (409 once the creator acted); My space updates in place. Failures toast. */
export function useWithdrawPitch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: pitchKeys.withdraw(),
    mutationFn: (pitchId: string) => withdrawPitch(pitchId),
    onSuccess: (pitch) => {
      queryClient.setQueriesData<MySpace>(
        { queryKey: meKeys.all },
        (old) =>
          old && {
            ...old,
            pitches: old.pitches.map((item) => (item.id === pitch.id ? pitch : item)),
          },
      );
    },
    onError: (error) => toastError(error),
  });
}
