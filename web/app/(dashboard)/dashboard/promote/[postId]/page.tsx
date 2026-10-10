import { LIMITS, PROMOTION_PLATFORMS } from '@fellow-owners/shared';
import type { Metadata } from 'next';
import { ComposerScreen } from '@/components/dashboard/promote/composer-screen';

export const metadata: Metadata = { title: 'Spotlight composer' };

type Params = Promise<{ postId: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function Page({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ postId }, query] = await Promise.all([params, searchParams]);
  const platform = PROMOTION_PLATFORMS.find((key) => key === query.platform) ?? 'x';
  // ?title= (from "Make it" on What fans want) seeds the headline field; nothing is saved until Mira acts.
  const headline =
    typeof query.title === 'string'
      ? query.title.trim().slice(0, LIMITS.promotion.headline.max)
      : '';

  return <ComposerScreen postId={postId} platform={platform} headlineSeed={headline} />;
}
