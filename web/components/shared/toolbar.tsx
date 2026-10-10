'use client';

import { Search } from 'lucide-react';
import type * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/components/ui/cn';

export interface ToolbarProps {
  /** An H2 on the left ("Members"). */
  title?: React.ReactNode;
  /** Left controls, such as a "New promotion +" secondary pill (Button surface="glass" size="md"). */
  start?: React.ReactNode;
  /** Right controls: SearchSquare, then Select dropdowns for sort and filters. */
  end?: React.ReactNode;
  className?: string;
}

/**
 * DESIGN.md Toolbar: a frosted glass pill with 16px padding, so 72px tall around 40px controls. When the two
 * sides do not fit (phones), the right side wraps to its own line and the pill relaxes to a 28px radius.
 */
export function Toolbar({ title, start, end, className }: ToolbarProps) {
  return (
    <div
      className={cn(
        'glass flex min-h-18 flex-wrap items-center gap-3 rounded-full p-4 max-sm:rounded-panel',
        className,
      )}
    >
      {title || start ? (
        <div className="flex min-w-0 max-w-full flex-wrap items-center gap-3">
          {title ? <h2 className="pl-2 text-h2 text-ink">{title}</h2> : null}
          {start}
        </div>
      ) : null}
      {end ? (
        <div className="ml-auto flex min-w-0 flex-auto items-center justify-end gap-3">{end}</div>
      ) : null}
    </div>
  );
}

export interface SearchSquareProps {
  value: string;
  onChange: (value: string) => void;
  /** The input's accessible name: "Search pitches". */
  label: string;
  placeholder?: string;
  className?: string;
}

/**
 * DESIGN.md Search square: a 40px frosted glass square (radius 12) that swaps, without
 * animating, into a 280px search input (the free width on phones). It stays open while it holds a value;
 * Esc clears it, collapses it and puts focus back on the square.
 */
export function SearchSquare({
  value,
  onChange,
  label,
  placeholder,
  className,
}: SearchSquareProps) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const squareRef = useRef<HTMLButtonElement>(null);
  // Which control gets focus after the swap: the input on open, the square after Esc.
  const focusAfter = useRef<'input' | 'square' | null>(null);
  const expanded = open || value !== '';

  // After every render: a no-op unless a swap asked for focus and its target has mounted (a value held
  // in the URL may clear a render later than the local state).
  useEffect(() => {
    const target = focusAfter.current === 'input' ? inputRef.current : squareRef.current;
    if (!focusAfter.current || !target) return;
    target.focus();
    focusAfter.current = null;
  });

  if (!expanded) {
    return (
      <button
        ref={squareRef}
        type="button"
        aria-label={label}
        onClick={() => {
          focusAfter.current = 'input';
          setOpen(true);
        }}
        className={cn(
          'glass-chip press grid size-10 shrink-0 place-items-center rounded-sm text-ink hover:bg-white/90',
          className,
        )}
      >
        <Search aria-hidden="true" strokeWidth={1.5} className="size-5" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        'flex h-10 w-[280px] min-w-0 items-center gap-2 rounded-sm border border-white/70 bg-white/85 px-3 backdrop-blur-xl transition-colors duration-150 ease-out-quart max-sm:w-full',
        'has-focus-visible:border-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink',
        className,
      )}
    >
      <Search aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0 text-ink-soft" />
      <input
        ref={inputRef}
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          focusAfter.current = 'square';
          onChange('');
          setOpen(false);
        }}
        onBlur={() => {
          if (value === '') setOpen(false);
        }}
        className="h-full min-w-0 flex-1 bg-transparent text-body text-ink placeholder:text-ink-muted focus-visible:outline-none max-sm:text-[1rem] [&::-webkit-search-cancel-button]:hidden"
      />
    </div>
  );
}
