'use client';

import { DAILY_CAPS } from '@fellow-owners/shared';
import { Banner } from '@/components/shared/banner';
import { PageHeading } from '@/components/shared/page-heading';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/hooks/queries/use-me';
import { useSendPitch } from '@/hooks/queries/use-pitches';
import { useSpacePage } from '@/hooks/queries/use-space-page';
import { PitchForm } from './pitch-form';

export interface PitchFormContainerProps {
  handle: string;
}

export function PitchFormContainer({ handle }: PitchFormContainerProps) {
  // The form is open to non-members (their first pitch creates the membership), and /me is 403 for them:
  // the creator's name comes from the public page, the caps and receipts setting from /me when it answers.
  const pageQuery = useSpacePage(handle);
  const meQuery = useMe(handle);
  const sendPitchMutation = useSendPitch(handle);

  if (pageQuery.error) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeading
          title="Send an idea"
          description="A collab, a brand deal, an idea, press or a note."
        />
        <Banner>Failed to load. Please try again.</Banner>
      </div>
    );
  }

  if (pageQuery.isLoading || !pageQuery.data || meQuery.isLoading) {
    const creator = 'the creator';
    return (
      <div className="flex flex-col gap-6">
        <PageHeading
          title={`Send ${creator} an idea`}
          description={`A collab, a brand deal, an idea, press or a note. ${creator} reads these here, and replies show up in My space.`}
        />
        <div aria-busy="true" className="flex flex-col gap-6 glass-strong p-6 sm:p-8">
          <span className="sr-only" role="status">
            Loading
          </span>
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-24" />
        </div>
      </div>
    );
  }

  const creator = pageQuery.data.space.displayName.split(' ')[0] ?? 'the creator';

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title={`Send ${creator} an idea`}
        description={`A collab, a brand deal, an idea, press or a note. ${creator} reads these here, and replies show up in My space.`}
      />
      <PitchForm
        handle={handle}
        creatorName={creator}
        pitchesLeftToday={meQuery.data?.caps.pitchesLeftToday ?? DAILY_CAPS.pitches}
        showReadReceipts={meQuery.data?.space.showReadReceipts ?? true}
        coachSample={null}
        sendPitchMutation={sendPitchMutation}
      />
    </div>
  );
}
