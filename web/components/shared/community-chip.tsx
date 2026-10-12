import type { CommunityIcon, Tint } from '@fellow-owners/shared';
import { cn } from '@/components/ui/cn';
import { COMMUNITY_ICON, cardTint, TINT_STYLES } from './tint';

export interface CommunityChipProps {
  name: string;
  tint: Tint;
  icon: CommunityIcon;
  className?: string;
}

/** Community chip: a 24px hairline pill in the community's pastel tint, its 16px Lucide icon and mono caps ink name. */
export function CommunityChip({ name, tint, icon, className }: CommunityChipProps) {
  const Icon = COMMUNITY_ICON[icon];
  return (
    <span
      className={cn(
        'inline-flex h-6 max-w-full shrink-0 items-center gap-1.5 rounded-full border border-line px-2.5 text-caption text-ink uppercase',
        TINT_STYLES[cardTint(tint)].chip,
        className,
      )}
    >
      <Icon aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0" />
      <span className="truncate">{name}</span>
    </span>
  );
}
