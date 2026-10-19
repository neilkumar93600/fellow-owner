'use client';

import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { Toaster } from 'sonner';
import { useMediaQuery } from '@/hooks/use-media-query';

/**
 * Phones carry a 64px floating bottom nav 12px above the safe area; toasts sit 12px above it. sonner
 * reads `mobileOffset` up to 600px and `offset` beyond, so both clear it below 768px.
 */
const NAV_CLEARANCE = { bottom: 'calc(88px + env(safe-area-inset-bottom))' };

const TOAST_ICONS = {
  success: <CircleCheck aria-hidden className="size-5" strokeWidth={1.5} />,
  error: <CircleAlert aria-hidden className="size-5 text-danger" strokeWidth={1.5} />,
  close: <X aria-hidden className="size-5" strokeWidth={1.5} />,
};

/**
 * DESIGN.md Toast: Pure White, radius 16, 1px line border, flat (no shadow), Body ink. Unstyled sonner,
 * so these classes are the whole look. sonner's own `outline: none` on a toast is unlayered CSS, hence
 * the important focus ring. Retry and the close ghost get a 44px hit area for fan pages.
 */
const TOAST_CLASSES = {
  toast:
    'flex w-(--width) items-center gap-3 rounded-lg border border-line bg-card-strong px-4 py-3 font-sans text-body text-ink focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-purple! [&[data-expanded=false][data-front=false]>*]:opacity-0',
  icon: 'flex size-5 shrink-0 items-center justify-center',
  content: 'flex min-w-0 flex-1 flex-col gap-0.5',
  description: 'text-small text-ink-muted',
  actionButton:
    'relative h-9 shrink-0 rounded-full border border-line bg-card-strong px-4 font-medium text-body text-ink transition-[background-color,transform] duration-150 ease-out-quart before:absolute before:-inset-1 hover:bg-page active:scale-[0.98]',
  closeButton:
    'relative order-last grid size-8 shrink-0 place-items-center rounded-full text-ink transition-[background-color,transform] duration-150 ease-out-quart before:absolute before:-inset-1.5 hover:bg-page active:scale-[0.98]',
};

/** sonner's Toaster with the app's look. Loaded on its own (providers.tsx), so no page ships sonner up front. */
export default function AppToaster() {
  const wide = useMediaQuery('(min-width: 768px)');
  return (
    <Toaster
      position={wide ? 'bottom-right' : 'bottom-center'}
      offset={wide ? undefined : NAV_CLEARANCE}
      mobileOffset={NAV_CLEARANCE}
      duration={6000}
      gap={12}
      containerAriaLabel="Notifications"
      icons={TOAST_ICONS}
      toastOptions={{
        unstyled: true,
        closeButtonAriaLabel: 'Dismiss',
        classNames: TOAST_CLASSES,
      }}
    />
  );
}
