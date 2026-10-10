import { POST_TYPES } from '@fellow-owners/shared';
import type { Metadata } from 'next';
import { ChallengeEntryContainer } from '@/components/post/challenge-entry-container';
import { PostFormContainer } from '@/components/post/post-form-container';
import { PageHeading } from '@/components/shared/page-heading';

export const metadata: Metadata = { title: 'New post' };

type Props = {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewPostPage({ params, searchParams }: Props) {
  const [{ handle }, query] = await Promise.all([params, searchParams]);
  const challengeId = typeof query.challenge === 'string' ? query.challenge : null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeading
        title={challengeId ? 'Enter the challenge' : 'New post'}
        description={
          challengeId
            ? 'Your entry is an idea post. The creator shortlists the best when the challenge closes.'
            : 'Share an idea, start a fan project or open a discussion in one of your rooms.'
        }
      />
      {challengeId ? (
        <ChallengeEntryContainer handle={handle} challengeId={challengeId} />
      ) : (
        <PostFormContainer
          handle={handle}
          community={typeof query.community === 'string' ? query.community : undefined}
          type={POST_TYPES.find((value) => value === query.type)}
        />
      )}
    </div>
  );
}
