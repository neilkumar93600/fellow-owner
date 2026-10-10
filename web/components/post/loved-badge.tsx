import { Heart } from 'lucide-react';
import { cn } from '@/components/ui/cn';

/** "Loved by Mira": the creator's own heart on a fan's post. Words carry it; the heart is decoration. */
export function LovedBadge({ creator, className }: { creator: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full bg-aurora-peach px-3 text-caption whitespace-nowrap text-ink',
        className,
      )}
    >
      <Heart aria-hidden="true" strokeWidth={0} className="size-3.5 fill-coral" />
      Loved by {creator}
    </span>
  );
}
