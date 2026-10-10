import type { Metadata } from 'next';
import { ChallengeDetailScreen } from '@/components/dashboard/challenges/challenge-detail-screen';

export const metadata: Metadata = { title: 'Challenge' };

type Params = Promise<{ id: string }>;

export default async function Page({ params }: { params: Params }) {
  const { id } = await params;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Challenge</h1>
      <ChallengeDetailScreen id={id} />
    </div>
  );
}
