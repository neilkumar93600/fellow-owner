import { Plus } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';

/**
 * The phones' New post: a pill that floats 16px above the bottom edge (plus the safe area) at the right
 * of the column, coral unless an open challenge holds the page's coral action. It is sticky at the end of
 * the feed rather than fixed, so it rides over the cards while the feed scrolls and settles below the
 * list, never over the footer links. From 640px the header carries New post instead. Render it as the
 * last child of the feed's column.
 */
export function NewPostFab({ href, primary = true }: { href: string; primary?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        buttonVariants({ variant: primary ? 'primary' : 'secondary' }),
        'sticky bottom-[calc(1rem+env(safe-area-inset-bottom))] z-20 self-end sm:hidden',
      )}
    >
      <Plus aria-hidden="true" className="size-5" />
      New post
    </Link>
  );
}
