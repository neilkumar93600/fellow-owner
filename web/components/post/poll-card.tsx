import type { Poll } from '@fellow-owners/shared';

/**
 * F4: a post's poll (vote, then results; results after voting or once closed). Wave A stub, not
 * rendered yet; B3 builds it on usePoll / useVotePoll / useClosePoll (hooks/queries/use-polls) and
 * places it in post-detail.tsx.
 */
export function PollCard(_props: { postId: string; initialPoll?: Poll | null }): null {
  return null;
}
