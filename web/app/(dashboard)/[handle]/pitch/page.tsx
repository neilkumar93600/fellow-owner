import type { Metadata } from 'next';
import { PitchFormContainer } from '@/components/pitch/pitch-form-container';

export const metadata: Metadata = { title: 'Send an idea' };

export default async function PitchPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <PitchFormContainer handle={handle} />;
}
