import { Link2, ListChecks, type LucideIcon, Megaphone, Mic, Users } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PageFrame } from '@/components/marketing/page-frame';
import { type CardTint, TINT_STYLES } from '@/components/shared/tint';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { DISPLAY_H1 } from '@/lib/constants';
import { routes } from '@/lib/routes';

// From PRODUCT.md and docs/01-prd.md, told through the demo creator Mira Lane: who it is for, why, how it
// works, and the principles we hold to.
export const metadata: Metadata = {
  title: 'About',
  description:
    'Fellow Owners is one link in a creator’s bio that gathers followers into communities, ideas and crews, with an AI that sorts the best of the DMs and always says why.',
  alternates: { canonical: '/about' },
};

interface Card {
  title: string;
  body: string;
  tint: CardTint;
  icon: LucideIcon;
}

const AUDIENCES: readonly (Card & { points: readonly string[] })[] = [
  {
    title: 'Creators',
    tint: 'peach',
    icon: Mic,
    body: 'Vloggers and storytellers with 100K to 2M followers across YouTube, Instagram and TikTok, working solo or with one manager.',
    points: [
      'See who is actually in your audience',
      'Find the few ideas and people that matter in your DMs',
      'Give your fans something to do besides like and comment',
    ],
  },
  {
    title: 'Fans',
    tint: 'aqua',
    icon: Users,
    body: 'People who follow a creator, have a skill or an idea, and have often tried a DM already.',
    points: [
      'Be seen for what you can do, from a local guide’s tips to an editor’s eye',
      'Find other fans who share your interests',
      'Get your work in front of the creator through a path that counts',
    ],
  },
];

const STEPS: readonly Card[] = [
  {
    title: 'Share one link',
    tint: 'peach',
    icon: Link2,
    body: 'The creator puts one link in their bio. It opens on communities with fan counts and a Join button, not a list of links.',
  },
  {
    title: 'Fans join by interest',
    tint: 'lavender',
    icon: Users,
    body: 'A fan writes one line about themselves and joins Budget Travel, Food Finds, Solo Travelers or whatever fits, in under a minute.',
  },
  {
    title: 'Ideas arrive sorted',
    tint: 'aqua',
    icon: ListChecks,
    body: 'Posts, crews and short structured ideas replace the DM pile. The AI summarizes each one and rates the match, always with its reason.',
  },
  {
    title: 'Give it your spotlight',
    tint: 'white',
    icon: Megaphone,
    body: 'When something is ready, the creator features it with drafts in their own voice, a public page, credits for everyone who helped and a link that shows how it landed.',
  },
];

const PRINCIPLES: readonly { title: string; body: string }[] = [
  {
    title: 'Minutes, not hours',
    body: 'Every creator screen opens on what deserves a decision now. Full lists come second.',
  },
  {
    title: 'Every judgment shows its reason',
    body: 'A match never appears without its one-line why. The AI advises, the creator decides, and can always disagree.',
  },
  {
    title: 'Built for the in-app browser',
    body: 'Fans arrive inside Instagram, TikTok and YouTube on a phone. Joining, posting and sharing an idea work there end to end.',
  },
  {
    title: 'Fans are seen, never scored',
    body: 'Ratings live only on the creator’s side. Fans never see each other’s ratings or emails.',
  },
  {
    title: 'Earned familiarity',
    body: 'Tabs, lists and side panels behave the way the best apps taught you. Trust comes from consistency.',
  },
];

function Tile({ tint, icon: Icon }: { tint: CardTint; icon: LucideIcon }) {
  const style = TINT_STYLES[tint];
  return (
    <span className={cn('grid size-14 shrink-0 place-items-center rounded-md', style.tile)}>
      <Icon aria-hidden className={cn('size-6 stroke-[1.5]', style.icon)} />
    </span>
  );
}

export default function Page() {
  return (
    <PageFrame wide>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-[68ch]">
          <h1 className={DISPLAY_H1}>
            Followers deserve to be <em>fellow owners</em>.
          </h1>
          <p className="mt-3 text-body text-ink">
            Fellow Owners is one link in a creator&rsquo;s bio that moves an audience from followers
            to communities, ideas, collabs and a thank-you everyone can see. An AI version of the
            creator sorts the best of the DMs, and always says why.
          </p>
        </div>
        <Link
          href={routes.auth.createAccount(routes.onboarding())}
          className={cn(buttonVariants(), 'w-full sm:w-auto')}
        >
          Start your space
        </Link>
      </header>

      <section aria-labelledby="who-title" className="mt-12">
        <h2 id="who-title" className="text-h2 text-ink">
          Who it is for
        </h2>
        <ul className="mt-4 grid gap-5 md:grid-cols-2">
          {AUDIENCES.map((audience) => (
            <li
              key={audience.title}
              className={cn('min-w-0 rounded-3xl p-6', TINT_STYLES[audience.tint].card)}
            >
              <div className="flex items-center gap-4">
                <Tile tint={audience.tint} icon={audience.icon} />
                <h3 className="text-h1 text-ink">{audience.title}</h3>
              </div>
              <p className="mt-5 text-body text-ink">{audience.body}</p>
              <ul className="mt-4 flex flex-col gap-2 text-body text-ink">
                {audience.points.map((point) => (
                  <li key={point} className="flex gap-3">
                    <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-ink" />
                    {point}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="why-title" className="mt-12 max-w-[68ch]">
        <h2 id="why-title" className="text-h2 text-ink">
          Why fellow owners, not followers
        </h2>
        <p className="mt-3 text-body text-ink">
          A creator with a million followers gets thousands of messages a week. Brand offers, local
          tips and talented people sit in the same pile as spam and fan mail, so most of them go
          unread. The audience has real skills, from local guides and photographers to video editors
          and translators, but no structure to find each other or make anything together.
        </p>
        <p className="mt-3 text-body text-ink">
          The usual fixes fall short. Paid DMs sort fans by who can pay, not by the quality of the
          idea. Group chats get loud faster than anyone can read them. Link-in-bio pages and forms
          go one way, with no community and no way to tell the good from the loud. We think the
          people who show up with something to offer should be treated as owners of what gets made,
          not as a follower count.
        </p>
      </section>

      <section aria-labelledby="how-title" className="mt-12">
        <h2 id="how-title" className="text-h2 text-ink">
          How it works, in four steps
        </h2>
        <ol className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className={cn('flex min-w-0 flex-col rounded-3xl p-6', TINT_STYLES[step.tint].card)}
            >
              <div className="flex items-center justify-between gap-4">
                <Tile tint={step.tint} icon={step.icon} />
                <span className="text-small-strong text-ink-soft">Step {index + 1}</span>
              </div>
              <h3 className="mt-5 text-h2 text-ink">{step.title}</h3>
              <p className="mt-2 text-body text-ink">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        aria-labelledby="principles-title"
        className="mt-12 rounded-3xl border border-white/70 bg-white/60 p-6"
      >
        <h2 id="principles-title" className="text-h2 text-ink">
          What we hold to
        </h2>
        <dl className="mt-2 grid gap-x-10 md:grid-cols-2">
          {PRINCIPLES.map((principle) => (
            <div key={principle.title} className="border-b border-ink/10 py-4">
              <dt className="text-label-strong text-ink">{principle.title}</dt>
              <dd className="mt-1 max-w-[60ch] text-body text-ink-soft">{principle.body}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-body text-ink">
          Questions, or a creator you think we should talk to?{' '}
          <Link
            href={routes.marketing.contact()}
            className="font-medium underline decoration-ink-soft underline-offset-4 hover:decoration-ink"
          >
            Get in touch
          </Link>
          .
        </p>
      </section>
    </PageFrame>
  );
}
