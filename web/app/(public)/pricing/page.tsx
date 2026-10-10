import { Building2, Check, ChevronDown, type LucideIcon, Sprout, UserRound } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageFrame } from '@/components/marketing/page-frame';
import { StatusPill } from '@/components/shared/status-pill';
import { type CardTint, TINT_STYLES } from '@/components/shared/tint';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { DISPLAY_H1 } from '@/lib/constants';
import { CONTACT } from '@/lib/legal';
import { routes } from '@/lib/routes';

/*
 * Pricing (F29, P2). The pilot is free, and /terms §10 and /refunds §4 are binding about it: no card, no
 * commission, opt-in only if paid plans ever land. So the page shows the one plan that exists and names the
 * value metric of the next one instead of inventing numbers. Fans never pay; that is the positioning, not
 * a footnote. One coral button: Start your space, on the plan that is open.
 */

export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Fellow Owners is free while we pilot: no card, no commission on what your fans make, and fans never pay. What a paid creator plan will be priced on when it arrives.',
  alternates: { canonical: '/pricing' },
};

const START_HREF = routes.auth.createAccount(routes.onboarding());
const mailto = (subject: string) =>
  `mailto:${CONTACT.support}?subject=${encodeURIComponent(subject)}`;

interface Plan {
  name: string;
  tint: CardTint;
  icon: LucideIcon;
  price: string;
  unit: string;
  open?: boolean;
  lead: string;
  features: readonly string[];
  action: { label: string; href: string };
}

const PLANS: readonly Plan[] = [
  {
    name: 'Pilot',
    tint: 'peach',
    icon: Sprout,
    price: 'Free',
    unit: 'The whole product, while the pilot runs',
    open: true,
    lead: 'Every creator feature, with no card and no commission on anything your fans make.',
    features: [
      'One bio link, as many interest communities as you want',
      'AI picks with a one-line reason on every idea and message',
      'Short structured ideas instead of a flooded DM pile',
      'Spotlight drafts in your voice, with a link that shows how it landed',
      'A public page for what your fans make, with credits for everyone who helped',
      'Export or delete everything, whenever you like',
    ],
    action: { label: 'Start your space', href: START_HREF },
  },
  {
    name: 'Creator',
    tint: 'lavender',
    icon: UserRound,
    price: 'Not set yet',
    unit: 'Per creator, per month. Never per fan.',
    lead: 'We are setting this with the pilot creators, from what the product actually saves them. No number until they have told us.',
    features: [
      'Everything in the pilot',
      'Priced on creator seats, so a growing audience never costs you more',
      'Free accounts never move onto it without an explicit opt-in',
      'Cancel in as many clicks as it took to start',
    ],
    action: {
      label: 'Tell us what you would pay',
      href: mailto('What I would pay for Fellow Owners'),
    },
  },
  {
    name: 'Studio',
    tint: 'aqua',
    icon: Building2,
    price: 'Talk to us',
    unit: 'For a manager running several creators',
    lead: 'One place for a roster: shared fan mail, roles per creator, and help moving an audience in.',
    features: [
      'Several creator spaces under one manager',
      'Roles and shared fan mail across the roster',
      'Hands-on onboarding and audience import',
      'Invoicing that suits your finance team',
    ],
    action: { label: 'Talk to us', href: mailto('Studio plan for several creators') },
  },
];

/** The commitments from /refunds §4 and /terms §10, in plain words. */
const PROMISES: readonly { title: string; body: string }[] = [
  {
    title: 'Fans never pay',
    body: 'Fans join, post and send ideas for free, for good. We will not sort an audience by who can afford to be heard.',
  },
  {
    title: 'No cut of your collabs',
    body: 'Whatever you agree with one of your fans, from a brand deal to a paid edit, is yours. We take no commission and never sit in the middle of it.',
  },
  {
    title: 'Opt in, or nothing changes',
    body: 'If a paid plan lands, no free account moves onto it until you say yes. No trial that quietly starts charging.',
  },
  {
    title: 'Fourteen days to change your mind',
    body: 'Any future purchase is refundable in full within fourteen days, worldwide, and cancelling happens inside the product.',
  },
];

const FAQS: readonly { q: string; a: string }[] = [
  {
    q: 'Is it really free right now?',
    a: 'Yes. There is no card on file, no trial clock, and no feature held back for a paid tier. The terms say it in writing: free during this release, with no hidden paywalls and no commission on agreements you make with your fans.',
  },
  {
    q: 'What happens when the pilot ends?',
    a: 'A paid creator plan is likely, priced per creator. You will hear the price and the date from us first, and your account stays free until you opt in. Nothing applies retroactively to what you did during the pilot.',
  },
  {
    q: 'Why is there no price on the Creator plan?',
    a: 'Because we do not know it yet, and an invented number would be worse than an empty one. We are working it out with the pilot creators, from the hours the product saves them each week. If you have a figure in mind, tell us.',
  },
  {
    q: 'Will my fans ever be charged to reach me?',
    a: 'No. Paid DMs filter an audience by willingness to pay instead of by the quality of the idea, which is the opposite of what this product is for. The fan side stays free.',
  },
];

const FAQ_JSON_LD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a },
  })),
}).replace(/</g, '\\u003c');

function PlanCard({ plan }: { plan: Plan }) {
  const tint = TINT_STYLES[plan.tint];
  const Icon = plan.icon;
  return (
    <li className={cn('flex min-w-0 flex-col rounded-3xl p-6', tint.card)}>
      <div className="flex items-center gap-4">
        <span className={cn('grid size-14 shrink-0 place-items-center rounded-md', tint.tile)}>
          <Icon aria-hidden className={cn('size-6 stroke-[1.5]', tint.icon)} />
        </span>
        <h2 className="text-h2 text-ink">{plan.name}</h2>
        {plan.open ? (
          <StatusPill status="open_now" label="Open now" tone="cool" className="ml-auto" />
        ) : null}
      </div>

      <p className="mt-6 text-display text-ink">{plan.price}</p>
      <p className="mt-1 text-body text-ink-soft">{plan.unit}</p>
      <p className="mt-4 text-body text-ink">{plan.lead}</p>

      <ul className="mt-6 flex flex-1 flex-col gap-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-3 text-body text-ink">
            <Check aria-hidden className="mt-0.5 size-4 shrink-0 stroke-[1.5]" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {plan.open ? (
        <Link href={plan.action.href} className={cn(buttonVariants(), 'mt-8 w-full')}>
          {plan.action.label}
        </Link>
      ) : (
        <a
          href={plan.action.href}
          className={cn(buttonVariants({ variant: 'secondary', surface: 'card' }), 'mt-8 w-full')}
        >
          {plan.action.label}
        </a>
      )}
    </li>
  );
}

export default function Page() {
  return (
    <PageFrame wide>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: static FAQ copy from this file, with < escaped.
        dangerouslySetInnerHTML={{ __html: FAQ_JSON_LD }}
      />

      <header className="max-w-[68ch]">
        <h1 className={DISPLAY_H1}>
          Free while we <em>pilot</em>.
        </h1>
        <p className="mt-3 text-body text-ink">
          One plan exists today and it costs nothing. When a paid one arrives it will be priced per
          creator, you will opt in, and your fans will still pay nothing.
        </p>
      </header>

      <ul aria-label="Plans" className="mt-8 grid gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard key={plan.name} plan={plan} />
        ))}
      </ul>

      <div className="mt-5 grid gap-5 lg:grid-cols-12 lg:items-start">
        <section
          aria-labelledby="promises-title"
          className="rounded-3xl border border-white/70 bg-white/60 p-6 lg:col-span-5"
        >
          <h2 id="promises-title" className="text-h2 text-ink">
            What we commit to
          </h2>
          <p className="mt-1 text-body text-ink-soft">
            Each one is a clause in the{' '}
            <Link href={routes.legal.terms()} className="text-ink underline underline-offset-4">
              terms
            </Link>{' '}
            or the{' '}
            <Link href={routes.legal.refunds()} className="text-ink underline underline-offset-4">
              refund policy
            </Link>
            .
          </p>
          <dl className="mt-2">
            {PROMISES.map((promise) => (
              <div key={promise.title} className="border-b border-ink/10 py-4 last:border-b-0">
                <dt className="text-label-strong text-ink">{promise.title}</dt>
                <dd className="mt-1 text-body text-ink-soft">{promise.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          aria-labelledby="faq-title"
          className="rounded-3xl border border-white/70 bg-white/60 p-6 lg:col-span-7"
        >
          <h2 id="faq-title" className="text-h2 text-ink">
            The money questions
          </h2>
          <div className="mt-2">
            {FAQS.map((item) => (
              <details
                key={item.q}
                name="pricing-faq"
                className="group border-b border-ink/10 last:border-b-0"
              >
                <summary className="press -mx-3 flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-3 py-3 text-label text-ink hover:bg-white/70 [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown
                    aria-hidden
                    className="size-5 shrink-0 stroke-[1.5] transition-transform duration-200 ease-out-quart group-open:rotate-180 motion-reduce:transition-none"
                  />
                </summary>
                <p className="max-w-[68ch] pb-4 text-body text-ink-soft">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </PageFrame>
  );
}
