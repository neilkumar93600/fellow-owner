import type { LucideIcon } from 'lucide-react';
import type * as React from 'react';
import { type CardTint, TINT_STYLES } from '@/components/shared/tint';
import { cn } from '@/components/ui/cn';
import { ApiError } from '@/lib/fetcher';

/** One account card: a tinted icon tile, a title and its content (Settings > Account, /account). */
export function AccountCard({
  icon: Icon,
  tint,
  title,
  wide = false,
  children,
}: {
  icon: LucideIcon;
  tint: CardTint;
  title: string;
  /** Full row instead of half (forms and lists). */
  wide?: boolean;
  children: React.ReactNode;
}) {
  const style = TINT_STYLES[tint];
  return (
    <section
      className={cn(
        'col-span-12 flex items-start gap-4 glass rounded-panel p-6',
        !wide && '@3xl:col-span-6',
      )}
    >
      <span className={cn('grid size-14 shrink-0 place-items-center rounded-md', style.tile)}>
        <Icon aria-hidden="true" strokeWidth={1.5} className={cn('size-6', style.icon)} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
        <h2 className="text-h2 text-ink">{title}</h2>
        {children}
      </div>
    </section>
  );
}

/** A Better Auth client call as data or an ApiError (its code, and words for people). */
export type AuthOutcome<T> = { data: T } | { error: ApiError };

export async function authCall<T>(
  call: () => Promise<{
    data: T | null;
    error: { status?: number; code?: string; message?: string } | null;
  }>,
): Promise<AuthOutcome<T>> {
  try {
    const { data, error } = await call();
    if (error) {
      return {
        error: new ApiError(
          error.status ?? 0,
          error.code ?? 'auth_error',
          error.message ?? 'Something went wrong. Try again.',
        ),
      };
    }
    return { data: data as T };
  } catch {
    return {
      error: new ApiError(0, 'network', 'Couldn’t reach Fellow Owners. Check your connection.'),
    };
  }
}
