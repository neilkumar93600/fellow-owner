import type { Metadata } from 'next';
import { ChallengesScreen } from '@/components/dashboard/challenges/challenges-screen';

export const metadata: Metadata = { title: 'Challenges' };

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Challenges</h1>
      <ChallengesScreen />
    </div>
  );
}
