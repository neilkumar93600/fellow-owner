import { Check } from 'lucide-react';
import Link from 'next/link';
import { PitchTracker } from '@/components/me/pitch-tracker';
import { buttonVariants } from '@/components/ui/button-variants';
import { routes } from '@/lib/routes';

/**
 * The pitch form's last word: the tracker at Sent, and where the reply will appear (never a dead end,
 * DESIGN Don'ts).
 */
export function PitchSent({
  handle,
  creatorName,
  showReadReceipts,
  sentAt,
}: {
  handle: string;
  creatorName: string;
  showReadReceipts: boolean;
  sentAt: string;
}) {
  return (
    <section
      aria-labelledby="pitch-sent-title"
      className="flex flex-col items-start gap-4 glass-strong p-6 sm:p-8"
    >
      <span
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-md bg-aurora-mint"
      >
        <Check strokeWidth={1.5} className="size-6 text-[#22694f]" />
      </span>
      <h2 id="pitch-sent-title" tabIndex={-1} className="text-h2 text-ink">
        Idea sent
      </h2>
      <p className="max-w-[60ch] text-body text-ink">
        {creatorName} reads ideas here. Replies show up in My space.
      </p>
      <PitchTracker
        pitch={{
          status: 'new',
          createdAt: sentAt,
          readAt: null,
          shortlistedAt: null,
          repliedAt: null,
        }}
        showReadReceipts={showReadReceipts}
        className="w-full max-w-[30rem]"
      />
      <p className="max-w-[60ch] text-small text-ink-soft">
        You’ll see it move when {creatorName}{' '}
        {showReadReceipts ? 'reads it' : 'shortlists or replies'}.
      </p>
      <Link
        href={`${routes.fan.me(handle)}?tab=pitches`}
        className={buttonVariants({ variant: 'secondary' })}
      >
        See my ideas
      </Link>
    </section>
  );
}
