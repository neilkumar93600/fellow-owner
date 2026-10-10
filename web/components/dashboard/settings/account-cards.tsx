import { Bell, KeyRound, LogOut, type LucideIcon, Users } from 'lucide-react';
import Link from 'next/link';
import type * as React from 'react';
import { SIGN_OUT_HREF } from '@/components/layout/dashboard-nav';
import { type CardTint, TINT_STYLES } from '@/components/shared/tint';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';

// Honest v1 facts, no controls that do nothing.
const CARDS: { icon: LucideIcon; tint: CardTint; title: string; body: string }[] = [
  {
    icon: Bell,
    tint: 'peach',
    title: 'Notifications',
    body: 'The bell in your studio is the only channel in v1. Sign-in and reset codes still arrive by email.',
  },
  {
    icon: Users,
    tint: 'lavender',
    title: 'Team access',
    body: 'Only you can open this studio in v1.',
  },
  { icon: KeyRound, tint: 'aqua', title: 'API keys', body: 'Not available yet.' },
];

function InfoCard({
  icon: Icon,
  tint,
  title,
  children,
}: {
  icon: LucideIcon;
  tint: CardTint;
  title: string;
  children: React.ReactNode;
}) {
  const style = TINT_STYLES[tint];
  return (
    <section className="col-span-12 flex items-start gap-4 glass rounded-panel p-6 @3xl:col-span-6">
      <span className={cn('grid size-14 shrink-0 place-items-center rounded-md', style.tile)}>
        <Icon aria-hidden="true" strokeWidth={1.5} className={cn('size-6', style.icon)} />
      </span>
      <div className="flex min-w-0 flex-col items-start gap-1">
        <h2 className="text-h2 text-ink">{title}</h2>
        {children}
      </div>
    </section>
  );
}

/** Settings, Account tab: what v1 does and does not do, plus Sign out. */
export function AccountCards() {
  return (
    <div className="grid grid-cols-12 gap-5">
      {CARDS.map((card) => (
        <InfoCard key={card.title} icon={card.icon} tint={card.tint} title={card.title}>
          <p className="text-body text-ink">{card.body}</p>
        </InfoCard>
      ))}
      <InfoCard icon={LogOut} tint="white" title="Sign out">
        <p className="text-body text-ink">Signs you out of Fellow Owners on this device.</p>
        <Link
          href={SIGN_OUT_HREF}
          className={cn(buttonVariants({ variant: 'secondary', surface: 'card' }), 'mt-3')}
        >
          Sign out
        </Link>
      </InfoCard>
    </div>
  );
}
