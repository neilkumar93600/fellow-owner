import type { Metadata } from 'next';
import { PlannerScreen } from '@/components/dashboard/planner/planner-screen';

export const metadata: Metadata = { title: 'Planner' };

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Planner</h1>
      <PlannerScreen />
    </div>
  );
}
