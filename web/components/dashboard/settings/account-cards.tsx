import { KeyRound, LogOut, type LucideIcon, Users } from 'lucide-react';
import Link from 'next/link';
import { AccountCard } from '@/components/account/account-card';
import { AccountSettings } from '@/components/account/account-settings';
import { SIGN_OUT_HREF } from '@/components/layout/dashboard-nav';
import type { CardTint } from '@/components/shared/tint';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';

// Honest v1 facts, no controls that do nothing.
const CARDS: { icon: LucideIcon; tint: CardTint; title: string; body: string }[] = [
  {
    icon: Users,
    tint: 'lavender',
    title: 'Team access',
    body: 'Only you can open this studio in v1.',
  },
  { icon: KeyRound, tint: 'aqua', title: 'API keys', body: 'Not available yet.' },
];

/** Settings, Account tab: password, devices, emails, data and deletion, v1 facts, Sign out. */
export function AccountCards() {
  return (
    <div className="grid grid-cols-12 gap-5">
      <AccountSettings ownsSpace />
      {CARDS.map((card) => (
        <AccountCard key={card.title} icon={card.icon} tint={card.tint} title={card.title}>
          <p className="text-body text-ink">{card.body}</p>
        </AccountCard>
      ))}
      <AccountCard icon={LogOut} tint="white" title="Sign out">
        <p className="text-body text-ink">Signs you out of Fellow Owners on this device.</p>
        <Link
          href={SIGN_OUT_HREF}
          className={cn(buttonVariants({ variant: 'secondary', surface: 'card' }), 'mt-3')}
        >
          Sign out
        </Link>
      </AccountCard>
    </div>
  );
}
