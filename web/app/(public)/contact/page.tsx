import { Copyright, LifeBuoy, Lock, type LucideIcon, Scale } from 'lucide-react';
import type { Metadata } from 'next';
import { PageFrame } from '@/components/marketing/page-frame';
import { type CardTint, TINT_STYLES } from '@/components/shared/tint';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { DISPLAY_H1 } from '@/lib/constants';
import { CONTACT, MIN_AGE, OPERATOR, RESPONSE_DAYS } from '@/lib/legal';

/*
 * Honest channels only: the four addresses from shared CONTACT and the postal address from OPERATOR. No
 * form, because a form would only send the same email without leaving the sender a copy. Support is the
 * one coral action; the other mailboxes are secondary.
 */

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Reach the Fellow Owners team: support, privacy, legal and copyright addresses, what each one is for and how soon we reply.',
  alternates: { canonical: '/contact' },
};

interface Channel {
  name: string;
  address: string;
  forWhat: string;
  reply: string;
  tint: CardTint;
  icon: LucideIcon;
  primary?: boolean;
}

// ponytail: reply times other than privacy are our targets, not contractual; confirm them before launch.
const CHANNELS: readonly Channel[] = [
  {
    name: 'Support',
    address: CONTACT.support,
    forWhat:
      'Help with your account, your space or signing in, a bug report, or a charge in our name.',
    reply: 'We aim to reply within two working days.',
    tint: 'peach',
    icon: LifeBuoy,
    primary: true,
  },
  {
    name: 'Privacy',
    address: CONTACT.privacy,
    forWhat:
      'A copy of your data, deleting your account, withdrawing consent, or a question about cookies.',
    reply: `Within ${RESPONSE_DAYS} days, as the privacy policy commits. An account of someone under ${MIN_AGE} is removed within 48 hours.`,
    tint: 'lavender',
    icon: Lock,
  },
  {
    name: 'Legal',
    address: CONTACT.legal,
    forWhat: 'Formal notices, questions about the terms, and disputes you would like to settle.',
    reply: 'We aim to reply within five working days.',
    tint: 'aqua',
    icon: Scale,
  },
  {
    name: 'Copyright',
    address: CONTACT.copyright,
    forWhat:
      'A takedown notice for work posted without permission. The terms list what a notice needs.',
    reply: 'We review complete notices within two working days.',
    tint: 'white',
    icon: Copyright,
  },
];

export default function Page() {
  return (
    <PageFrame>
      <header className="max-w-[68ch]">
        <h1 className={DISPLAY_H1}>
          Talk to <em>a person</em>.
        </h1>
        <p className="mt-3 text-body text-ink">
          Each address below reaches the Fellow Owners team. Pick the one that fits and write to us
          from your own email, so you keep a copy of everything you send.
        </p>
      </header>

      <ul aria-label="Email addresses" className="mt-8 grid gap-5 sm:grid-cols-2">
        {CHANNELS.map((channel) => {
          const style = TINT_STYLES[channel.tint];
          const Icon = channel.icon;
          return (
            <li
              key={channel.name}
              className={cn('flex min-w-0 flex-col rounded-3xl p-6', style.card)}
            >
              <div className="flex items-center gap-4">
                <span
                  className={cn('grid size-14 shrink-0 place-items-center rounded-md', style.tile)}
                >
                  <Icon aria-hidden className={cn('size-6 stroke-[1.5]', style.icon)} />
                </span>
                <h2 className="text-h1 text-ink">{channel.name}</h2>
              </div>
              <p className="mt-5 flex-1 text-body text-ink">{channel.forWhat}</p>
              <p className="mt-3 text-small text-ink-soft">{channel.reply}</p>
              <a
                href={`mailto:${channel.address}`}
                className={cn(
                  channel.primary
                    ? buttonVariants()
                    : buttonVariants({ variant: 'secondary', surface: 'card' }),
                  'mt-5 w-full min-w-0',
                )}
              >
                <span className="truncate">{channel.address}</span>
              </a>
            </li>
          );
        })}
      </ul>

      <section
        aria-labelledby="post-title"
        className="mt-5 rounded-3xl border border-white/70 bg-white/60 p-6"
      >
        <h2 id="post-title" className="text-h2 text-ink">
          By post
        </h2>
        <address className="mt-2 text-body text-ink not-italic">
          {OPERATOR.entity}
          <br />
          {OPERATOR.address}
        </address>
        <p className="mt-3 text-small text-ink-soft">
          For formal notices that must arrive on paper. Email is faster for everything else.
        </p>
      </section>
    </PageFrame>
  );
}
