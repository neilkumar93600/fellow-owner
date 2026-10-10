import { cn } from '@/components/ui/cn';
import { formatCompact } from '@/lib/format';

export interface CountChip {
  key: string;
  label: string;
  count: number;
  active: boolean;
  onSelect: () => void;
}

export interface CountChipsProps {
  /** The group's accessible name: "Filter ideas by community". */
  label: string;
  chips: CountChip[];
  className?: string;
}

/**
 * DESIGN.md Count chips (Ideas): a full-width glass band (radius 28, 8px padding, which is also the focus
 * ring's clearance) that scrolls sideways; the last chip clips at the edge to show there is more. Each
 * chip is an 80px Paper White card, 160px wide or wider for a long name: a Small ink-muted label over a Count figure in ink-soft. Active:
 * ink fill, white words, aria-pressed. Hover: Pure White.
 */
export function CountChips({ label, chips, className }: CountChipsProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: toggle buttons, not form fields; a fieldset also breaks overflow scroll
    <div
      role="group"
      aria-label={label}
      className={cn('glass scrollbar-band flex gap-2 rounded-panel p-2', className)}
    >
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          aria-pressed={chip.active}
          onClick={chip.onSelect}
          className={cn(
            'press flex h-20 min-w-40 shrink-0 flex-col items-start justify-center gap-0.5 rounded-xl px-4 py-3 text-left whitespace-nowrap',
            chip.active ? 'bg-ink text-white' : 'bg-white/60 text-ink-soft hover:bg-white/90',
          )}
        >
          <span className={cn('text-small', chip.active ? 'text-white' : 'text-ink-muted')}>
            {chip.label}
          </span>
          <span className="text-count">{formatCompact(chip.count)}</span>
        </button>
      ))}
    </div>
  );
}
