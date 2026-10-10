'use client';

import { Upload } from 'lucide-react';
import Link from 'next/link';
import { TINT_STYLES } from '@/components/shared/tint';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { routes } from '@/lib/routes';

/**
 * Settings, Import audience tab: import followers from CSV or pasted comments,
 * let AI suggest communities and tags.
 */
export function ImportAudienceCard() {
  const style = TINT_STYLES.lavender;

  return (
    <div className="grid grid-cols-12 gap-5">
      <section className="col-span-12 flex items-start gap-4 glass rounded-panel p-6 @3xl:col-span-6">
        <span className={cn('grid size-14 shrink-0 place-items-center rounded-md', style.tile)}>
          <Upload aria-hidden="true" strokeWidth={1.5} className={cn('size-6', style.icon)} />
        </span>
        <div className="flex min-w-0 flex-col items-start gap-2">
          <h2 className="text-h2 text-ink">Import audience</h2>
          <p className="text-body text-ink">
            Import followers from a CSV or pasted comments. AI will suggest communities and tags for
            each person.
          </p>
          <Link
            href={routes.dashboard.followers({ import: true })}
            className={cn(buttonVariants({ variant: 'primary', surface: 'card' }), 'mt-3')}
          >
            Start importing
          </Link>
        </div>
      </section>
    </div>
  );
}
