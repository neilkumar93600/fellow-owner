'use client';

import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cn } from './cn';

type WithClassName<P> = Omit<P, 'className'> & { className?: string };

/**
 * Tabs that switch panels in place (the brand inbox status filter). The list is a frosted glass pill of
 * 40px mono caps tab pills: inactive graphite with a white wash on hover, active a periwinkle chip with
 * an Ash hairline in ink. Arrow keys move between tabs and Enter or Space opens one (`activateOnFocus`
 * on the list opens on arrow). A long list scrolls sideways inside its own width on phones; its 4px
 * padding keeps the 2px ink focus ring unclipped. Tabs that change the URL (?tab=) are links: use
 * components/shared/tab-bar.tsx for those. Horizontal only.
 *
 * <Tabs defaultValue="new">
 *   <TabsList aria-label="Brand requests by status">
 *     <TabsTrigger value="new">New</TabsTrigger>
 *     <TabsTrigger value="shortlisted">Shortlisted</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="new">…</TabsContent>
 * </Tabs>
 */
export function Tabs({ className, ...props }: WithClassName<TabsPrimitive.Root.Props>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn('flex min-w-0 flex-col gap-4', className)}
      {...props}
    />
  );
}

export function TabsList({ className, ...props }: WithClassName<TabsPrimitive.List.Props>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        'glass scrollbar-band relative flex w-fit max-w-full items-center gap-1 rounded-full p-1',
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: WithClassName<TabsPrimitive.Tab.Props>) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        'press inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-transparent px-4 text-small tracking-tight whitespace-nowrap text-ink-soft uppercase',
        'not-data-active:not-data-disabled:hover:bg-white/60 not-data-active:not-data-disabled:hover:text-ink',
        'data-active:border-line data-active:bg-periwinkle data-active:font-medium data-active:text-ink',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        '[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.5]',
        className,
      )}
      {...props}
    />
  );
}

/** The panel. It takes focus after the list when it holds nothing focusable (global ink ring). */
export function TabsContent({ className, ...props }: WithClassName<TabsPrimitive.Panel.Props>) {
  return (
    <TabsPrimitive.Panel data-slot="tabs-content" className={cn('min-w-0', className)} {...props} />
  );
}
