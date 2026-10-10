import { CommunityFeedSkeleton } from '@/components/community/feed';

// The content area while the community's page streams in; the fan shell around it stays put.
export default function Loading() {
  return <CommunityFeedSkeleton />;
}
