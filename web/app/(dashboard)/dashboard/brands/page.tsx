import type { Metadata } from 'next';
import { BrandsScreen } from '@/components/dashboard/brands/brands-screen';

export const metadata: Metadata = { title: 'Brand deals' };

export default function Page() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">Brand deals</h1>
      <BrandsScreen />
    </div>
  );
}
