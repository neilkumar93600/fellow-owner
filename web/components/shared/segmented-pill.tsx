import type { LucideIcon } from 'lucide-react';
import { cn } from '@/components/ui/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** A 16px Lucide icon before the label. */
  icon?: LucideIcon;
}

export interface SegmentedPillProps<T extends string> {
  /** The group's accessible name: "Ideas view". */
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * DESIGN.md Segmented pill (Ideas: Ranked or Board): a glass pill with 4px padding and 40px segments.
 * Selected: a white pill, Label in ink, aria-pressed. Unselected: Body in ink-soft, white 60% on
 * hover. The caller writes the choice to the URL (?view=).
 */
export function SegmentedPill<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedPillProps<T>) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: toggle buttons, not form fields; a fieldset also breaks overflow scroll
    <div
      role="group"
      aria-label={label}
      className={cn('glass inline-flex items-center gap-1 rounded-full p-1', className)}
    >
      {options.map((option) => {
        const selected = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => {
              if (!selected) onChange(option.value);
            }}
            className={cn(
              'press flex h-10 shrink-0 items-center gap-2 rounded-full px-4 whitespace-nowrap',
              selected
                ? 'bg-white text-label text-ink shadow-[0_2px_8px_-4px_rgb(40_30_60/0.25)]'
                : 'text-body text-ink-soft hover:bg-white/60',
            )}
          >
            {Icon ? <Icon aria-hidden="true" strokeWidth={1.5} className="size-4" /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
