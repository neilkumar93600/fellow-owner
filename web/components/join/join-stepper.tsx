'use client';

import type { PublicCommunity, PublicSpace, ViewerMembership } from '@fellow-owners/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Mail, PartyPopper } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { enterDemo } from '@/api/demo';
import { SocialButtons } from '@/components/auth/social-buttons';
import { AvatarInitials } from '@/components/shared/avatar-initials';
import { buttonVariants } from '@/components/ui/button-variants';
import { cn } from '@/components/ui/cn';
import { membershipKeys, useMembership } from '@/hooks/use-membership';
import { useUrlEnum, useUrlState } from '@/hooks/use-url-state';
import { routes, withQuery } from '@/lib/routes';
import { toastError, toastSuccess } from '@/lib/toast';
import { IntroStep, listFormat } from './intro-step';
import { ProfileStep } from './profile-step';

const STEPS = ['1', '2', '3', 'done'] as const;
type Step = (typeof STEPS)[number];

/** Priya's line in the demo, so Suggest rooms has something to read. */
const DEMO_INTRO = 'Solo traveler from Austin. I want to eat my way through Lisbon on a budget.';

const TEXT_BUTTON =
  'press inline-flex h-11 items-center rounded-full px-3 text-label text-ink underline decoration-ink/40 underline-offset-4 hover:decoration-ink';

export interface JoinStepperProps {
  space: Pick<PublicSpace, 'handle' | 'displayName' | 'avatarUrl'>;
  communities: PublicCommunity[];
  /** The server's user-agent check, so the Google pill never flashes inside in-app browsers. */
  initialInApp: boolean;
  /** The server's read of the session, until the client's own membership query answers. */
  initialSignedIn: boolean;
  /** Where to land once joined (a safe path from ?returnTo=), else the first joined community. */
  returnTo: string | null;
}

/**
 * Join (/{handle}/join), DESIGN.md Join recipe: one strong-glass card with the progress dots and "Step N
 * of 3". 1 sign in, 2 intro and communities, 3 skills and links (skippable), then "Welcome in". The step
 * lives in ?step= (1, 2, 3, done) so Back works and each step is reviewable; a bio card's Join arrives
 * with ?community= preselected. On a step change focus moves to the new heading.
 */
export function JoinStepper({
  space,
  communities,
  initialInApp,
  initialSignedIn,
  returnTo,
}: JoinStepperProps) {
  const [urlStep, setStep] = useUrlEnum('step', STEPS, '1');
  const { get } = useUrlState();
  const queryClient = useQueryClient();
  const { data: viewer } = useMembership(space.handle);
  const signedIn = viewer?.signedIn ?? initialSignedIn;
  // Signed in skips step 1; signed out cannot be past it.
  const step: Step = signedIn ? (urlStep === '1' ? '2' : urlStep) : '1';
  const [demoPending, setDemoPending] = useState(false);
  const [homeSlug, setHomeSlug] = useState<string>();
  const [intro, setIntro] = useState('');
  const [selected, setSelected] = useState<string[]>(() => {
    const preset = communities.find((c) => c.slug === get('community'));
    return preset ? [preset.id] : [];
  });
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shown = useRef(step);

  useEffect(() => {
    if (shown.current === step) return;
    shown.current = step;
    headingRef.current?.focus();
  }, [step]);

  const go = (next: Step) => setStep(next, { push: true });
  const { handle } = space;
  const first = space.displayName.split(' ')[0];
  // Back from sign-in lands here with the same returnTo and preselected community.
  const joinPath = withQuery(routes.fan.join(handle), { returnTo, community: get('community') });
  const authPath = routes.auth.login(joinPath);
  const chosen = selected.flatMap((id) => communities.filter((c) => c.id === id));
  const home = communities.find((c) => c.slug === homeSlug) ?? chosen[0] ?? communities[0];

  async function tryDemo() {
    if (demoPending) return;
    setDemoPending(true);
    try {
      await enterDemo('fan');
      queryClient.setQueryData<ViewerMembership>(membershipKeys.detail(handle), {
        signedIn: true,
        isOwner: false,
        membership: null,
      });
      void queryClient.invalidateQueries({ queryKey: membershipKeys.detail(handle) });
      setIntro(DEMO_INTRO);
      toastSuccess('You’re in as Priya, the demo fan');
      go('2');
    } catch (error) {
      toastError(error, { retry: tryDemo, fallback: 'The demo is resting right now. Try again.' });
    } finally {
      setDemoPending(false);
    }
  }

  const copy: Record<Step, { title: string; body: string }> = {
    '1': {
      title: `Join ${first}’s space`,
      body: 'Sign in, say hello and pick your rooms. It takes under a minute.',
    },
    '2': {
      title: 'Say hello',
      body: `A line about you helps ${first} and the other fans know who just walked in.`,
    },
    '3': {
      title: 'Add your skills and links',
      body: 'So people can find you when a fan project needs a hand. You can skip this.',
    },
    done: {
      title: 'Welcome in',
      body: `You’re in ${chosen.length > 0 ? listFormat.format(chosen.map((c) => c.name)) : `${first}’s space`}. Say hello, or share the trip idea you’ve been sitting on.`,
    },
  };

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={routes.fan.space(handle)}
        className="press -ml-1 inline-flex h-11 items-center gap-3 self-start rounded-full pr-4 pl-1 text-label-strong text-ink hover:bg-white/60"
      >
        <AvatarInitials name={space.displayName} image={space.avatarUrl} size={40} />
        {space.displayName}
      </Link>

      <div className="flex flex-col gap-6 glass-strong p-6 sm:p-8">
        {step === 'done' ? (
          <span className="grid size-14 place-items-center rounded-md bg-aurora-lilac">
            <PartyPopper aria-hidden="true" strokeWidth={1.5} className="size-6 text-[#5b47a8]" />
          </span>
        ) : (
          <Progress step={Number(step)} />
        )}
        <div className="flex flex-col gap-2">
          <h1 ref={headingRef} tabIndex={-1} className="text-h1 text-ink outline-none">
            {copy[step].title}
          </h1>
          <p className="max-w-[60ch] text-body text-ink-soft">{copy[step].body}</p>
        </div>

        {step === '1' ? (
          <div className="flex flex-col gap-4">
            <SocialButtons page="/login" returnTo={joinPath} initialInApp={initialInApp} />
            <p className="flex items-center gap-3 text-small text-ink-soft before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
              or
            </p>
            <Link href={authPath} className={cn(buttonVariants(), 'w-full')}>
              <Mail aria-hidden="true" className="size-5" />
              Continue with email
            </Link>
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                disabled={demoPending}
                className={TEXT_BUTTON}
                onClick={tryDemo}
              >
                Try the demo as Priya
              </button>
            </div>
          </div>
        ) : step === '2' ? (
          <IntroStep
            communities={communities}
            intro={intro}
            onIntroChange={setIntro}
            selected={selected}
            onSelectedChange={setSelected}
            handle={handle}
            onJoined={({ firstCommunitySlug, alreadyMember }) => {
              setHomeSlug(firstCommunitySlug);
              go(alreadyMember ? 'done' : '3');
            }}
          />
        ) : step === '3' ? (
          <ProfileStep handle={handle} onDone={() => go('done')} />
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href={
                returnTo ??
                (home ? routes.fan.community(handle, home.slug) : routes.fan.space(handle))
              }
              className={cn(buttonVariants(), 'w-full sm:w-auto')}
            >
              {returnTo || !home ? 'Continue' : `Go to ${home.name}`}
            </Link>
            <Link
              href={routes.fan.space(handle)}
              className={cn(buttonVariants({ variant: 'secondary' }), 'w-full sm:w-auto')}
            >
              Back to {first}’s page
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The progress dots: the current step a 24 by 8 ink pill, done steps 8px ink dots, upcoming ones 8px
 * Field Grey (3.3:1). The dot group is labelled with the visible words, which screen readers then skip.
 */
function Progress({ step }: { step: number }) {
  const label = `Step ${step} of 3`;
  return (
    <div className="flex items-center gap-3">
      <span role="img" aria-label={label} className="flex items-center gap-1.5">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={cn(
              'h-2 rounded-full',
              n === step ? 'w-6 bg-ink' : n < step ? 'w-2 bg-ink' : 'w-2 bg-ink/30',
            )}
          />
        ))}
      </span>
      <span aria-hidden="true" className="text-small text-ink-soft">
        {label}
      </span>
    </div>
  );
}
