import Link from 'next/link';
import type * as React from 'react';
import { JsonLd } from '@/components/shared/json-ld';
import { cn } from '@/components/ui/cn';
import { breadcrumbJsonLd, type Crumb } from '@/lib/seo';

/*
 * The shadcn Breadcrumb anatomy (Breadcrumb, List, Item, Link, Page, Separator: same elements and
 * data-slots), kept local until the UI kit adds components/ui/breadcrumb; then these parts swap for it.
 * The current page is a plain span with aria-current: shadcn's role="link" on a span that cannot take
 * focus fails the a11y lint.
 * Parchment Frost: mono caption caps in graphite, Ash hairline separators instead of chevrons, the current
 * page in ink and truncated when the column is narrow. Links are 44px tall for fan pages.
 */

function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        'flex min-w-0 items-center gap-3 text-caption text-ink-soft uppercase',
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn('inline-flex items-center', className)}
      {...props}
    />
  );
}

function BreadcrumbLink({ className, ...props }: React.ComponentProps<typeof Link>) {
  return (
    <Link
      data-slot="breadcrumb-link"
      className={cn(
        'inline-flex min-h-11 items-center underline-offset-4 transition-colors hover:text-ink hover:underline',
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-page"
      aria-current="page"
      className={cn('truncate text-ink', className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn('h-3.5 w-px shrink-0 rotate-20 bg-line', className)}
      {...props}
    />
  );
}

/** Visible breadcrumbs and their BreadcrumbList structured data, from one list so the two never drift. */
export function Breadcrumbs({
  crumbs,
  className,
}: {
  crumbs: readonly Crumb[];
  className?: string;
}) {
  const last = crumbs.length - 1;
  return (
    <nav aria-label="Breadcrumb" data-slot="breadcrumb" className={cn('min-w-0', className)}>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <BreadcrumbList>
        {crumbs.map((crumb, index) => [
          index > 0 ? <BreadcrumbSeparator key={`${crumb.path}-sep`} /> : null,
          <BreadcrumbItem key={crumb.path} className={index === last ? 'min-w-0' : 'shrink-0'}>
            {index === last ? (
              <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
            ) : (
              <BreadcrumbLink href={crumb.path}>{crumb.name}</BreadcrumbLink>
            )}
          </BreadcrumbItem>,
        ])}
      </BreadcrumbList>
    </nav>
  );
}
