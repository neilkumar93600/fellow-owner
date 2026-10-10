import type { Metadata } from 'next';
import { CommunitiesView } from '@/components/dashboard/communities/communities-view';

export const metadata: Metadata = { title: 'Communities' };

export default function Page() {
  return <CommunitiesView />;
}
