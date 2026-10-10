import type { CreatorAsset } from '@/lib/creator-assets';
import type { StepIndex } from './onboarding-templates';

/** One picture behind the live preview, per onboarding step (from 1024px; phones never see it). */
export interface OnboardingArt {
  /** A generated vlog still (lib/creator-assets). */
  name: CreatorAsset;
  /** A literal Tailwind object-position class that keeps the point of interest; the panel is much taller than the 8:5 still. */
  focus: string;
}

/**
 * The four step pictures: vlog stills from Mira's trip. The phone preview covers the middle of each, so
 * the detail sits at the left and right edges. A step set to null shows the bare aurora.
 */
export const ONBOARDING_ART: Record<StepIndex, OnboardingArt | null> = {
  0: { name: 'vlog-lisbon', focus: 'object-[30%_50%]' },
  1: { name: 'vlog-hostel', focus: 'object-[70%_50%]' },
  2: { name: 'vlog-night-market', focus: 'object-[35%_50%]' },
  3: { name: 'vlog-mountain', focus: 'object-[60%_50%]' },
};
